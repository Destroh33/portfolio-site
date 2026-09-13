import { atom } from 'nanostores'
import { reducedMotionAtom } from './device'

// Shared state for the "feel" layer: hyperspace warp, camera shake, and mouse
// parallax. Hot values are plain module state read imperatively in useFrame.

// 0 = normal cruise, 1 = full hyperspace. Written by CameraRig from real
// flight speed; read by SpaceDust, the DOM speed lines + tunnel overlay, audio.
export const warpAtom = atom(0)

// The ship's position on screen (0-1, origin top-left), written by CameraRig
// each frame. The 2D warp lines radiate from here so they track the ship
// through camera lag, banking and parallax instead of the screen center.
export const warpOrigin = { x: 0.5, y: 0.5 }

// ── Camera shake ───────────────────────────────────────────────────────────
// Impulse model: kick() sets a strength that decays exponentially; CameraRig
// consumes it each frame as a small positional wobble.
let shake = 0

export function kickShake(amount: number) {
  if (reducedMotionAtom.get()) return
  shake = Math.max(shake, amount)
}

export function stepShake(dt: number): number {
  shake *= Math.pow(0.004, dt) // gone in ~0.6s
  if (shake < 0.001) shake = 0
  return shake
}

// ── Mouse parallax ─────────────────────────────────────────────────────────
// Eased pointer in -1..1 (x right, y down). Stays at 0 on touch devices and
// under reduced motion, so every consumer can apply it unconditionally.
export const pointer = { x: 0, y: 0 }
let targetX = 0
let targetY = 0
let lastTime = 0

function tick(now: number) {
  requestAnimationFrame(tick)
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0
  lastTime = now
  const k = 1 - Math.pow(0.02, dt) // τ ≈ 0.25s
  pointer.x += (targetX - pointer.x) * k
  pointer.y += (targetY - pointer.y) * k
}

export function initSceneFx() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!finePointer) return
  window.addEventListener(
    'pointermove',
    (e) => {
      if (reducedMotionAtom.get()) {
        targetX = targetY = 0
        return
      }
      targetX = (e.clientX / window.innerWidth) * 2 - 1
      targetY = (e.clientY / window.innerHeight) * 2 - 1
    },
    { passive: true },
  )
  // Drift back to center when the cursor leaves the window.
  document.documentElement.addEventListener('pointerleave', () => {
    targetX = targetY = 0
  })
  requestAnimationFrame(tick)
}
