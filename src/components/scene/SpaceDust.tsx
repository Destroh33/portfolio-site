import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD_SCALE } from '../../stores/flybyLayout'
import { shipSpeedNormAtom } from '../../stores/shipMotion'

const COUNT = 380
const HALF = 1600 * (WORLD_SCALE / 10) // half-extent of the dust cell around the camera

// Soft round dot sprite — without a map, WebGL points render as hard squares.
function makeDotTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// Tiny dust motes drifting past the camera — the classic cheap sense-of-speed
// cue. The particles live in a fixed cell of space that wraps around the
// camera (each axis re-entered modulo the cell size), so flying through the
// world constantly streams motes past the view. Brightness scales with flight
// speed so they fade to near-invisible while hovering.
export default function SpaceDust() {
  const matRef = useRef<THREE.PointsMaterial>(null)
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const dotTex = useMemo(makeDotTexture, [])

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3)
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * HALF * 2
    return arr
  }, [])

  useFrame(({ camera }) => {
    const geo = geoRef.current
    if (geo) {
      const attr = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      const cam = camera.position
      const size = HALF * 2
      for (let i = 0; i < COUNT; i++) {
        for (let a = 0; a < 3; a++) {
          const idx = i * 3 + a
          const c = a === 0 ? cam.x : a === 1 ? cam.y : cam.z
          let rel = arr[idx] - c
          rel = ((((rel + HALF) % size) + size) % size) - HALF
          arr[idx] = c + rel
        }
      }
      attr.needsUpdate = true
      // Recentre the bounding sphere so the points never get frustum-culled.
      geo.boundingSphere ??= new THREE.Sphere()
      geo.boundingSphere.center.copy(cam)
      geo.boundingSphere.radius = HALF * 2
    }
    if (matRef.current) {
      const speed = shipSpeedNormAtom.get()
      matRef.current.opacity = 0.06 + 0.5 * speed
    }
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={dotTex ?? undefined}
        size={2.6 * WORLD_SCALE}
        sizeAttenuation
        color="#9fc7e8"
        transparent
        opacity={0.06}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
