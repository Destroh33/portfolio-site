import { useMemo, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { pathCurveAtom, waypointsAtom, WORLD_SCALE } from '../../stores/flybyLayout'
import { narrowViewportAtom } from '../../stores/device'
import { scrollProgressAtom } from '../../stores/scrollProgress'
import { PATH_POINTS } from '../../stores/flybyLayout'
import { BUILT_WITH, ATTRIBUTIONS, CREDITS_REPO, CREDITS_CLOSING } from '../../data/credits'

const S = WORLD_SCALE

// Low-poly outro station on the return-home leg. As the ship drifts past on
// its way back to Start, a credits transmission panel fades in beside it — a
// gentle flyby, NOT a camera-locked cutscene (that ceremony is reserved for
// projects). The panel is world-space Html anchored near the station.
export default function SpaceStation() {
  const groupRef = useRef<THREE.Group>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const waypoints = useStore(waypointsAtom)
  const curve = useStore(pathCurveAtom)
  const narrow = useStore(narrowViewportAtom)

  const creditsWp = waypoints.find((w) => w.id === 'credits')

  // Frame the beat like a side-on flyby: station to the LEFT of the flight
  // path, credits panel to the RIGHT. Both offset along the path's frameRight
  // at the credits point (derived from the curve tangent there).
  const { stationPos, panelOffset } = useMemo(() => {
    const base = new THREE.Vector3(...PATH_POINTS['credits'])
    const worldUp = new THREE.Vector3(0, 1, 0)
    const tangent = curve && creditsWp ? curve.getTangent(creditsWp.u).normalize() : new THREE.Vector3(0, 0, 1)
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()
    const SIDE = 42 * S
    // Station just left of the path; panel pushed well to the RIGHT so it clears
    // the ship (which flies along the path) and never overlaps it.
    const stationPos = base.clone().add(right.clone().multiplyScalar(-SIDE))
    // Desktop: panel pushed well RIGHT of the path (clears the ship). Phone: the
    // narrow FOV would push that off-screen, so center the panel over the path
    // point instead (panelOffset relative to the group at stationPos, so +SIDE
    // right lands it back at `base`), lifted a touch.
    const panelOffset = narrow
      ? right.clone().multiplyScalar(SIDE).add(worldUp.clone().multiplyScalar(4 * S))
      : right.clone().multiplyScalar(SIDE * 2.1).add(worldUp.clone().multiplyScalar(4 * S))
    return { stationPos, panelOffset }
  }, [curve, creditsWp, narrow])

  const panelWorld = useMemo(
    () => new THREE.Vector3(...PATH_POINTS['credits']).add(panelOffset),
    [panelOffset],
  )

  useFrame(({ camera }, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05
    // Fade the panel by scroll proximity to the credits waypoint (no camera
    // lock — the ship just passes; the panel eases in around the flyby window),
    // AND fade it back out once it gets close to the camera so it never clips
    // through / balloons past the view as you fly by it.
    if (panelRef.current && creditsWp) {
      const t = scrollProgressAtom.get()
      const scrollVis = THREE.MathUtils.clamp(1 - Math.abs(t - creditsWp.t) / 0.03, 0, 1)
      const dist = camera.position.distanceTo(panelWorld)
      const NEAR = 90 * S // start fading when the panel is within this of the camera
      const nearVis = THREE.MathUtils.clamp((dist - NEAR * 0.5) / (NEAR * 0.5), 0, 1)
      const vis = scrollVis * nearVis
      panelRef.current.style.opacity = String(vis)
      panelRef.current.style.pointerEvents = vis > 0.6 ? 'auto' : 'none'
    }
  })

  if (!curve) return null

  return (
    <group position={stationPos}>
      {/* Station meshes (slow spin), to the LEFT of the flight path. */}
      <group ref={groupRef} scale={0.5}>
        <mesh>
          <cylinderGeometry args={[10 * S, 10 * S, 26 * S, 8]} />
          <meshStandardMaterial color="#c2c9d6" metalness={0.6} roughness={0.4} flatShading />
        </mesh>
        {[13 * S, -13 * S].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[6 * S, 6 * S, 3 * S, 8]} />
            <meshStandardMaterial color="#8b93a3" metalness={0.5} roughness={0.5} flatShading />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 22 * S, 0, 0]}>
            <mesh position={[-s * 8 * S, 0, 0]}>
              <boxGeometry args={[16 * S, 1.5 * S, 2 * S]} />
              <meshStandardMaterial color="#9aa2b2" metalness={0.4} roughness={0.5} flatShading />
            </mesh>
            <mesh>
              <boxGeometry args={[18 * S, 0.6 * S, 11 * S]} />
              <meshStandardMaterial color="#2f5fb0" emissive="#1a3a80" emissiveIntensity={0.35} metalness={0.3} roughness={0.5} flatShading />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 17 * S, 6 * S]} rotation={[Math.PI / 4, 0, 0]}>
          <coneGeometry args={[5 * S, 3 * S, 12, 1, true]} />
          <meshStandardMaterial color="#d6dbe6" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} flatShading />
        </mesh>
        <mesh>
          <cylinderGeometry args={[10.1 * S, 10.1 * S, 4 * S, 8, 1, true]} />
          <meshBasicMaterial color="#8fe0ff" transparent opacity={0.7} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <pointLight color="#bfe6ff" intensity={2} distance={120 * S} />
      </group>

      {/* Credits transmission panel — to the RIGHT of the path (offset from the
          station across to the other side). */}
      <Html position={panelOffset} center distanceFactor={(narrow ? 216 : 240) * S} occlude={false}>
        <div ref={panelRef} className="credits-panel" style={{ opacity: 0 }}>
          <h2>Credits</h2>
          <div className="credits-group">
            <h3>Built with</h3>
            <ul>
              {BUILT_WITH.map((c) => (
                <li key={c.label}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noreferrer">
                      {c.label}
                    </a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  <em> — {c.detail}</em>
                </li>
              ))}
            </ul>
          </div>
          <div className="credits-group">
            <h3>Assets</h3>
            <ul>
              {ATTRIBUTIONS.map((c) => (
                <li key={c.label}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noreferrer">
                      {c.label}
                    </a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  <em> {c.detail}</em>
                </li>
              ))}
            </ul>
          </div>
          <p className="credits-closing">{CREDITS_CLOSING}</p>
          <a className="credits-repo" href={CREDITS_REPO} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </Html>
    </group>
  )
}
