import { useMemo, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { waypointsAtom, pathCurveAtom, planetFramesAtom, BELT_FIELD_RADIUS, WORLD_SCALE } from '../../stores/flybyLayout'
import { flybySequenceAtom } from '../../stores/flybySequence'
import { phoneLayoutAtom } from '../../stores/device'
import { openBeltProjectAtom } from '../../stores/beltModal'
import { BELT, type Project } from '../../data/projects'
import AsteroidModel from './AsteroidModel'

const FIELD_RADIUS = BELT_FIELD_RADIUS

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface AsteroidData {
  project: Project
  offset: [number, number, number]
  scale: number
  spin: number
}

// Decorative, non-interactive rocks that fill the wider space in landscape on
// phones (no label, no hover, no click). Only the real project asteroids are
// interactive.
interface FillerData {
  key: string
  offset: [number, number, number]
  scale: number
  spin: number
}

function FillerAsteroid({ data }: { data: FillerData }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * data.spin
  })
  return (
    <group position={data.offset}>
      <group ref={ref} scale={data.scale}>
        <AsteroidModel radius={16 * WORLD_SCALE} />
      </group>
    </group>
  )
}

function Asteroid({ data, showUI }: { data: AsteroidData; showUI: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const openProject = useStore(openBeltProjectAtom)
  const isOpen = openProject?.id === data.project.id
  const lit = showUI && (hovered || isOpen)

  useFrame(({ camera }, delta) => {
    if (ref.current) ref.current.rotation.y += delta * data.spin
    // Highlight ring faces the camera and gently pulses when lit.
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position)
      const m = ringRef.current.material as THREE.MeshBasicMaterial
      m.opacity = lit ? 0.85 : 0
    }
  })

  const HIT_R = 22 * WORLD_SCALE

  return (
    <group position={data.offset}>
      <group ref={ref} scale={data.scale}>
        <AsteroidModel radius={16 * WORLD_SCALE} />
      </group>

      {/* Lit highlight ring (billboarded) — appears on hover / while open. */}
      <mesh ref={ringRef}>
        <ringGeometry args={[HIT_R * 0.92, HIT_R * 1.02, 48]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Small always-on name label. `transform` + `sprite` makes it a 3D-
          positioned plane that ALWAYS billboards toward the camera (fixes the
          mirrored/backwards text when the belt cam views from the far side)
          while still depth-sorting behind the ship. pointer-events:none so it
          never competes with the raycast (no flicker). */}
      {showUI && (
        <Html
          position={[0, 30 * WORLD_SCALE, 0]}
          center
          transform
          sprite
          occlude
          scale={17 * WORLD_SCALE}
          pointerEvents="none"
        >
          <div className="asteroid-label" style={{ pointerEvents: 'none' }}>
            {data.project.name}
          </div>
        </Html>
      )}

      {/* Invisible smooth hit sphere — the ONLY raycast target (the bumpy
          model's many triangles made hover thrash). */}
      {showUI && (
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            setHovered(false)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            e.stopPropagation()
            openBeltProjectAtom.set(isOpen ? null : data.project)
          }}
        >
          <sphereGeometry args={[HIT_R, 16, 16]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  )
}

