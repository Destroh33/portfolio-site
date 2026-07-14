import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANET_RADIUS } from '../../stores/flybyLayout'

const R = PLANET_RADIUS

// Per-project orbiting details that give each flagship planet its identity —
// everything relates to what the project IS:
//   Broken Peaces — volcanic world with its broken moons + a shard debris ring
//   Prime Weaver  — arcane rune ring, woven web cocoon, rising spell wisps
//   MotoMania     — an orbital ROAD with a motorcycle lapping it (light trail)
//   VR Lab        — circling EEG brainwave + research satellite
//   AI Guide      — glowing map pins + an animated navigation route
// All cheap: canvas textures, additive points/lines, flat-shaded micro-meshes.

// ── shared helpers ─────────────────────────────────────────────────────────

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

// Flat ring band (annulus) in the XZ plane with polar UVs: u across the band,
// v along the circumference — so a strip texture wraps around it cleanly.
function makeAnnulusGeometry(rInner: number, rOuter: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    positions.push(c * rInner, 0, s * rInner, c * rOuter, 0, s * rOuter)
    uvs.push(0, i / segments, 1, i / segments)
    if (i < segments) {
      const k = i * 2
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(indices)
  return geo
}

// Points material with per-point alpha (procedural soft dot, additive).
function makeAlphaPointsMaterial(color: string, size: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      varying float vAlpha;
      uniform float uSize;
      void main(){
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (600.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.08, d) * vAlpha;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

// (Broken Peaces has no orbiting detail — just the volcanic planet surface.)

// ── Prime Weaver: rune ring + web cocoon + spell wisps ─────────────────────

function makeRuneTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const W = 1024
  const H = 128
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const rng = mulberry32(1313)
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  // border rails
  ctx.beginPath()
  ctx.moveTo(0, 10)
  ctx.lineTo(W, 10)
  ctx.moveTo(0, H - 10)
  ctx.lineTo(W, H - 10)
  ctx.stroke()
  // glyphs: short angular strokes + occasional circle per cell
  const CELLS = 26
  for (let k = 0; k < CELLS; k++) {
    const x0 = (k / CELLS) * W + 10
    const cw = W / CELLS - 20
    const strokes = 3 + Math.floor(rng() * 3)
    ctx.beginPath()
    for (let s = 0; s < strokes; s++) {
      const x1 = x0 + rng() * cw
      const y1 = 26 + rng() * (H - 52)
      const x2 = x0 + rng() * cw
      const y2 = 26 + rng() * (H - 52)
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
    if (rng() < 0.4) {
      ctx.beginPath()
      ctx.arc(x0 + cw / 2, H / 2, 8 + rng() * 10, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

function RuneRing() {
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const tex = useMemo(makeRuneTexture, [])
  const outerGeo = useMemo(() => makeAnnulusGeometry(R * 1.55, R * 1.78, 128), [])
  const innerGeo = useMemo(() => makeAnnulusGeometry(R * 1.32, R * 1.46, 128), [])
  useFrame((_, delta) => {
    if (outerRef.current) outerRef.current.rotation.y += delta * 0.1
    if (innerRef.current) innerRef.current.rotation.y -= delta * 0.06
  })
  if (!tex) return null
  return (
    <group rotation={[0.9, 0, 0.18]}>
      <mesh ref={outerRef} geometry={outerGeo}>
        <meshBasicMaterial
          map={tex}
          color="#c86aff"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={innerRef} geometry={innerGeo}>
        <meshBasicMaterial
          map={tex}
          color="#ff4ad0"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Irregular woven lattice around the planet — each node links to its nearest
// neighbours, like a loose silk cocoon. Bright pulses travel the strands.
function WebCocoon() {
  const groupRef = useRef<THREE.Group>(null)
  const pulsesRef = useRef<THREE.Points>(null)

  const { lineGeo, edges, pulseState, pulseGeo, pulseMat } = useMemo(() => {
    const rng = mulberry32(2424)
    const N = 56
    const nodes: THREE.Vector3[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i + rng() * 0.35 // jitter so it's a web, not a wireframe
      nodes.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R * 2.1))
    }
    // connect each node to its 3 nearest neighbours (deduped)
    const edgeSet = new Set<string>()
    const edges: [THREE.Vector3, THREE.Vector3][] = []
    for (let i = 0; i < N; i++) {
      const dists = nodes
        .map((p, j) => ({ j, d: i === j ? Infinity : p.distanceToSquared(nodes[i]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
      for (const { j } of dists) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push([nodes[i], nodes[j]])
        }
      }
    }
    const positions = new Float32Array(edges.length * 6)
    edges.forEach(([a, b], i) => {
      positions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6)
    })
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // travelling pulses
    const P = 7
    const pulseState = Array.from({ length: P }).map(() => ({
      edge: Math.floor(rng() * edges.length),
      t: rng(),
      speed: 0.5 + rng() * 0.7,
    }))
    const pulseGeo = new THREE.BufferGeometry()
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P * 3), 3))
    pulseGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(P).fill(1), 1))
    const pulseMat = makeAlphaPointsMaterial('#ffd6ff', R * 0.06)
    return { lineGeo, edges, pulseState, pulseGeo, pulseMat }
  }, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03
      groupRef.current.rotation.x += delta * 0.008
    }
    const attr = pulseGeo.getAttribute('position') as THREE.BufferAttribute
    pulseState.forEach((p, i) => {
      p.t += delta * p.speed
      if (p.t >= 1) {
        p.t = 0
        p.edge = Math.floor(Math.random() * edges.length)
      }
      const [a, b] = edges[p.edge]
      attr.setXYZ(i, a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, a.z + (b.z - a.z) * p.t)
    })
    attr.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#e0b8ff" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points ref={pulsesRef} geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </group>
  )
}

// Spell wisps: motes rising off the surface in tightening spirals, dissolving.
function SpellWisps() {
  const N = 18
  const { geo, mat, wisps } = useMemo(() => {
    const rng = mulberry32(5151)
    const wisps = Array.from({ length: N }).map(() => {
      const n = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize()
      const t1 = new THREE.Vector3(0, 1, 0).cross(n)
      if (t1.lengthSq() < 0.01) t1.set(1, 0, 0)
      t1.normalize()
      const t2 = n.clone().cross(t1).normalize()
      return { n, t1, t2, phase: rng() * 2.4, life: 2.0 + rng() * 1.2, theta: rng() * Math.PI * 2 }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(N), 1))
    const mat = makeAlphaPointsMaterial('#ff8ae0', R * 0.055)
    return { geo, mat, wisps }
  }, [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const alpha = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    wisps.forEach((w, i) => {
      const t = ((time + w.phase) % w.life) / w.life
      const rad = R * (1.02 + t * 0.85)
      const swirl = w.theta + t * 5.5
      const lateral = R * 0.22 * t
      const p = w.n
        .clone()
        .multiplyScalar(rad)
        .addScaledVector(w.t1, Math.cos(swirl) * lateral)
        .addScaledVector(w.t2, Math.sin(swirl) * lateral)
      pos.setXYZ(i, p.x, p.y, p.z)
      alpha.setX(i, Math.sin(t * Math.PI) * 0.9)
    })
    pos.needsUpdate = true
    alpha.needsUpdate = true
  })

  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// ── MotoMania: orbital road + motorcycle with light trail ──────────────────

function makeRoadTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const W = 128 // across the road
  const H = 512 // along the road
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#1b1712' // warm dark asphalt
  ctx.fillRect(0, 0, W, H)
  // glowing amber edge rails (match the bike/planet warm scheme)
  ctx.fillStyle = '#ffb14a'
  ctx.fillRect(8, 0, 5, H)
  ctx.fillRect(W - 13, 0, 5, H)
  // dashed white-gold center line
  ctx.fillStyle = '#fff0d0'
  for (let y = 0; y < H; y += 72) {
    ctx.fillRect(W / 2 - 4, y, 8, 40)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 18)
  return tex
}

const ROAD_RC = 1.62 // centerline radius (× R)
const TRAIL_N = 16 // more segments → a smoother, longer flame
const FIRE_COLOR = new THREE.Color()

// Soft round flame-mote texture (shared) — additive dots read as fire.
function makeFireTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

const BIKE_H = R * 0.05 // ride height above the road plane

function RoadWithBike() {
  const bikeRef = useRef<THREE.Group>(null)
  const trailRefs = useRef<(THREE.Sprite | null)[]>([])
  const tex = useMemo(makeRoadTexture, [])
  const fireTex = useMemo(makeFireTexture, [])
  const roadGeo = useMemo(() => makeAnnulusGeometry(R * (ROAD_RC - 0.09), R * (ROAD_RC + 0.09), 160), [])
  const angleRef = useRef(0)
  const basis = useRef(new THREE.Matrix4())

  useFrame(({ clock }, delta) => {
    angleRef.current += delta * 0.6
    const a = angleRef.current
    const rc = R * ROAD_RC
    const t = clock.getElapsedTime()

    if (bikeRef.current) {
      bikeRef.current.position.set(Math.cos(a) * rc, BIKE_H, Math.sin(a) * rc)
      // Orient from an explicit local basis (no lookAt, which fought the ring's
      // tilt): the bike's +Z = tangent of travel, +Y = ring-local up. This
      // keeps it exactly parallel to the ring at every point.
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
      const up = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3().crossVectors(up, tangent).normalize()
      basis.current.makeBasis(right, up, tangent)
      bikeRef.current.quaternion.setFromRotationMatrix(basis.current)
    }
    // Taillight motion trail: sprites lag behind at previous angles, riding the
    // ring plane, fading + shrinking, with a little flicker so it feels alive.
    for (let i = 0; i < TRAIL_N; i++) {
      const s = trailRefs.current[i]
      if (!s) continue
      const ta = a - (i + 1) * 0.045
      s.position.set(Math.cos(ta) * rc, BIKE_H, Math.sin(ta) * rc)
      const k = 1 - i / TRAIL_N // 1 near the bike → 0 at the tail
      const mat = s.material as THREE.SpriteMaterial
      // Fiery gradient: white-hot at the nozzle → yellow → orange → deep red,
      // with per-segment flicker so the flame licks.
      FIRE_COLOR.set(1, 0.35 + 0.6 * k, Math.max(0, k - 0.4) * 0.9)
      mat.color.copy(FIRE_COLOR)
      const flick = 0.75 + 0.25 * Math.sin(t * 34 - i * 1.3) + 0.12 * Math.sin(t * 61 - i)
      mat.opacity = (0.35 + 0.55 * k) * k * flick
      const w = R * (0.05 + 0.09 * k) * (0.9 + 0.15 * flick)
      s.scale.set(w, w * 0.62, 1)
    }
  })

  if (!tex) return null
  return (
    <group rotation={[0.42, 0, 0.12]}>
      {/* renderOrder < the planet's AtmosphereGlow (which is default 0) so the
          additive orange halo draws OVER the road where it's behind the planet
          — the road reads as dimmed/tinted by the atmosphere instead of
          punching through the glow (the halo writes no depth, so it can't
          occlude; drawing it after the road is the cheap fix). */}
      <mesh geometry={roadGeo} renderOrder={-1}>
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} transparent opacity={0.95} />
      </mesh>

      {/* the bike: a sleek black racing machine (no lights — the fiery exhaust
          trail is the only glow). */}
      <group ref={bikeRef}>
        <mesh position={[0, R * 0.03, 0]}>
          <boxGeometry args={[R * 0.045, R * 0.05, R * 0.17]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.35} metalness={0.7} flatShading />
        </mesh>
        {/* wheels */}
        {[R * 0.08, -R * 0.08].map((z, i) => (
          <mesh key={i} position={[0, R * 0.018, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[R * 0.03, R * 0.03, R * 0.018, 14]} />
            <meshStandardMaterial color="#141014" roughness={0.6} flatShading />
          </mesh>
        ))}
      </group>

      {/* fiery exhaust trail (color/size/opacity animated per-frame above) */}
      {Array.from({ length: TRAIL_N }).map((_, i) => (
        <sprite key={i} ref={(el) => (trailRefs.current[i] = el)} scale={[R * 0.11, R * 0.05, 1]}>
          <spriteMaterial map={fireTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}

// ── VR Lab: node-network sphere with cyclically travelling signals ─────────
// Circular nodes sit just above the surface, linked by straight lines; signals
// light a node → travel its edge → light the next node → …, in overlapping
// cascades (like the reference globe / neural-signal propagation).

// Network sits well ABOVE the surface so the straight chord links between
// nodes clear the sphere instead of clipping through it (a chord between two
// points on radius r dips to r·cos(halfAngle) at its midpoint).
const NET_R = R * 1.22

function NodeNetwork() {
  const groupRef = useRef<THREE.Group>(null)

  const { nodes, adjacency, lineGeo, nodeMeshRefs, ringMeshRefs, pulseGeo, pulseMat, signals } = useMemo(() => {
    const rng = mulberry32(9091)
    const N = 22
    // Fibonacci-sphere nodes (even coverage), light jitter.
    const nodes: THREE.Vector3[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i + rng() * 0.3
      nodes.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(NET_R))
    }
    // Edges: connect each node to its 3 nearest (deduped).
    const edgeKey = new Set<string>()
    const edges: [number, number][] = []
    const adjacency: number[][] = nodes.map(() => [])
    for (let i = 0; i < N; i++) {
      const near = nodes
        .map((p, j) => ({ j, d: i === j ? Infinity : p.distanceToSquared(nodes[i]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
      for (const { j } of near) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (!edgeKey.has(key)) {
          edgeKey.add(key)
          edges.push([i, j])
          adjacency[i].push(j)
          adjacency[j].push(i)
        }
      }
    }
    const linePos = new Float32Array(edges.length * 6)
    edges.forEach(([a, b], i) => linePos.set([...nodes[a].toArray(), ...nodes[b].toArray()], i * 6))
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))

    // Travelling signal packets (rendered as bright points).
    const SIG = 9
    const signals = Array.from({ length: SIG }).map(() => {
      const from = Math.floor(rng() * N)
      const to = adjacency[from][Math.floor(rng() * adjacency[from].length)]
      return { from, to, t: rng() }
    })
    const pulseGeo = new THREE.BufferGeometry()
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SIG * 3), 3))
    pulseGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(SIG).fill(1), 1))
    const pulseMat = makeAlphaPointsMaterial('#c8fbff', R * 0.09)

    return {
      nodes,
      adjacency,
      lineGeo,
      nodeMeshRefs: { current: [] as (THREE.Mesh | null)[] },
      ringMeshRefs: { current: [] as (THREE.Mesh | null)[] },
      pulseGeo,
      pulseMat,
      signals,
    }
  }, [])

  // Per-node "excitation" level, decays each frame; a signal arriving re-lights.
  const excite = useRef<number[]>(nodes.map(() => 0))

  useFrame(({ clock }, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05
    const dt = Math.min(delta, 0.1)
    const t = clock.getElapsedTime()

    // Advance signals; on arrival, excite the node and re-emit onward.
    const pulsePos = pulseGeo.getAttribute('position') as THREE.BufferAttribute
    signals.forEach((sig, i) => {
      sig.t += dt * 0.9
      if (sig.t >= 1) {
        sig.t = 0
        excite.current[sig.to] = 1
        const nextChoices = adjacency[sig.to].filter((n) => n !== sig.from)
        const next = (nextChoices.length ? nextChoices : adjacency[sig.to])[
          Math.floor(Math.random() * (nextChoices.length || adjacency[sig.to].length))
        ]
        sig.from = sig.to
        sig.to = next
      }
      const a = nodes[sig.from]
      const b = nodes[sig.to]
      pulsePos.setXYZ(i, a.x + (b.x - a.x) * sig.t, a.y + (b.y - a.y) * sig.t, a.z + (b.z - a.z) * sig.t)
    })
    pulsePos.needsUpdate = true

    // Node glow: excitation decays; a small ambient shimmer keeps them alive.
    excite.current.forEach((e, i) => {
      excite.current[i] = Math.max(0, e - dt * 1.4)
      const glow = 0.35 + 0.65 * excite.current[i] + 0.1 * Math.sin(t * 3 + i)
      const nm = nodeMeshRefs.current[i]
      const rm = ringMeshRefs.current[i]
      if (nm) (nm.material as THREE.MeshBasicMaterial).opacity = glow
      if (rm) {
        const s = 1 + excite.current[i] * 0.8
        rm.scale.setScalar(s)
        ;(rm.material as THREE.MeshBasicMaterial).opacity = 0.5 * glow
      }
    })
  })

  return (
    <group ref={groupRef} rotation={[0.2, 0, 0.1]}>
      {/* links */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#5fd4ff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {/* nodes: bright core + a ring halo, oriented to face outward */}
      {nodes.map((p, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize())
        return (
          <group key={i} position={p} quaternion={q}>
            <mesh ref={(el) => (nodeMeshRefs.current[i] = el)}>
              <sphereGeometry args={[R * 0.045, 12, 12]} />
              <meshBasicMaterial color="#c8fbff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh ref={(el) => (ringMeshRefs.current[i] = el)}>
              <ringGeometry args={[R * 0.06, R * 0.08, 20]} />
              <meshBasicMaterial color="#7fe8ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        )
      })}
      {/* travelling signal packets */}
      <points geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </group>
  )
}

function Satellite() {
  const orbitRef = useRef<THREE.Group>(null)
  const selfRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += delta * 0.2
    if (selfRef.current) selfRef.current.rotation.z += delta * 0.4
  })
  return (
    <group ref={orbitRef} rotation={[0.3, 0, -0.2]}>
      <group ref={selfRef} position={[R * 1.9, 0, 0]}>
        <mesh>
          <boxGeometry args={[R * 0.14, R * 0.14, R * 0.26]} />
          <meshStandardMaterial color="#c8d2e0" metalness={0.5} roughness={0.4} flatShading />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * R * 0.28, 0, 0]}>
            <boxGeometry args={[R * 0.3, R * 0.01, R * 0.14]} />
            <meshStandardMaterial color="#2f6fd0" metalness={0.3} roughness={0.5} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}


// ── dispatch ───────────────────────────────────────────────────────────────

export default function PlanetDetail({ id }: { id: string }) {
  switch (id) {
    case 'broken-peaces':
      // Just the volcanic planet itself now — no moons or debris ring.
      return null
    case 'prime-weaver':
      return (
        <>
          <RuneRing />
          <WebCocoon />
          <SpellWisps />
        </>
      )
    case 'motomania':
      return <RoadWithBike />
    case 'vr-lab':
      return <NodeNetwork />
    case 'ai-guide':
      // The grid-map surface carries the identity; just the survey satellite
      // orbits it. (Map pins + route removed — their bright heads bloomed into
      // distracting glowing dots.)
      return <Satellite />
    default:
      return null
  }
}
