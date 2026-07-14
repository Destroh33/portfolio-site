import { atom } from 'nanostores'
import * as THREE from 'three'
import { FLAGSHIPS } from '../data/projects'
import { setFlybyTriggers } from './flybySequence'

export interface Waypoint {
  id: string
  t: number // 0-1 fraction along total document scroll (labelled stops only)
  u: number // 0-1 arc-length position of this stop along the path curve
  position: [number, number, number]
}

export interface PlanetFrame {
  id: string
  position: [number, number, number] // planet position (path point + lateral offset)
  blurbPosition: [number, number, number] // world-space anchor for the Html blurb
  blurbRotation: [number, number, number] // euler so the blurb faces the flyby camera
  camPosition: [number, number, number] // cinematic flyby camera position
  camLookAt: [number, number, number] // cinematic flyby camera look-target
}

// Camera path order follows the user's hand-drawn floorplan (top-down):
//   Start(asteroid) -> BP -> PW -> [nebula] -> MotoMania -> Lab -> AI ->
//   [asteroid field] -> back toward Start (a closed-ish loop).
// hero == the Start asteroid; about is a short beat right after launch; the
// five flagships are placed at their drawn map spots; belt == the asteroid
// field near the end; contact == the return leg.
const PATH_IDS = ['hero', 'about', ...FLAGSHIPS.map((p) => p.id), 'belt', 'contact', 'credits']
const FLAGSHIP_IDS = new Set(FLAGSHIPS.map((p) => p.id))

// Global scale multiplier — bumps the whole world up so the flight feels vast.
export const WORLD_SCALE = 10

// Hand-authored world positions transcribed from the floorplan (pre-scale).
// Reading the drawing as X = right, Z = "down the page" (depth). Y is bold
// altitude (dips/climbs) so the flight isn't flat. All multiplied by
// WORLD_SCALE below. Extra 't*' waypoints are pure travel/shape control points.
const PATH_POINTS_RAW: Record<string, [number, number, number]> = {
  hero: [-560, 0, 620], // Start asteroid, bottom-left
  about: [-620, 90, 320], // short climb right after launch
  't-ai-arc': [-640, 140, -420], // sweeps up the far left toward the top
  'ai-guide': [-520, 120, -560], // AI, top-left
  'broken-peaces': [-40, -60, -260], // BP, upper-center, a dip
  'prime-weaver': [120, -200, 560], // PW, bottom-center, deep drop
  't-nebula': [640, -120, 640], // swoop out bottom-right THROUGH the nebula
  'vr-lab': [820, 220, -420], // Lab (now 3rd stop), top-right
  't-lab-spiral': [560, 60, -120], // curl inward toward the next stop
  motomania: [700, -20, -180], // MotoMania (now 4th stop), center-right
  belt: [980, 40, 120], // asteroid field, right side on the return leg
  contact: [900, 180, 560], // return leg sweeping back down/around
  credits: [350, 120, 720], // outro station on the way back to Start (hero)
}

export const PATH_POINTS: Record<string, [number, number, number]> = Object.fromEntries(
  Object.entries(PATH_POINTS_RAW).map(([k, v]) => [k, [v[0] * WORLD_SCALE, v[1] * WORLD_SCALE, v[2] * WORLD_SCALE]]),
) as Record<string, [number, number, number]>

