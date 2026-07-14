import { useStore } from '@nanostores/react'
import { planetFramesAtom } from '../../stores/flybyLayout'
import { FLAGSHIPS } from '../../data/projects'
import ProjectPlanet from './ProjectPlanet'
import type { PlanetStyle } from './planetSurface'

// A distinct THEMED look per project (modes in planetSurface.ts):
const STYLES: Record<string, PlanetStyle> = {
  'broken-peaces': { base: '#35322d', accent: '#ff7a1a', mode: 5, glow: '#ff8c42' }, // volcanic: dark rock + lava fractures
  'prime-weaver': { base: '#1a1032', accent: '#ff4ad0', mode: 6, glow: '#c86aff' }, // arcane ley-lines, flowing energy
  motomania: { base: '#2a1408', accent: '#ff9a3c', mode: 7, glow: '#ff8a2a' }, // hot racing world, orange speed streaks
  'vr-lab': { base: '#0c1c26', accent: '#4de8ff', mode: 8, glow: '#4de8ff' }, // pulsing neural-node network
  'ai-guide': { base: '#243a44', accent: '#8fe6d0', mode: 9, glow: '#7fd8f0' }, // mellow map/atlas, teal grid
}

const FALLBACK: PlanetStyle = { base: '#334', accent: '#88a', mode: 1, glow: '#99c' }

export default function ProjectPlanets() {
  const frames = useStore(planetFramesAtom)
  const framesById = Object.fromEntries(frames.map((f) => [f.id, f]))

  return (
    <>
      {FLAGSHIPS.map((project) => {
        const frame = framesById[project.id]
        if (!frame) return null
        return <ProjectPlanet key={project.id} id={project.id} position={frame.position} style={STYLES[project.id] ?? FALLBACK} />
      })}
    </>
  )
}
