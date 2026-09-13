import { flybySequenceAtom, nextStopAfter, scrollLockedAtom } from './flybySequence'
import { scrollProgressAtom } from './scrollProgress'
import { introBlendAtom } from './introLayout'
import { waypointsAtom } from './flybyLayout'

// Wheel acceleration for open space. A steady forward scroll builds momentum,
// and each wheel tick then moves the page up to MAX_BOOST× its normal
// distance, so long flights between planets take far fewer flicks (and the
// resulting speed is what kicks in the hyperspace look). A pause resets it.
//
// It never breaks the stops: the boost only applies while cruising
// ('chasing'), fades to 1× as the next stop gets close, and the extra distance
// is capped at that stop's scroll position. The native scroll distance itself
// is never altered. Touch and keyboard scrolling are untouched.

const MAX_BOOST = 5
// Momentum gained per wheel event while scrolling continuously (~40 events
// to full on a notched mouse, fewer on a trackpad's dense stream).
const MOMENTUM_STEP = 0.035
// A gap longer than this between wheel events counts as a new scroll.
const RESET_GAP_MS = 350
// Boost fades out over this much scroll-t before the next stop.
const TAPER_T = 0.05

let momentum = 0
let lastWheel = 0

// Where boosting must ease off: the next flyby stop, the credits station
// (a drift-by beat with no lock, easy to rocket past), and the page end
// (reaching it loops back to Start, so it shouldn't be slammed into).
function nextBoostStop(t: number): number {
  const stops = [1 - TAPER_T * 0.1]
  const flyby = nextStopAfter(t)
  if (flyby != null) stops.push(flyby)
  const credits = waypointsAtom.get().find((w) => w.id === 'credits')
  if (credits && credits.t > t + 0.012) stops.push(credits.t)
  return Math.min(...stops)
}

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) return // pinch-zoom
  if (flybySequenceAtom.get().state !== 'chasing' || scrollLockedAtom.get()) {
    momentum = 0
    return
  }
  if (e.deltaY <= 0) {
    momentum = 0
    return
  }

  const now = performance.now()
  momentum = now - lastWheel > RESET_GAP_MS ? 0 : Math.min(1, momentum + MOMENTUM_STEP)
  lastWheel = now

  const max = document.documentElement.scrollHeight - window.innerHeight
  if (max <= 0) return
  const rawT = window.scrollY / max
  const next = nextBoostStop(scrollProgressAtom.get())
  const taper = Math.min(1, Math.max(0, (next - rawT) / TAPER_T))
  // Ramps in with the intro so the opening flyover keeps its pace.
  const boost = 1 + (MAX_BOOST - 1) * momentum * taper * introBlendAtom.get()
  if (boost < 1.05) return

  const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
  let target = window.scrollY + px * boost
  // Extra distance never carries past the next stop.
  target = Math.min(target, Math.max(window.scrollY + px, next * max))
  e.preventDefault()
  window.scrollTo(0, target)
}

export function initScrollBoost() {
  window.addEventListener('wheel', onWheel, { passive: false })
}