// Actual traversal order along the path (distinct from the DOM section order in
// PATH_IDS). This is the floorplan loop; travel-only control points interleave
// between the labelled stops to shape the curves.
const PATH_ORDER = [
  'hero',
  'about',
  'broken-peaces',
  'prime-weaver',
  't-nebula',
  'vr-lab',
  't-lab-spiral',
  'motomania',
  'ai-guide',
  't-ai-arc',
  'belt',
  'contact',
  'credits', // outro station on the return leg, before looping back to hero
]
// Planets are big and set well off to the side of the flight path, so the
// side-on flyby shot is a genuine ~90° turn away from the flight direction.
export const PLANET_RADIUS = 34 * WORLD_SCALE
// Planets sit FAR off the flight path so the flyby camera has to physically
// travel a long way from its on-path chase position across to the planet —
// that long translation is what makes the fly-in read as a slow, cinematic
// glide rather than a rotate-in-place.
const PLANET_LATERAL_OFFSET = 340 * WORLD_SCALE
// Flyby framing is built entirely from the flyby CAMERA's own orientation
// (its right/up axes) so the planet, blurb, and blurb-facing all agree — this
// keeps the blurb square to the camera (no tilt) and the spacing consistent.
// The camera sits INBOARD of the planet (toward the flight path) and looks
// OUTWARD at the planet's near face — the same side the ship sees flying past.
// STANDOFF < LATERAL_OFFSET keeps the flyby camera on the path side of the
// planet (a long way from it), so the fly-in is a big sweeping move.
const FLYBY_CAM_STANDOFF = 200 * WORLD_SCALE // how far inboard of the planet the camera stops
// Planet on the LEFT of frame, blurb on the RIGHT. Offsets are along the
// camera's screen-right axis. The pair is centered as a group: the geometric
// center below is placed at frame center, and these two push the planet and
// blurb symmetrically apart from it (with a clear gap, no overlap).
const PLANET_SCREEN_OFFSET = 55 * WORLD_SCALE // planet center, left of frame center
const BLURB_SCREEN_OFFSET = 60 * WORLD_SCALE // blurb center, right of frame center

// Asteroid field (belt) framing: the field spans ~this radius; the camera
// stands back far enough to fit it all so every asteroid + blurb is readable.
// The field sits LATERALLY OFF the flight path (same treatment as planets) so
// the ship never flies through the rocks and the chase→belt camera transition
// (a lerp between two points near the path) can't cross the field either.
export const BELT_FIELD_RADIUS = 95 * WORLD_SCALE // tighter row so the camera can sit closer
const BELT_LATERAL_OFFSET = 340 * WORLD_SCALE
const BELT_CAM_STANDOFF = 360 * WORLD_SCALE // much closer in — asteroids + labels readable

export const waypointsAtom = atom<Waypoint[]>([])
export const pathCurveAtom = atom<THREE.CatmullRomCurve3 | null>(null)
export const planetFramesAtom = atom<PlanetFrame[]>([])

function anchorSelector(id: string): string {
  return FLAGSHIP_IDS.has(id) ? `[data-planet-slot="${id}"]` : `#${id}`
}

function measureT(id: string, totalScroll: number): number | null {
  const el = document.querySelector(anchorSelector(id))
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const absoluteCenter = rect.top + window.scrollY + rect.height / 2
  return totalScroll > 0 ? absoluteCenter / totalScroll : 0
}

// Maps a scrollProgress fraction (0-1 over the whole document) to a curve
// parameter u (0-1 arc-length along the path). Labelled stops carry both a
// measured scroll t and a fixed curve u; between two stops we interpolate u
// linearly in scroll — so the travel/control points that lie between them are
// swept through automatically as the user scrolls from one stop to the next.
export function scrollTToCurveU(waypoints: Waypoint[], t: number): number {
  if (waypoints.length < 2) return 0
  if (t <= waypoints[0].t) return waypoints[0].u
  const last = waypoints[waypoints.length - 1]
  // Past the final labelled stop (contact), fly the closed curve's RETURN LEG
  // from contact.u around to u=1.0 (which equals hero/Start at u=0) — so the
  // journey visibly loops back to the beginning before the scroll wraps.
  if (t >= last.t) {
    const local = last.t < 1 ? (t - last.t) / (1 - last.t) : 0
    return last.u + (1 - last.u) * local
  }
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    if (t >= a.t && t <= b.t) {
      const local = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0
      return a.u + (b.u - a.u) * local
    }
  }
  return last.u
}

