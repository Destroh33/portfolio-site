import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANET_RADIUS } from '../../stores/flybyLayout'
import AtmosphereGlow from './AtmosphereGlow'
import PlanetDetail from './PlanetDetail'
import { makePlanetMaterial, type PlanetStyle } from './planetSurface'

interface Props {
  id: string
  position: [number, number, number]
  style: PlanetStyle
}

// A procedurally-shaded planet (see planetSurface.ts) with an atmosphere rim
// shell tinted to its glow color, plus its per-project orbiting identity
// detail (moon/rings/satellite/etc — see PlanetDetail.tsx).
export default function ProjectPlanet({ id, position, style }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const material = useMemo(() => makePlanetMaterial(style), [style])

  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05
    material.uniforms.uTime.value = state.clock.getElapsedTime()
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      <AtmosphereGlow radius={PLANET_RADIUS} color={style.glow} />
      <PlanetDetail id={id} />
    </group>
  )
}
