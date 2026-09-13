import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flybySequenceAtom } from '../../stores/flybySequence'
import { planetFramesAtom, PLANET_RADIUS } from '../../stores/flybyLayout'
import { kickShake } from '../../stores/sceneFx'
import { reducedMotionAtom } from '../../stores/device'
import { PROJECT_TINT } from '../shard'

const DURATION = 1.5 // seconds per ring
const RINGS = [
  { delay: 0, from: 1.02, to: 3.4, width: 0.05, peak: 1 },
  { delay: 0.14, from: 1.0, to: 2.5, width: 0.022, peak: 0.7 },
]

// When a flyby locks in ('held', same beat as the boom SFX), two rings of the
// planet's glow color blast outward from it, billboarded to the camera, and
// the camera takes a small kick. Flagship planets only.
export default function ArrivalShockwave() {
  const groupRef = useRef<THREE.Group>(null)
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const startTime = useRef(-1)
  const pending = useRef<{ id: string } | null>(null)

  const materials = useMemo(
    () =>
      RINGS.map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  )
  const geometries = useMemo(() => RINGS.map((r) => new THREE.RingGeometry(1 - r.width, 1, 96)), [])

  useEffect(() => {
    let prev = flybySequenceAtom.get().state
    return flybySequenceAtom.subscribe((seq) => {
      if (seq.state === 'held' && prev === 'flyIn' && seq.activeId && PROJECT_TINT[seq.activeId]) {
        pending.current = { id: seq.activeId }
      }
      prev = seq.state
    })
  }, [])

  useFrame(({ camera, clock }) => {
    const group = groupRef.current
    if (!group) return
    const now = clock.getElapsedTime()

    if (pending.current) {
      const { id } = pending.current
      pending.current = null
      const frame = planetFramesAtom.get().find((f) => f.id === id)
      if (frame && !reducedMotionAtom.get()) {
        group.position.set(...frame.position)
        materials.forEach((m) => m.color.set(PROJECT_TINT[id]))
        startTime.current = now
        kickShake(1)
      }
    }

    if (startTime.current < 0) {
      group.visible = false
      return
    }
    group.visible = true
    group.quaternion.copy(camera.quaternion)

    const elapsed = now - startTime.current
    let alive = false
    RINGS.forEach((ring, i) => {
      const mesh = ringRefs.current[i]
      if (!mesh) return
      const p = THREE.MathUtils.clamp((elapsed - ring.delay) / DURATION, 0, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const radius = PLANET_RADIUS * (ring.from + (ring.to - ring.from) * eased)
      mesh.scale.setScalar(radius)
      materials[i].opacity = p <= 0 || p >= 1 ? 0 : ring.peak * Math.pow(1 - p, 1.6)
      if (p < 1) alive = true
    })
    if (!alive) startTime.current = -1
  })

  return (
    <group ref={groupRef} visible={false}>
      {RINGS.map((_, i) => (
        <mesh key={i} ref={(el) => (ringRefs.current[i] = el)} geometry={geometries[i]} material={materials[i]} frustumCulled={false} />
      ))}
    </group>
  )
}
