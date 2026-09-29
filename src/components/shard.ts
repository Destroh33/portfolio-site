// Shared "Shard" panel pieces (low-poly crystal UI). Used by the React world-
// space cards and the plain-DOM belt modal, so kept framework-free.

export interface Facet {
  points: string
  opacity: number
}

// Deterministic flat-shaded triangles clustered at the panel's top-right and
// bottom-left corners, in a 0-100 viewBox (stretched to the panel).
export function shardFacets(seed: number): Facet[] {
  let s = seed * 7 + 11
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const clusters: [number, number, number][] = [
    [92, 8, 22],
    [8, 92, 18],
    [70, 96, 10],
  ]
  const out: Facet[] = []
  for (const [cx, cy, size] of clusters) {
    for (let k = 0; k < 6; k++) {
      const pts = [0, 1, 2].map(() => `${clamp(cx + (rand() - 0.5) * size * 2)},${clamp(cy + (rand() - 0.5) * size * 2)}`)
      out.push({ points: pts.join(' '), opacity: Number((0.05 + rand() * 0.2).toFixed(2)) })
    }
  }
  return out
}

export function shardFacetsSvg(seed: number): string {
  const polys = shardFacets(seed)
    .map((f, i) => `<polygon style="--i:${i};--o:${f.opacity}" points="${f.points}"/>`)
    .join('')
  return `<svg class="shard-facets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${polys}</svg>`
}

// Tint per flagship, mirroring each planet's atmosphere glow in ProjectPlanets.
export const PROJECT_TINT: Record<string, string> = {
  'broken-peaces': '#ff8c42',
  'prime-weaver': '#c86aff',
  motomania: '#ff8a2a',
  mkultra: '#3dff7a',
  'ai-guide': '#7fd8f0',
}

// Home planet glow (IntroPlanet) for the hero card.
export const HOME_TINT = '#6fb7ff'
