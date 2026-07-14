import { atom } from 'nanostores'

// The video embed currently open in the centered screen-space overlay, or null.
// Used on phones, where a live iframe inside the 3D-transformed flyby card
// won't render on iOS Safari / isn't tappable on Android — so the phone card
// shows a button that opens the video here as a plain flat DOM overlay instead.
export interface VideoModalData {
  src: string
  title: string
}

export const openVideoAtom = atom<VideoModalData | null>(null)
