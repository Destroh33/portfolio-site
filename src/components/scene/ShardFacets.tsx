import { useMemo, type CSSProperties } from 'react'
import { shardFacets } from '../shard'

export default function ShardFacets({ seed }: { seed: number }) {
  const facets = useMemo(() => shardFacets(seed), [seed])
  return (
    <svg className="shard-facets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {facets.map((f, i) => (
        <polygon key={i} points={f.points} style={{ '--i': i, '--o': f.opacity } as CSSProperties} />
      ))}
    </svg>
  )
}
