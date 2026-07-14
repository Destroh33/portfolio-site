import { atom } from 'nanostores'
import { scrollProgressAtom } from './scrollProgress'
import { waypointsAtom, scrollTToCurveU } from './flybyLayout'

// Intro duration is measured in curve-space (u), not raw scroll pixels or a
// fraction of the whole document — the document is dominated by five 160vh
// flagship spacers, so "5% of total scroll" was actually way more scrolling
// than intended before the intro finished. Tying it to u instead guarantees
// the ship has traveled a real, consistent distance forward (so the intro
// camera flyover has somewhere meaningful to end up) regardless of how tall
// any given DOM section is.
export const U_INTRO_END = 0.1

// 0 = establishing shot behind the asteroid, 1 = fully handed off to normal
// ship chase-cam. Drives the camera flyover, the hero surface-card fade, the
// ship fade-in, and the scroll-cue fade.
export const introBlendAtom = atom(0)

function smoothstep(x: number): number {
  const c = Math.min(Math.max(x, 0), 1)
  return c * c * (3 - 2 * c)
}

function update() {
  const waypoints = waypointsAtom.get()
  const t = scrollProgressAtom.get()
  const u = scrollTToCurveU(waypoints, t)
  introBlendAtom.set(smoothstep(u / U_INTRO_END))
}

export function initIntroLayout() {
  update()
  scrollProgressAtom.subscribe(update)
  waypointsAtom.subscribe(update)
}
