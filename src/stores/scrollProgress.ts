import { atom } from 'nanostores'

// SMOOTHED 0-1 scroll fraction — the value everything (camera, ship, intro,
// triggers) consumes. Raw scroll is only the TARGET: each frame the smoothed
// value eases toward it exponentially, so the camera carries velocity — it
// keeps gliding after the user stops scrolling and settles in ~1s instead of
// hard-stopping with the wheel. (Same feel as inertial-scroll sites; we keep
// native scrolling and smooth on the consuming side rather than hijacking.)
// Read imperatively via .get() in hot paths (e.g. useFrame).
export const scrollProgressAtom = atom(0)

// Per-second remaining fraction of the gap toward the scroll target — the
// glide-length knob. 0.002 settled in ~1s (felt like fast decay); 0.25 keeps
// ~25% of the remaining gap after each second, so the camera coasts for
// ~3-3.5s after you stop scrolling before easing to rest.
const DAMP = 0.25

let raw = 0
let smooth = 0
let lastTime = 0

function readRaw() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  // Seamless loop: at the very bottom the camera is on the closed path's
  // return leg at u=1, which is geometrically identical to the Start at u=0 —
  // so wrapping scroll to the top is a continuous cut. Snap BOTH raw and
  // smooth so the glide doesn't rewind backwards through the whole journey.
  if (max > 0 && window.scrollY >= max - 2) {
    window.scrollTo(0, 0)
    raw = 0
    smooth = 0
    scrollProgressAtom.set(0)
    return
  }
  raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

function tick(now: number) {
  requestAnimationFrame(tick)
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0
  lastTime = now
  readRaw()
  const k = 1 - Math.pow(DAMP, dt)
  smooth += (raw - smooth) * k
  if (Math.abs(raw - smooth) < 1e-6) smooth = raw
  scrollProgressAtom.set(smooth)
}

export function initScrollProgress() {
  readRaw()
  smooth = raw
  scrollProgressAtom.set(smooth)
  requestAnimationFrame(tick)
}
