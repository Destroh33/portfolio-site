import { useState, useEffect } from 'react'

export default function HUD() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      bottom: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: 'rgba(42,26,10,0.5)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.2s ease',
      textAlign: 'center',
      lineHeight: 2,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 10,
      userSelect: 'none',
    }}>
      WASD / ← → MOVE &nbsp;·&nbsp; SPACE JUMP &nbsp;·&nbsp; E INTERACT &nbsp;·&nbsp; CLICK TO WALK
    </div>
  )
}
