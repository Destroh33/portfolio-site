import { useRef, useEffect, useState } from 'react'

const HI_KEY = 'portfolio_arena_hi'
const GW = 560, GH = 380
const PLAYER_R = 9
const PLAYER_SPEED = 210

export default function MiniGame({ onClose }) {
  const canvasRef = useRef(null)
  const [score,    setScore]    = useState(0)
  const [lives,    setLives]    = useState(3)
  const [hiScore,  setHiScore]  = useState(() => parseInt(localStorage.getItem(HI_KEY) || '0', 10))
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width  = GW
    canvas.height = GH
    const ctx = canvas.getContext('2d')

    const state = {
      player:      { x: GW / 2, y: GH / 2, vx: 0, vy: 0 },
      enemies:     [],
      keys:        new Set(),
      lives:       3,
      score:       0,
      scoreTimer:  0,
      spawnTimer:  0,
      invTimer:    0,    // invincibility after hit
      gameOver:    false,
    }

    function spawnEnemy() {
      const side = (Math.random() * 4) | 0
      const x = side === 0 ? -12 : side === 1 ? GW + 12 : Math.random() * GW
      const y = side < 2   ? Math.random() * GH : (side === 2 ? -12 : GH + 12)
      state.enemies.push({ x, y, r: 9 + (Math.random() * 4 | 0) })
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return }
      state.keys.add(e.code)
      e.preventDefault()
    }
    function onKeyUp(e) { state.keys.delete(e.code) }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)

    let rafId, last = performance.now()

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (!state.gameOver) {
        // Movement
        const { keys, player } = state
        player.vx = 0; player.vy = 0
        if (keys.has('ArrowLeft')  || keys.has('KeyA')) player.vx = -PLAYER_SPEED
        if (keys.has('ArrowRight') || keys.has('KeyD')) player.vx =  PLAYER_SPEED
        if (keys.has('ArrowUp')    || keys.has('KeyW')) player.vy = -PLAYER_SPEED
        if (keys.has('ArrowDown')  || keys.has('KeyS')) player.vy =  PLAYER_SPEED

        if (player.vx && player.vy) { player.vx *= 0.707; player.vy *= 0.707 }

        player.x = Math.max(PLAYER_R, Math.min(GW - PLAYER_R, player.x + player.vx * dt))
        player.y = Math.max(PLAYER_R, Math.min(GH - PLAYER_R, player.y + player.vy * dt))

        // Spawn
        state.spawnTimer -= dt
        if (state.spawnTimer <= 0) {
          spawnEnemy()
          state.spawnTimer = Math.max(0.35, 1.6 - state.score * 0.012)
        }

        // Enemy update + collision
        const spd = 85 + state.score * 0.6
        for (const en of state.enemies) {
          const dx = player.x - en.x
          const dy = player.y - en.y
          const dist = Math.hypot(dx, dy) || 0.001
          en.x += (dx / dist) * spd * dt
          en.y += (dy / dist) * spd * dt

          if (state.invTimer <= 0 && dist < PLAYER_R + en.r) {
            state.lives--
            state.invTimer = 2.2
            setLives(state.lives)
            if (state.lives <= 0) {
              state.gameOver = true
              setGameOver(true)
              const hi = Math.max(state.score, parseInt(localStorage.getItem(HI_KEY) || '0', 10))
              localStorage.setItem(HI_KEY, String(hi))
              setHiScore(hi)
            }
          }
        }

        if (state.invTimer > 0) state.invTimer -= dt

        // Score
        state.scoreTimer -= dt
        if (state.scoreTimer <= 0) { state.score++; state.scoreTimer = 1; setScore(state.score) }
      }

      // ── Draw ──
      ctx.fillStyle = '#0a0618'
      ctx.fillRect(0, 0, GW, GH)

      // Grid
      ctx.strokeStyle = 'rgba(92,33,182,0.15)'
      ctx.lineWidth = 1
      for (let gx = 0; gx < GW; gx += 36) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GH); ctx.stroke() }
      for (let gy = 0; gy < GH; gy += 36) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GW, gy); ctx.stroke() }

      // Enemies
      for (const en of state.enemies) {
        ctx.beginPath(); ctx.arc(en.x, en.y, en.r + 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(220,40,40,0.2)'; ctx.fill()
        ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2)
        ctx.fillStyle = '#dc2626'; ctx.fill()
        // tiny eyes
        ctx.fillStyle = '#fff'
        ctx.fillRect(en.x - 3, en.y - 3, 2, 2)
        ctx.fillRect(en.x + 1, en.y - 3, 2, 2)
      }

      // Player wizard (mini)
      const { player } = state
      const blink = state.invTimer > 0 && Math.sin(state.invTimer * 18) > 0
      if (!blink) {
        ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER_R + 7, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(139,92,246,0.28)'; ctx.fill()
        ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2)
        ctx.fillStyle = '#a78bfa'; ctx.fill()
        // mini hat
        ctx.fillStyle = '#4c1d95'
        ctx.fillRect(player.x - 6, player.y - PLAYER_R - 9, 12, 9)
        ctx.fillStyle = '#3b0764'
        ctx.fillRect(player.x - 4, player.y - PLAYER_R - 14, 8, 5)
        ctx.fillStyle = '#fcd34d'
        ctx.fillRect(player.x - 1, player.y - PLAYER_R - 11, 3, 3)
      }

      // Game over overlay
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, 0, GW, GH)
        ctx.font = '18px "Press Start 2P", monospace'
        ctx.textAlign = 'center'; ctx.fillStyle = '#f0c040'
        ctx.fillText('GAME OVER', GW / 2, GH / 2 - 32)
        ctx.font = '9px "Press Start 2P", monospace'
        ctx.fillStyle = '#e8dcc8'
        ctx.fillText(`SCORE: ${state.score}`, GW / 2, GH / 2 + 8)
        ctx.fillText(`BEST:  ${Math.max(state.score, parseInt(localStorage.getItem(HI_KEY) || '0', 10))}`, GW / 2, GH / 2 + 30)
        ctx.font = '7px "Press Start 2P", monospace'
        ctx.fillStyle = '#9a8c78'
        ctx.fillText('ESC TO EXIT', GW / 2, GH / 2 + 64)
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
    }
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        fontFamily: '"Press Start 2P", monospace',
        color: '#f0c040', fontSize: 16, letterSpacing: '0.1em',
      }}>
        ⚔ ARENA MODE ⚔
      </div>

      <canvas
        ref={canvasRef}
        style={{
          border: '3px solid #f0c040',
          boxShadow: '0 0 0 3px #050310, 0 0 0 6px #8b6914, 0 0 40px rgba(180,80,255,0.2)',
          maxWidth: '95vw', maxHeight: '55vh',
          imageRendering: 'pixelated',
        }}
      />

      <div style={{
        display: 'flex', gap: 24, alignItems: 'center',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 9, color: '#e8dcc8',
      }}>
        <span style={{ color: '#ef4444' }}>
          {'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, 3 - lives))}
        </span>
        <span>SCORE: {score}</span>
        <span style={{ color: '#fcd34d' }}>BEST: {hiScore}</span>
        <button
          onClick={onClose}
          style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 7,
            padding: '7px 14px', background: 'transparent',
            border: '2px solid #f0c040', color: '#f0c040', cursor: 'pointer',
          }}
        >
          EXIT [ESC]
        </button>
      </div>
    </div>
  )
}