function computePlanetFrames(waypoints: Waypoint[], curve: THREE.CatmullRomCurve3): PlanetFrame[] {
  const worldUp = new THREE.Vector3(0, 1, 0)
  const frames: PlanetFrame[] = []

  FLAGSHIPS.forEach((project, i) => {
    const wp = waypoints.find((w) => w.id === project.id)
    if (!wp) return
    const u = wp.u
    const pathPoint = curve.getPoint(u)
    const tangent = curve.getTangent(u).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()

    // "frameRight" always points from the path toward this planet's side.
    // Everything (planet, blurb, camera framing) is built in this per-planet
    // {tangent, frameRight, up} basis so the shot is uniform across all five
    // regardless of which side (left/right) the planet alternates onto.
    const side = i % 2 === 0 ? -1 : 1
    const frameRight = right.clone().multiplyScalar(side)

    // Camera sits INBOARD of the planet (path side) and looks OUTWARD at it,
    // so we view the planet's near face — the side the ship sees flying past.
    const camPos = pathPoint
      .clone()
      .add(frameRight.clone().multiplyScalar(PLANET_LATERAL_OFFSET - FLYBY_CAM_STANDOFF))
    const camLookAt = pathPoint.clone().add(frameRight.clone().multiplyScalar(PLANET_LATERAL_OFFSET))

    const camMatrix = new THREE.Matrix4().lookAt(camPos, camLookAt, worldUp)
    const camQuat = new THREE.Quaternion().setFromRotationMatrix(camMatrix)
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat)

    // Center the planet+blurb PAIR as a group: the midpoint between the
    // planet's far-left edge and the blurb's far-right edge should land at
    // frame center. Both are offset from a shared "group center" along the
    // camera's screen-right axis, and that group center is nudged so the outer
    // edges balance around the camera's look point.
    // On phone-width viewports the horizontal field of view is narrow, so the
    // same world-space blurb offset projects much further toward the screen
    // edge and runs off it. Pull the blurb inward (toward frame center) there.
    // Its half-width also shrinks, since the stacked card is narrower (340px vs
    // 640px — see .flyby-blurb.is-stacked). Recomputes on resize via
    // measureLayout()'s resize listener.
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 640
    const blurbOffset = narrow ? 20 * WORLD_SCALE : BLURB_SCREEN_OFFSET
    const BLURB_HALF_WIDTH = (narrow ? 33 : 62) * WORLD_SCALE // approx half the blurb's world width
    const planetFar = -PLANET_SCREEN_OFFSET - PLANET_RADIUS
    const blurbFar = blurbOffset + BLURB_HALF_WIDTH
    const groupShift = -(planetFar + blurbFar) / 2 // move so the two far edges straddle center

    const planetPos = camLookAt
      .clone()
      .add(camRight.clone().multiplyScalar(-PLANET_SCREEN_OFFSET + groupShift))
    const blurbPos = camLookAt
      .clone()
      .add(camRight.clone().multiplyScalar(blurbOffset + groupShift))

    // Blurb faces the camera exactly: reuse the camera's own orientation (its
    // +Z points back toward the camera), so the panel is perfectly square.
    const blurbEuler = new THREE.Euler().setFromQuaternion(camQuat)

    frames.push({
      id: project.id,
      position: planetPos.toArray() as [number, number, number],
      blurbPosition: blurbPos.toArray() as [number, number, number],
      blurbRotation: [blurbEuler.x, blurbEuler.y, blurbEuler.z],
      camPosition: camPos.toArray() as [number, number, number],
      camLookAt: camLookAt.toArray() as [number, number, number],
    })
  })

  // Belt (asteroid field) gets its own frame too — treated like a stop. The
  // FIELD sits laterally off the path (same as planets, opposite side of the
  // last flagship) so the ship never flies through the rocks; the camera stays
  // near the path and pulls back to fit the whole field, and its transition
  // lerp (chase pose ↔ this pose, both near the path) can't cross the field.
  const beltWp = waypoints.find((w) => w.id === 'belt')
  if (beltWp) {
    const pathPoint = curve.getPoint(beltWp.u)
    const tangent = curve.getTangent(beltWp.u).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()
    const frameRight = right.clone() // flagships end on side -1; belt takes +1
    const fieldCenter = pathPoint.clone().add(frameRight.clone().multiplyScalar(BELT_LATERAL_OFFSET))
    // Aim a bit above the field center: the row staggers vertically and each
    // asteroid's blurb floats above it, so the composition's centre sits high.
    const camLookAt = fieldCenter.clone().add(worldUp.clone().multiplyScalar(28 * WORLD_SCALE))
    const camPos = fieldCenter
      .clone()
      .add(frameRight.clone().multiplyScalar(-BELT_CAM_STANDOFF))
      .add(worldUp.clone().multiplyScalar(28 * WORLD_SCALE))
    frames.push({
      id: 'belt',
      position: fieldCenter.toArray() as [number, number, number],
      blurbPosition: fieldCenter.toArray() as [number, number, number],
      blurbRotation: [0, 0, 0],
      camPosition: camPos.toArray() as [number, number, number],
      camLookAt: camLookAt.toArray() as [number, number, number],
    })
  }

  return frames
}

