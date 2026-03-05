import { useState, useEffect, useRef } from 'react'

export default function HUD({ zone }) {
  const [hintsVisible, setHintsVisible] = useState(true)
  const [zoneLabel,    setZoneLabel]    = useState('')
  const [zoneVisible,  setZoneVisible]  = useState(false)
  const prevZone = useRef(null)

  // Fade hints after 10 s
  useEffect(() => {
    const t = setTimeout(() => setHintsVisible(false), 10000)
    return () => clearTimeout(t)
  }, [])

  // Show zone label when zone changes
  useEffect(() => {
    if (zone && zone !== prevZone.current) {
      prevZone.current = zone
      setZoneLabel(zone)
      setZoneVisible(true)
      const t = setTimeout(() => setZoneVisible(false), 2800)
      return () => clearTimeout(t)
    }
  }, [zone])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none', zIndex: 10,
      fontFamily: '"Press Start 2P", monospace',
    }}>

      {/* Zone name banner */}
      <div style={{
        position: 'absolute',
        top: 22, left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '11px',
        color: '#2a1a0a',
        textShadow: '0 1px 0 rgba(255,255,255,0.6)',
        opacity: zoneVisible ? 1 : 0,
        transition: 'opacity 0.55s ease',
        letterSpacing: '0.12em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        — {zoneLabel} —
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 18, left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '6px',
        color: 'rgba(42,26,10,0.55)',
        opacity: hintsVisible ? 1 : 0,
        transition: 'opacity 1.2s ease',
        textAlign: 'center',
        lineHeight: 2,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        WASD / ← → MOVE &nbsp;·&nbsp; SPACE JUMP &nbsp;·&nbsp; E INTERACT &nbsp;·&nbsp; CLICK TO WALK
      </div>
    </div>
  )
}
