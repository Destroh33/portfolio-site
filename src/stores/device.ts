import { atom } from 'nanostores'

export const reducedMotionAtom = atom(false)
// True on phone-width viewports. Used by 3D-anchored <Html> cards (which can't
// use viewport @media queries — their inner DOM is a fixed-size world plane) to
// switch to a stacked single-column layout. Kept live via a matchMedia listener.
export const narrowViewportAtom = atom(false)
// True on phone-class devices in EITHER orientation (portrait or landscape),
// unlike narrowViewportAtom which is width-only and flips to false when a phone
// is rotated to landscape (often > 640px wide). Used for layout choices that
// should follow the device, not the current width — e.g. the belt's vertical
// zigzag + filler rocks. Driven by coarse pointer + a small max screen edge.
export const phoneLayoutAtom = atom(false)
// Device perf tier, decided once at load from cheap synchronous signals (see
// initDeviceStores). SceneCanvas reads this to gate Bloom postprocessing on
// low-tier devices. It's a one-time decision on purpose — a live FPS monitor
// was tried and removed because its quality-probing flip-flopped and flickered.
export const perfTierAtom = atom<'high' | 'low'>('high')

export function initDeviceStores() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionAtom.set(mq.matches)
  mq.addEventListener('change', (e) => reducedMotionAtom.set(e.matches))

  const narrow = window.matchMedia('(max-width: 640px)')
  narrowViewportAtom.set(narrow.matches)
  narrow.addEventListener('change', (e) => narrowViewportAtom.set(e.matches))

  // Phone-class in any orientation: a coarse (touch) pointer AND a small
  // shorter-screen-edge. `min-width` on the SMALLER dimension stays stable
  // across rotation, so a phone reads as phone in portrait and landscape while
  // tablets/desktops don't. Re-evaluated on orientation change.
  const evalPhone = () => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const shortEdge = Math.min(window.screen.width, window.screen.height)
    phoneLayoutAtom.set(coarse && shortEdge <= 820)
  }
  evalPhone()
  window.matchMedia('(orientation: portrait)').addEventListener('change', evalPhone)

  const cores = navigator.hardwareConcurrency || 4
  // deviceMemory is Chrome-only (undefined elsewhere); coarse pointer is a
  // reasonable proxy for phone/tablet-class GPUs on browsers without it.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const lowByCores = cores <= 4
  const lowByMemory = memory !== undefined && memory <= 4
  perfTierAtom.set(lowByCores || lowByMemory || coarsePointer ? 'low' : 'high')
}
