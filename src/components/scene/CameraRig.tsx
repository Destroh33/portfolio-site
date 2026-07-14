import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { scrollProgressAtom } from '../../stores/scrollProgress'
import { waypointsAtom, pathCurveAtom, scrollTToCurveU, WORLD_SCALE } from '../../stores/flybyLayout'
import { easedFlybyBlend, activeFlybyFrame } from '../../stores/flybySequence'
import { introBlendAtom } from '../../stores/introLayout'
import { shipSpeedAtom, shipSpeedNormAtom, hoverAmountAtom, SPEED_REF } from '../../stores/shipMotion'
import { reducedMotionAtom } from '../../stores/device'

const CHASE_DISTANCE = 34 * WORLD_SCALE
const CHASE_HEIGHT = 14 * WORLD_SCALE
const LOOKAHEAD_DISTANCE = 55 * WORLD_SCALE
const WORLD_UP = new THREE.Vector3(0, 1, 0)

// Banking: how hard the ship rolls into path turns, and what fraction of that
// roll the camera inherits (subtle — full camera roll gets nauseating).
const BANK_FACTOR = 220
const MAX_BANK = 0.5 // radians, ~29°
const CAM_BANK_SHARE = 0.35

// Spring-arm smoothing (per-second remaining fraction of the gap; smaller =
// snappier). Position is damped tight — the camera stays glued close behind
// the ship — while ROTATION is damped noticeably softer, so abrupt tangent
// changes (sharp curve knots, the intro→chase handoff) ease in over ~0.3s
// instead of snapping. The ship's own turn/bank gets its own middle value.
const POS_DAMP = 0.00005 // τ ≈ 0.10s — responsive, absorbs positional kicks
const ROT_DAMP = 0.03 // τ ≈ 0.29s — cinematic rotation ease
const SHIP_ROT_DAMP = 0.008 // τ ≈ 0.21s — ship turns smoothly but leads the camera

// Thruster-craft behaviour: the ship's nose follows what its engine is doing.
// Below HOVER_FULL speed it pitches up into an idle hover (balancing on its
// thruster) and bobs; above HOVER_NONE it flies level along the path; going
// backwards it flips to fly engine-first the other way. Speeds in curve-u/s.
const HOVER_FULL = 0.0012 // |speed| below this = fully hovering
const HOVER_NONE = 0.006 // |speed| above this = fully cruising
const SPEED_SMOOTH = 0.02 // per-second remaining fraction for speed damping
const BOB_AMP = 1.2 * WORLD_SCALE // idle bob amplitude (world units)
const BOB_FREQ = 1.9 // rad/s-ish idle bob frequency

// Intro flyover: camera starts well behind+low relative to the fixed
// asteroid, then lerps forward all the way to the (by-then-well-ahead)
// chase-cam position — since U_INTRO_END guarantees the ship has traveled a
// real distance forward by blend=1, this lerp is a genuine forward pass
// through the asteroid's vicinity, not a lateral orbit. A sine-shaped height
// boost mid-transition makes it crest up and over the sphere's top instead
// of cutting straight through.
// Camera sits CLOSE to the asteroid at the start so the (radius-18) sphere
// fills most of the frame width and reads as a horizon rather than a small
// object — per the storyboard, only its top arc shows across the lower-middle.
// Planet radius is 30× (IntroPlanet/HeroSurfaceCard) — camera pulled back so
// the planet reads as a horizon band across the lower frame without dominating
// it, leaving room for the hero card to be the focal point.
// Close camera = the planet is huge and spans the full frame width (a true
// horizon); the high LOOK_UP aim pushes it down so only its top ~quarter
// rises from the bottom of the frame, leaving the sky above for the hero card.
const INTRO_BEHIND_DISTANCE = 38 * WORLD_SCALE
const INTRO_START_HEIGHT = 12 * WORLD_SCALE
const INTRO_ARC_HEIGHT_BOOST = 42 * WORLD_SCALE
const INTRO_LOOK_UP = 41 * WORLD_SCALE

interface Props {
  children?: ReactNode
}