// Belt asteroid field. Each rock shows a small name label during the belt
// cutscene; hover lights a ring around it, click opens a centered DOM modal
// (BeltModal, rendered in the DOM layer — NOT here in 3D). Field sits laterally
// off the flight path so the ship never flies through it.
export default function AsteroidBelt() {
  const waypoints = useStore(waypointsAtom)
  const curve = useStore(pathCurveAtom)
  const frames = useStore(planetFramesAtom)
  const seq = useStore(flybySequenceAtom)
  const narrow = useStore(phoneLayoutAtom)
  const beltWaypoint = waypoints.find((w) => w.id === 'belt')
  const beltActive = seq.activeId === 'belt' && seq.state !== 'chasing'

  const asteroids = useMemo<AsteroidData[]>(() => {
    const rng = mulberry32(4242)
    const n = BELT.length
    // Screen axes for the belt shot: the camera views along frameRight, so the
    // field's screen-horizontal ≈ tangent, screen-vertical ≈ world up, and
    // DEPTH (toward/away from the camera) ≈ right = tangent × up. Jittering
    // along depth breaks the "all pasted on one flat wall" look from the
    // side-on view. Kept within the field radius so nothing drifts near the cam.
    const tangent =
      beltWaypoint && curve ? curve.getTangent(beltWaypoint.u).normalize() : new THREE.Vector3(0, 0, 1)
    const up = new THREE.Vector3(0, 1, 0)
    // depth = right = frameRight, which points from the flight path OUTWARD to
    // the field center. So +depth moves a rock further from the path (safe) and
    // -depth moves it back TOWARD the ship's path (collision risk). We only ever
    // jitter in the +depth direction, so no asteroid can drift into the flight
    // path — they only recede deeper behind the field center.
    const depth = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const DEPTH_JITTER = FIELD_RADIUS * 1.1
    const depthOffset = () => rng() * DEPTH_JITTER // 0..+jitter, never toward the path

    if (narrow) {
      // Phone: a VERTICAL zigzag — 2 left, 2 right, stacked top→bottom — so all
      // four fit the viewport in portrait or landscape. index parity picks the
      // side; index picks the height (top to bottom).
      const vStart = FIELD_RADIUS * 1.4
      const vStep = n > 1 ? (FIELD_RADIUS * 2.8) / (n - 1) : 0
      const hOffset = FIELD_RADIUS * 0.7
      return BELT.map((project, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const pos = up
          .clone()
          .multiplyScalar(vStart - vStep * i)
          .add(tangent.clone().multiplyScalar(side * hOffset))
          .add(depth.clone().multiplyScalar(depthOffset()))
        return {
          project,
          offset: [pos.x, pos.y, pos.z] as [number, number, number],
          scale: 1.5 + rng() * 0.5,
          spin: 0.1 + rng() * 0.3,
        }
      })
    }

    // Desktop: the original horizontal row with a small vertical stagger, now
    // with per-rock depth jitter so it reads as a field, not a flat line.
    const spanStart = -FIELD_RADIUS * 1.5
    const spanStep = n > 1 ? (FIELD_RADIUS * 3.0) / (n - 1) : 0
    return BELT.map((project, i) => {
      const along = spanStart + spanStep * i
      const vStagger = (i % 2 === 0 ? -1 : 1) * FIELD_RADIUS * 0.35
      const pos = tangent
        .clone()
        .multiplyScalar(along)
        .add(up.clone().multiplyScalar(vStagger))
        .add(depth.clone().multiplyScalar(depthOffset()))
      return {
        project,
        offset: [pos.x, pos.y, pos.z] as [number, number, number],
        scale: 1.5 + rng() * 0.5,
        spin: 0.1 + rng() * 0.3,
      }
    })
  }, [beltWaypoint, curve, narrow])

  // Decorative filler rocks (both desktop and phone) that flesh out the field
  // around the interactive four so the belt reads as a real field, not four
  // lone rocks. Spread OUTSIDE the real asteroids' footprint so they never
  // crowd the clickable ones. On phone the real four are a vertical column
  // (flanked left/right); on desktop they're a horizontal row (flanked above/
  // below + further along), so the spread axes swap accordingly.
  const fillers = useMemo<FillerData[]>(() => {
    const rng = mulberry32(9182)
    const tangent =
      beltWaypoint && curve ? curve.getTangent(beltWaypoint.u).normalize() : new THREE.Vector3(0, 0, 1)
    const up = new THREE.Vector3(0, 1, 0)
    const depth = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const out: FillerData[] = []
    const COUNT = 14
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1
      let h: number
      let v: number
      if (narrow) {
        // Phone column: push fillers out to the LEFT/RIGHT (past the ±0.7r
        // column), any height. Landscape shows the far ones; portrait crops.
        h = side * FIELD_RADIUS * (1.6 + rng() * 2.6)
        v = (rng() * 2 - 1) * FIELD_RADIUS * 1.8
      } else {
        // Desktop row: the real four already span ±1.5r horizontally, so put
        // fillers ABOVE/BELOW that row and extend the row further out sideways
        // to widen the field across the landscape frame.
        h = (rng() * 2 - 1) * FIELD_RADIUS * 3.4
        v = side * FIELD_RADIUS * (0.9 + rng() * 1.4)
      }
      // Depth: only +depth (away from the flight path, behind the field
      // center) so fillers can never sit in the ship's path either. A wider
      // range than the real four gives the field volume front-to-back.
      const d = rng() * FIELD_RADIUS * 2.0
      const pos = tangent
        .clone()
        .multiplyScalar(h)
        .add(up.clone().multiplyScalar(v))
        .add(depth.clone().multiplyScalar(d))
      out.push({
        key: `filler-${i}`,
        offset: [pos.x, pos.y, pos.z] as [number, number, number],
        scale: 0.7 + rng() * 0.9,
        spin: 0.1 + rng() * 0.3,
      })
    }
    return out
  }, [beltWaypoint, curve, narrow])

  const beltFrame = frames.find((f) => f.id === 'belt')
  if (!beltWaypoint || !beltFrame) return null

  return (
    <group position={beltFrame.position}>
      {fillers.map((f) => (
        <FillerAsteroid key={f.key} data={f} />
      ))}
      {asteroids.map((a) => (
        <Asteroid key={a.project.id} data={a} showUI={beltActive} />
      ))}
    </group>
  )
}
