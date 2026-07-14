import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD_SCALE, PATH_POINTS } from '../../stores/flybyLayout'
import { reducedMotionAtom } from '../../stores/device'
import { useStore } from '@nanostores/react'

// Nebula as large FIXED-in-world-space inside-out textured spheres (three
// layers). Cloud textures are generated once on a 2D canvas (multi-octave
// value-noise → wispy clouds → per-layer palette). Layers slowly counter-
// rotate on tilted axes and "breathe" (opacity oscillates), so the combined
// shape continuously morphs. Because the spheres are anchored to the world
// (NOT following the camera), flying past the gas gives true parallax.

type Palette = (d: number) => [number, number, number]

function rampPalette(stops: [number, [number, number, number]][]): Palette {
  return (d: number) => {
    let lo = stops[0]
    let hi = stops[stops.length - 1]
    for (let i = 0; i < stops.length - 1; i++) {
      if (d >= stops[i][0] && d <= stops[i + 1][0]) {
        lo = stops[i]
        hi = stops[i + 1]
        break
      }
    }
    const span = hi[0] - lo[0] || 1
    const t = (d - lo[0]) / span
    return [
      lo[1][0] + (hi[1][0] - lo[1][0]) * t,
      lo[1][1] + (hi[1][1] - lo[1][1]) * t,
      lo[1][2] + (hi[1][2] - lo[1][2]) * t,
    ]
  }
}

// Pillars-of-Creation warm layer: deep rust -> amber -> pale gold.
const warmPalette = rampPalette([
  [0.0, [30, 12, 8]],
  [0.4, [140, 60, 30]],
  [0.7, [220, 140, 70]],
  [1.0, [255, 220, 160]],
])

// Magenta/violet transition layer.
const magentaPalette = rampPalette([
  [0.0, [20, 8, 30]],
  [0.45, [110, 40, 120]],
  [0.75, [200, 80, 170]],
  [1.0, [255, 170, 220]],
])

// Blue "motes" layer: deep blue with bright cyan sparks in the densest spots.
const bluePalette = rampPalette([
  [0.0, [6, 10, 30]],
  [0.5, [30, 70, 170]],
  [0.8, [80, 160, 230]],
  [1.0, [180, 240, 255]],
])

function valueNoise2D(w: number, h: number, seed: number): Float32Array {
  const rng = mulberry32(seed)
  const grid = 8
  const gw = grid + 1
  const rand = new Float32Array(gw * gw)
  for (let i = 0; i < rand.length; i++) rand[i] = rng()
  const out = new Float32Array(w * h)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const sample = (fx: number, fy: number) => {
    const gx = fx * grid
    const gy = fy * grid
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const tx = smooth(gx - x0)
    const ty = smooth(gy - y0)
    const x1 = (x0 + 1) % grid
    const y1 = (y0 + 1) % grid
    const a = rand[y0 * gw + x0]
    const b = rand[y0 * gw + x1]
    const c = rand[y1 * gw + x0]
    const d = rand[y1 * gw + x1]
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = sample(x / w, y / h)
    }
  }
  return out
}

function fbm2D(w: number, h: number, seed: number, octaves: number): Float32Array {
  const out = new Float32Array(w * h)
  let amp = 0.5
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise2D(w, h, seed + o * 131)
    const freq = Math.pow(2, o)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(((x * freq) % w + w) % w)
        const sy = Math.floor(((y * freq) % h + h) % h)
        out[y * w + x] += amp * layer[sy * w + sx]
      }
    }
    total += amp
    amp *= 0.5
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