// Build the full path curve from PATH_ORDER (labelled stops + travel/control
// points) and return, for each PATH_ORDER point, its arc-length u along the
// curve — so labelled stops know their true u even though travel points sit
// between them. The curve is closed so the journey loops back toward Start.
function buildCurve(): { curve: THREE.CatmullRomCurve3; uByIndex: number[] } {
  const points = PATH_ORDER.map((id) => new THREE.Vector3(...PATH_POINTS[id]))
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)

  // Approximate arc-length u for each control point by sampling the curve and
  // finding the nearest sample to each point.
  const SAMPLES = 2000
  const samples: THREE.Vector3[] = []
  for (let s = 0; s <= SAMPLES; s++) samples.push(curve.getPoint(s / SAMPLES))

  const uByIndex = points.map((p) => {
    let best = 0
    let bestDist = Infinity
    for (let s = 0; s <= SAMPLES; s++) {
      const d = samples[s].distanceToSquared(p)
      if (d < bestDist) {
        bestDist = d
        best = s
      }
    }
    return best / SAMPLES
  })

  return { curve, uByIndex }
}

export function measureLayout() {
  const totalScroll = document.documentElement.scrollHeight - window.innerHeight
  const { curve, uByIndex } = buildCurve()
  const uById: Record<string, number> = {}
  PATH_ORDER.forEach((id, i) => (uById[id] = uByIndex[i]))

  // Waypoints are the DOM-anchored labelled stops only (in PATH_IDS order,
  // which is the scroll order). Each carries its measured scroll t and its
  // fixed curve u.
  const waypoints: Waypoint[] = []
  PATH_IDS.forEach((id) => {
    const t = measureT(id, totalScroll)
    if (t == null || uById[id] == null) return
    waypoints.push({ id, t, u: uById[id], position: PATH_POINTS[id] })
  })
  waypointsAtom.set(waypoints)
  // Flagships AND the belt trigger a framed flyby stop.
  setFlybyTriggers(
    waypoints.filter((w) => FLAGSHIP_IDS.has(w.id) || w.id === 'belt').map((w) => ({ id: w.id, t: w.t })),
  )

  pathCurveAtom.set(curve)
  planetFramesAtom.set(computePlanetFrames(waypoints, curve))
}

// The flyby TIMING (fly-in/hold/fly-out) now lives in stores/flybySequence.ts
// as a time-based state machine — this module only owns the static per-planet
// geometry (waypoints, curve, PlanetFrames) plus the scroll→curve mapping.

export function initFlybyLayout() {
  measureLayout()
  window.addEventListener(
    'resize',
    () => {
      measureLayout()
    },
    { passive: true },
  )
}
