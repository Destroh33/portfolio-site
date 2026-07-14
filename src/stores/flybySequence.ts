import { atom } from 'nanostores'
import { FLAGSHIPS } from '../data/projects'
import { planetFramesAtom } from './flybyLayout'
import { scrollProgressAtom } from './scrollProgress'

// ─────────────────────────────────────────────────────────────────────────
// Time-based flyby state machine.
//
// The camera transition is NO LONGER welded 1:1 to scroll position. Instead,
// scroll only TRIGGERS transitions; once triggered, a fixed-duration clock
// plays the fly-in / fly-out at an authored pace, and the page is scroll-locked
// while it plays. This is the only way to guarantee a slow cinematic pace
// regardless of how fast the user scrolls.
//
// State per the locked interaction model:
//   chasing  -> (scroll down past a planet's trigger) -> flyIn (scroll LOCKED)
//   flyIn    -> (clock reaches 1) -> held (scroll unlocked)
//   held     -> (scroll down) -> flyOut (scroll LOCKED) ; (scroll up) -> flyIn reversed
//   flyOut   -> (clock reaches 0) -> chasing
// ─────────────────────────────────────────────────────────────────────────

export type FlybyState = 'chasing' | 'flyIn' | 'held' | 'flyOut'

export const FLY_DURATION = 2.6 // seconds for a full fly-in (and fly-out)

interface SequenceState {
  state: FlybyState
  activeId: string | null
  // 0 = full chase-cam, 1 = fully framed on the planet. Eased each frame.
  blend: number
}

export const flybySequenceAtom = atom<SequenceState>({ state: 'chasing', activeId: null, blend: 0 })
// True while a fly-in/fly-out is playing — the page scroll listener honors this
// to lock scrolling.
export const scrollLockedAtom = atom(false)

// Each flagship's trigger is the scrollProgress value at which the ship is
// beside that planet — reuse the DOM-measured waypoint t-values.
let triggers: { id: string; t: number }[] = []
const STOP_IDS = new Set([...FLAGSHIPS.map((p) => p.id), 'belt'])
export function setFlybyTriggers(next: { id: string; t: number }[]) {
  triggers = next.filter((x) => STOP_IDS.has(x.id)).sort((a, b) => a.t - b.t)
}

// Planets already "consumed" (flown past) so scrolling back up re-arms them
// but scrolling forward doesn't re-trigger the one we're leaving.
const TRIGGER_HALF_WINDOW = 0.012

let lastTime = 0
let lockedScrollY = 0

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

// Use the SMOOTHED scroll progress (see scrollProgress.ts) so cutscenes
// trigger when the gliding camera actually arrives at a planet, not when the
// raw scrollbar first crosses it mid-glide.
function currentScrollProgress(): number {
  return scrollProgressAtom.get()
}

// Find a planet whose trigger the current scroll position is sitting within.
function planetAtScroll(t: number): string | null {
  for (const trig of triggers) {
    if (Math.abs(t - trig.t) <= TRIGGER_HALF_WINDOW) return trig.id
  }
  return null
}

function setLock(locked: boolean, targetY?: number) {
  if (scrollLockedAtom.get() === locked) return
  scrollLockedAtom.set(locked)
  if (locked) {
    // Pin at the trigger's exact scroll position when provided — on a fast
    // fling the raw scrollbar can already be far past the trigger by the time
    // the gliding (smoothed) camera arrives, and locking at that raw position
    // would instantly end the hold after the fly-in.
    lockedScrollY = targetY ?? window.scrollY
    if (targetY != null) window.scrollTo(0, targetY)
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// While locked, pin the scroll position (guards against momentum/touch).
function onScrollWhileLocked() {
  if (scrollLockedAtom.get()) window.scrollTo(0, lockedScrollY)
}

function tick(now: number) {
  requestAnimationFrame(tick)
  const dt = lastTime ? (now - lastTime) / 1000 : 0
  lastTime = now

  const seq = flybySequenceAtom.get()
  const step = dt / FLY_DURATION
  const t = currentScrollProgress()

  switch (seq.state) {
    case 'chasing': {
      const id = planetAtScroll(t)
      if (id) {
        const trig = triggers.find((x) => x.id === id)
        const max = document.documentElement.scrollHeight - window.innerHeight
        setLock(true, trig && max > 0 ? trig.t * max : undefined)
        flybySequenceAtom.set({ state: 'flyIn', activeId: id, blend: 0 })
      }
      break
    }
    case 'flyIn': {
      const blend = Math.min(1, seq.blend + step)
      if (blend >= 1) {
        setLock(false)
        flybySequenceAtom.set({ state: 'held', activeId: seq.activeId, blend: 1 })
      } else {
        flybySequenceAtom.set({ ...seq, blend })
      }
      break
    }
    case 'held': {
      // Leave when the user scrolls clear of the trigger window.
      const id = seq.activeId
      const trig = triggers.find((x) => x.id === id)
      if (trig && Math.abs(t - trig.t) > TRIGGER_HALF_WINDOW) {
        setLock(true)
        flybySequenceAtom.set({ state: 'flyOut', activeId: id, blend: 1 })
      }
      break
    }
    case 'flyOut': {
      const blend = Math.max(0, seq.blend - step)
      if (blend <= 0) {
        setLock(false)
        flybySequenceAtom.set({ state: 'chasing', activeId: null, blend: 0 })
      } else {
        flybySequenceAtom.set({ ...seq, blend })
      }
      break
    }
  }
}

// Eased blend for the camera to consume (imperative read in useFrame).
export function easedFlybyBlend(): number {
  return easeInOut(flybySequenceAtom.get().blend)
}

export function activeFlybyFrame() {
  const { activeId } = flybySequenceAtom.get()
  if (!activeId) return null
  return planetFramesAtom.get().find((f) => f.id === activeId) ?? null
}

export function initFlybySequence() {
  window.addEventListener('scroll', onScrollWhileLocked, { passive: true })
  requestAnimationFrame(tick)
}
