import { useMemo, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pathCurveAtom, WORLD_SCALE } from '../../stores/flybyLayout'
import { makePlanetMaterial } from './planetSurface'
import AtmosphereGlow from './AtmosphereGlow'

// Cloud texture as distinct weather systems: ~14 cluster centers, each a bank
// of overlapping horizontally-stretched puffs, with most of the globe left
// CLEAR — uniform scattering read as an all-over haze veil instead of clouds.
function makeCloudTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let seed = 424242
  const rng = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Sparse: a handful of small, wispy systems — most of the globe stays clear.
  const CLUSTERS = 7
  for (let cIdx = 0; cIdx < CLUSTERS; cIdx++) {
    const cx = rng() * W
    const cy = H * 0.15 + rng() * H * 0.7 // thin out at the poles
    const spread = 18 + rng() * 34
    const puffs = 4 + Math.floor(rng() * 5)
    for (let i = 0; i < puffs; i++) {
      // Clouds stretch along latitude — draw each puff scaled 2.4x wider than
      // tall via a transform around its own center.
      const x = cx + (rng() - 0.5) * spread * 2.4
      const y = cy + (rng() - 0.5) * spread
      const r = 7 + rng() * 15
      const a = 0.12 + rng() * 0.16
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(2.4, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      g.addColorStop(0, `rgba(255,255,255,${a})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(-r, -r, r * 2, r * 2)
      ctx.restore()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

// The Earth-like "home planet" the intro camera flies over before handing off
// to the ship chase-cam. Radius must stay in sync with HeroSurfaceCard's
// PLANET_RADIUS (the hero card anchors to this surface's top rim). Procedural
// ocean/continent shader (rocky mode: blue base = seas, green accent = land)
// plus a blue atmosphere shell.
export const INTRO_PLANET_RADIUS = 30 * WORLD_SCALE

export default function IntroPlanet() {
  const curve = useStore(pathCurveAtom)
  const ref = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () => makePlanetMaterial({ base: '#12457e', accent: '#3f7d3f', mode: 1, glow: '#6fb7ff' }),
    [],
  )
  const cloudTex = useMemo(makeCloudTexture, [])

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.015
    // Clouds drift slightly faster and opposite — sells a living atmosphere.
    if (cloudsRef.current) cloudsRef.current.rotation.y -= delta * 0.008
    material.uniforms.uTime.value = state.clock.getElapsedTime()
  })

  if (!curve) return null
  const position = curve.getPoint(0)

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[INTRO_PLANET_RADIUS, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      {cloudTex && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[INTRO_PLANET_RADIUS * 1.015, 48, 48]} />
          <meshStandardMaterial map={cloudTex} transparent depthWrite={false} roughness={1} />
        </mesh>
      )}
      {/* Tight thin rim — at the intro's grazing horizon angle the default
          thick shell read as a huge glow band. */}
      <AtmosphereGlow radius={INTRO_PLANET_RADIUS} color="#6fb7ff" shell={1.06} power={4.5} intensity={0.9} />
    </group>
  )
}
