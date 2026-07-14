import { useMemo, useRef } from 'react'
import { useFrame, createPortal } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { introBlendAtom } from '../../stores/introLayout'
import { WORLD_SCALE } from '../../stores/flybyLayout'
import { shipSpeedNormAtom } from '../../stores/shipMotion'

const URL = '/models/newspaceship.glb'

// The modeled rocket (public/models/newspaceship.glb). Authored in Blender
// with +Z forward, exported +Y-up → the ship's forward is glTF +Y; the
// wrapper rotates +Y onto our +Z flight convention. Single thruster: the
// flame stack + trail anchor are PORTALed into the file's own "Thruster"
// empty — move the empty in Blender + re-export to reposition, no code
// changes. Colors/roughness come straight from the file's materials.

const SHIP_LENGTH = 62 * (WORLD_SCALE / 10) // world units
// Flame dims in glTF-local units (this model is ~1.43 units long).
const FLAME_IDLE_LEN = 0.32
const FLAME_MAX_LEN = 1.7

interface Props {
  thrusterAnchor?: React.RefObject<THREE.Group | null>
}

// Flame stack + glow + trail anchor, portaled into the thruster empty. In
// glTF space the exhaust direction is -Y (ship forward = +Y), so this group
// rotates its local -Z (our flame convention) onto -Y.
function ThrusterFX({ anchorRef }: { anchorRef?: React.RefObject<THREE.Group | null> }) {
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const outerMat = useRef<THREE.MeshBasicMaterial>(null)
  const innerMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const o = introBlendAtom.get()
    const speed = shipSpeedNormAtom.get()
    const t = clock.getElapsedTime()
    const flicker = 1 + 0.14 * Math.sin(t * 27) + 0.09 * Math.sin(t * 13.7) + 0.05 * Math.sin(t * 41.3)
    const len = (FLAME_IDLE_LEN + (FLAME_MAX_LEN - FLAME_IDLE_LEN) * speed) * flicker

    if (outerRef.current) {
      outerRef.current.scale.set(0.8 + 0.4 * speed, len, 0.8 + 0.4 * speed)
      outerRef.current.position.z = -len * 0.5
    }
    if (innerRef.current) {
      const innerLen = len * 0.8
      innerRef.current.scale.set(0.55 * (0.8 + 0.4 * speed), innerLen, 0.55 * (0.8 + 0.4 * speed))
      innerRef.current.position.z = -innerLen * 0.5
    }
    if (outerMat.current) outerMat.current.opacity = o * (0.3 + 0.55 * speed)
    if (innerMat.current) innerMat.current.opacity = o * (0.5 + 0.5 * speed)
    if (glowMat.current) glowMat.current.opacity = o * (0.35 + 0.65 * speed) * (0.8 + 0.2 * Math.sin(t * 18))
    if (lightRef.current) lightRef.current.intensity = o * (0.8 + 4 * speed)
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 1, 12, 1, true]} />
        <meshBasicMaterial
          ref={outerMat}
          color="#4d9eff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 1, 12, 1, true]} />
        <meshBasicMaterial
          ref={innerMat}
          color="#d8f2ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial ref={glowMat} color="#8fe0ff" transparent opacity={0} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, -0.15]} color="#8fe0ff" intensity={0} distance={1.5} />
      {/* Trail emission point, just behind the nozzle. */}
      <group ref={anchorRef} position={[0, 0, -0.08]} />
    </group>
  )
}

export default function Ship({ thrusterAnchor }: Props) {
  const { scene } = useGLTF(URL)

  const { norm, thruster, materials } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    // Forward axis in the file is +Y — normalize by the Y extent.
    const length = box.max.y - box.min.y
    const norm = length > 0 ? SHIP_LENGTH / length : 1

    let thruster: THREE.Object3D | null = null
    scene.traverse((o) => {
      if (/thruster/i.test(o.name)) thruster = o
    })

    // Unique materials for the intro fade (remember authored opacity).
    const materials = new Map<THREE.Material, number>()
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (!materials.has(m)) {
            m.transparent = true
            materials.set(m, (m as THREE.MeshStandardMaterial).opacity ?? 1)
          }
        }
      }
    })
    return { norm, thruster: thruster as THREE.Object3D | null, materials }
  }, [scene])

  useFrame(() => {
    const o = introBlendAtom.get()
    materials.forEach((baseOpacity, mat) => {
      ;(mat as THREE.MeshStandardMaterial).opacity = baseOpacity * o
    })
  })

  return (
    // Rotate the file's +Y forward onto our +Z flight convention.
    <group rotation={[Math.PI / 2, 0, 0]} scale={norm}>
      <primitive object={scene} />
      {thruster && createPortal(<ThrusterFX anchorRef={thrusterAnchor} />, thruster)}
    </group>
  )
}

useGLTF.preload(URL)
