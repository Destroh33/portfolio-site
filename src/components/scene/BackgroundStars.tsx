import { useMemo } from 'react'
import * as THREE from 'three'
import { WORLD_SCALE } from '../../stores/flybyLayout'

// Static scattered background stars filling the whole world volume — small
// bright points, a few tinted, giving depth behind the planets and nebula.
// (Starfield.tsx is the camera-following near/twinkly layer; this is the big
// fixed deep-field layer.)
export default function BackgroundStars() {
  const { geometry, material } = useMemo(() => {
    const COUNT = 6000
    const R = 9000 * (WORLD_SCALE / 10) * 3 // fills well beyond the path extents
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const rng = mulberry32(2024)

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#cfe0ff'),
      new THREE.Color('#ffe6c2'),
      new THREE.Color('#ffd0e0'),
    ]

    for (let i = 0; i < COUNT; i++) {
      // Uniform-ish in a big sphere shell.
      const u = rng()
      const r = R * (0.4 + 0.6 * Math.cbrt(u))
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const c = palette[Math.floor(rng() * palette.length)]
      const b = 0.6 + rng() * 0.4
      colors[i * 3] = c.r * b
      colors[i * 3 + 1] = c.g * b
      colors[i * 3 + 2] = c.b * b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 22 * (WORLD_SCALE / 10),
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    })
    return { geometry: geo, material: mat }
  }, [])

  return <points geometry={geometry} material={material} />
}

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