function makeNebulaTexture(seed: number, palette: Palette, alphaMul: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const density = fbm2D(W, H, seed, 6)
  const patch = fbm2D(W, H, seed + 999, 3)
  const img = ctx.createImageData(W, H)
  for (let i = 0; i < W * H; i++) {
    let d = density[i]
    d = Math.max(0, (d - 0.4) / 0.6)
    d = Math.pow(d, 1.35)
    // Soft patch gate: fades each layer out over parts of the sky (so layers
    // occupy different regions and hues separate) without zeroing so hard that
    // the whole nebula vanishes.
    const gate = 0.15 + 0.85 * Math.max(0, (patch[i] - 0.25) / 0.75)
    d *= gate
    // Index the palette with a boosted value so colors actually reach their
    // bright mid/high stops (feeding it the crushed alpha-density kept every
    // pixel stuck at the dark low end).
    const [r, g, b] = palette(Math.min(1, d * 2.2))
    const a = Math.min(1, d * alphaMul)
    img.data[i * 4] = r
    img.data[i * 4 + 1] = g
    img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = a * 255
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// World center of the path so the fixed spheres surround the whole journey.
function worldCenter(): THREE.Vector3 {
  const pts = Object.values(PATH_POINTS)
  const c = new THREE.Vector3()
  for (const p of pts) c.add(new THREE.Vector3(...p))
  return c.divideScalar(pts.length)
}

interface LayerSpec {
  seed: number
  palette: Palette
  alphaMul: number
  baseOpacity: number
  breatheAmp: number
  breatheSpeed: number
  rotAxis: THREE.Vector3
  rotSpeed: number
  tilt: [number, number, number]
  radiusMul: number
}

const LAYERS: LayerSpec[] = [
  {
    seed: 12345,
    palette: warmPalette,
    alphaMul: 1.5,
    baseOpacity: 0.8,
    breatheAmp: 0.15,
    breatheSpeed: 0.05,
    rotAxis: new THREE.Vector3(0, 1, 0),
    rotSpeed: 0.0035,
    tilt: [0.1, 0, 0.05],
    radiusMul: 1.0,
  },
  {
    seed: 67890,
    palette: magentaPalette,
    alphaMul: 1.35,
    baseOpacity: 0.7,
    breatheAmp: 0.18,
    breatheSpeed: 0.034,
    rotAxis: new THREE.Vector3(0.3, 1, 0).normalize(),
    rotSpeed: -0.0022,
    tilt: [0.5, 1.4, 0.2],
    radiusMul: 0.92,
  },
  {
    seed: 24680,
    palette: bluePalette,
    alphaMul: 1.3,
    baseOpacity: 0.65,
    breatheAmp: 0.2,
    breatheSpeed: 0.021,
    rotAxis: new THREE.Vector3(-0.2, 1, 0.25).normalize(),
    rotSpeed: 0.0016,
    tilt: [-0.4, 2.6, -0.15],
    radiusMul: 0.85,
  },
]

export default function VolumetricNebula() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const reduced = useStore(reducedMotionAtom)

  const textures = useMemo(
    () => LAYERS.map((l) => makeNebulaTexture(l.seed, l.palette, l.alphaMul)),
    [],
  )
  const center = useMemo(worldCenter, [])

  // Big enough that the camera stays inside the spheres for the whole journey
  // (world extents ~±8000 around center), comfortably inside far=60000.
  const radius = 30000 * (WORLD_SCALE / 10)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    LAYERS.forEach((spec, i) => {
      const mesh = meshRefs.current[i]
      const mat = matRefs.current[i]
      if (mesh && !reduced) {
        mesh.rotateOnAxis(spec.rotAxis, spec.rotSpeed * delta)
      }
      if (mat) {
        const breathe = reduced ? 0 : Math.sin(t * spec.breatheSpeed * Math.PI * 2 + i * 2.1) * spec.breatheAmp
        mat.opacity = spec.baseOpacity + breathe
      }
    })
  })

  if (textures.some((t) => t == null)) return null

  return (
    <group position={center}>
      {LAYERS.map((spec, i) => (
        <mesh
          key={spec.seed}
          ref={(el) => (meshRefs.current[i] = el)}
          rotation={spec.tilt}
          renderOrder={-20 + i}
          frustumCulled={false}
        >
          <sphereGeometry args={[radius * spec.radiusMul, 48, 32]} />
          <meshBasicMaterial
            ref={(el) => (matRefs.current[i] = el)}
            map={textures[i]!}
            side={THREE.BackSide}
            transparent
            opacity={spec.baseOpacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
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