// Render loop always runs (rotation/shaders on planets etc. keep animating);
// only the camera/ship pose here is driven by scrollProgress. Two blended
// systems: (1) intro flyover -> chase-cam handoff at the very start, (2)
// chase-cam -> cinematic flyby -> chase-cam per planet, driven by
// flybyBlendAtom (see flybyLayout.ts for why that blend is asymmetric).
export default function CameraRig({ children }: Props) {
  const shipRef = useRef<THREE.Group>(null)
  const smoothCamPos = useRef(new THREE.Vector3())
  const smoothCamQuat = useRef(new THREE.Quaternion())
  const smoothShipQuat = useRef(new THREE.Quaternion())
  const initialized = useRef(false)
  const shipInitialized = useRef(false)
  const prevU = useRef<number | null>(null)
  const smoothSpeed = useRef(0)
  const travelSign = useRef(1) // last direction of travel (+1 fwd / -1 back)
  const smoothBank = useRef(0)
  // Scratch objects reused every frame (avoid per-frame allocations).
  const scratchMat = useRef(new THREE.Matrix4())
  const scratchQuat = useRef(new THREE.Quaternion())
  const scratchUp = useRef(new THREE.Vector3())

  useFrame(({ camera, clock }, delta) => {
    const curve = pathCurveAtom.get()
    const waypoints = waypointsAtom.get()
    if (!curve || waypoints.length < 2) return
    const dt = Math.min(delta, 0.1)

    const t = scrollProgressAtom.get()
    const u = scrollTToCurveU(waypoints, t)
    const shipPos = curve.getPoint(u)
    const tangent = curve.getTangent(u).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, WORLD_UP).normalize()
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize()

    // --- ship motion state (drives thruster flame + hover behaviour) ---
    const rawSpeed = prevU.current != null && dt > 0 ? (u - prevU.current) / dt : 0
    prevU.current = u
    smoothSpeed.current += (rawSpeed - smoothSpeed.current) * (1 - Math.pow(SPEED_SMOOTH, dt))
    const speed = smoothSpeed.current
    if (Math.abs(speed) > HOVER_FULL) travelSign.current = Math.sign(speed)
    // 0 = cruising, 1 = idle hover; smoothstep between the two thresholds.
    const hoverT = THREE.MathUtils.clamp((Math.abs(speed) - HOVER_FULL) / (HOVER_NONE - HOVER_FULL), 0, 1)
    const hover = 1 - hoverT * hoverT * (3 - 2 * hoverT)
    shipSpeedAtom.set(speed)
    shipSpeedNormAtom.set(Math.min(1, Math.abs(speed) / SPEED_REF))
    hoverAmountAtom.set(hover)

    const chaseCamPos = shipPos.clone().sub(tangent.clone().multiplyScalar(CHASE_DISTANCE)).add(up.clone().multiplyScalar(CHASE_HEIGHT))
    const chaseLookAt = shipPos.clone().add(tangent.clone().multiplyScalar(LOOKAHEAD_DISTANCE))

    // --- intro flyover (blends into chaseCamPos/chaseLookAt by construction) ---
    const introBlend = introBlendAtom.get()
    let basePos = chaseCamPos
    let baseLookAt = chaseLookAt
    if (introBlend < 1) {
      const asteroidPos = curve.getPoint(0)
      const asteroidTangent = curve.getTangent(0).normalize()
      const asteroidRight = new THREE.Vector3().crossVectors(asteroidTangent, WORLD_UP).normalize()
      const asteroidUp = new THREE.Vector3().crossVectors(asteroidRight, asteroidTangent).normalize()

      const introStartPos = asteroidPos
        .clone()
        .sub(asteroidTangent.clone().multiplyScalar(INTRO_BEHIND_DISTANCE))
        .add(asteroidUp.clone().multiplyScalar(INTRO_START_HEIGHT))
      const introStartLookAt = asteroidPos.clone().add(asteroidUp.clone().multiplyScalar(INTRO_LOOK_UP))

      const arcBoost = Math.sin(Math.min(Math.max(introBlend, 0), 1) * Math.PI) * INTRO_ARC_HEIGHT_BOOST

      basePos = introStartPos
        .clone()
        .lerp(chaseCamPos, introBlend)
        .add(asteroidUp.clone().multiplyScalar(arcBoost))
      baseLookAt = introStartLookAt.clone().lerp(chaseLookAt, introBlend)
    }

    // --- cinematic flyby (time-based state machine, see flybySequence.ts) ---
    // The blend is driven by a fixed-duration animation clock, NOT scroll, so
    // the fly-in/out plays at an authored cinematic pace regardless of scroll
    // speed. Scroll only triggers it (and is locked while it plays).
    const activeFrame = activeFlybyFrame()
    const activeBlend = easedFlybyBlend()

    let desiredCamPos = basePos
    let desiredLookAt = baseLookAt
    if (activeFrame && activeBlend > 0) {
      const flyCamPos = new THREE.Vector3(...activeFrame.camPosition)
      const flyLookAt = new THREE.Vector3(...activeFrame.camLookAt)
      desiredCamPos = basePos.clone().lerp(flyCamPos, activeBlend)
      desiredLookAt = baseLookAt.clone().lerp(flyLookAt, activeBlend)

      // Cinematic drift during the held shot: a barely-perceptible slow dolly
      // sway so the framing never feels frozen. Amplitude is tiny relative to
      // the standoff distance; disabled under reduced-motion.
      if (!reducedMotionAtom.get()) {
        const dt2 = clock.getElapsedTime()
        const amp = 4 * WORLD_SCALE * activeBlend
        desiredCamPos.x += Math.sin(dt2 * 0.11) * amp
        desiredCamPos.y += Math.cos(dt2 * 0.07) * amp * 0.7
      }
    }

    // --- banking into turns (flight feel) ---
    // How sharply the path is curving sideways right now: compare the tangent
    // slightly ahead to the current one, projected on the right axis. Positive
    // = turning right -> roll into the turn. Faded out during intro & flyby.
    const tangentAhead = curve.getTangent(Math.min(u + 0.003, 1)).normalize()
    const turn = tangentAhead.clone().sub(tangent).dot(right)
    // No banking while idle-hovering (nose-up) — it's a turning behaviour.
    // Gate by introBlend² so it stays asleep through most of the intro.
    const targetBank =
      THREE.MathUtils.clamp(turn * BANK_FACTOR, -MAX_BANK, MAX_BANK) *
      introBlend * introBlend *
      (1 - activeBlend) *
      (1 - hover)
    // Damp the bank itself (τ ≈ 0.5s): without this it snaps on the instant
    // hover releases at the intro→chase handoff — on the sharply-curved start
    // of the path that read as a quick roll-right/roll-left hitch.
    smoothBank.current += (targetBank - smoothBank.current) * (1 - Math.pow(0.06, dt))
    const bank = smoothBank.current

    // --- spring-arm smoothing ---
    // Target camera orientation: look at desiredLookAt with a banked up vector.
    // (Matrix4.lookAt aims -Z at the target — the camera convention.)
    scratchUp.current.copy(WORLD_UP).applyAxisAngle(tangent, -bank * CAM_BANK_SHARE)
    scratchMat.current.lookAt(desiredCamPos, desiredLookAt, scratchUp.current)
    const targetCamQuat = scratchQuat.current.setFromRotationMatrix(scratchMat.current)

    if (!initialized.current) {
      smoothCamPos.current.copy(desiredCamPos)
      smoothCamQuat.current.copy(targetCamQuat)
      initialized.current = true
    } else {
      // Exponential damping, framerate-independent. Rotation eases softer than
      // position: the arm stays glued close to the ship, but its aim swings
      // smoothly through abrupt tangent changes instead of snapping.
      const posK = 1 - Math.pow(POS_DAMP, dt)
      const rotK = 1 - Math.pow(ROT_DAMP, dt)
      smoothCamPos.current.lerp(desiredCamPos, posK)
      smoothCamQuat.current.slerp(targetCamQuat, rotK)
    }

    camera.position.copy(smoothCamPos.current)
    camera.quaternion.copy(smoothCamQuat.current)

    // Speed FOV kick: the view widens slightly at full glide (classic speed
    // cue), easing back to base when slow or during cinematic framing.
    const cam = camera as THREE.PerspectiveCamera
    const targetFov = 60 + 9 * shipSpeedNormAtom.get() * (1 - activeBlend)
    const newFov = cam.fov + (targetFov - cam.fov) * (1 - Math.pow(0.02, dt))
    if (Math.abs(newFov - cam.fov) > 0.01) {
      cam.fov = newFov
      cam.updateProjectionMatrix()
    }

    if (shipRef.current) {
      // Thruster-craft facing: the nose blends between "along the direction of
      // travel" (flips to fly engine-first when scrolling backwards) and
      // "straight up" as speed dies off — like it's balancing on its thruster.
      // The quaternion slerp below turns all of these transitions (including
      // the 180° reverse flip) into smooth sweeps.
      const travelDir = tangent.clone().multiplyScalar(travelSign.current)
      const noseDir = travelDir.multiplyScalar(1 - hover).addScaledVector(WORLD_UP, hover)
      if (noseDir.lengthSq() < 1e-6) noseDir.copy(WORLD_UP)
      noseDir.normalize()

      // Up-hint for lookAt: banked world-up normally, but when the nose is
      // near-vertical that degenerates — use the path tangent as the hint so
      // the hovering ship keeps a stable heading.
      if (Math.abs(noseDir.dot(WORLD_UP)) > 0.9) {
        scratchUp.current.copy(tangent)
      } else {
        scratchUp.current.copy(WORLD_UP).applyAxisAngle(tangent, -bank)
      }

      // Idle bob: gentle vertical float, only while hovering.
      const bob = hover * Math.sin(clock.getElapsedTime() * BOB_FREQ) * BOB_AMP
      shipRef.current.position.copy(shipPos)
      shipRef.current.position.y += bob

      // Object3D meshes face +Z via lookAt(target, position, up) — reproduce
      // that convention for the target orientation.
      scratchMat.current.lookAt(shipPos.clone().add(noseDir), shipPos, scratchUp.current)
      const targetShipQuat = scratchQuat.current.setFromRotationMatrix(scratchMat.current)
      if (!shipInitialized.current) {
        smoothShipQuat.current.copy(targetShipQuat)
        shipInitialized.current = true
      }
      const shipK = 1 - Math.pow(SHIP_ROT_DAMP, dt)
      smoothShipQuat.current.slerp(targetShipQuat, shipK)
      shipRef.current.quaternion.copy(smoothShipQuat.current)
    }
  })

  return <group ref={shipRef}>{children}</group>
}
