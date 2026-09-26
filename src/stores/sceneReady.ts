import { atom } from 'nanostores'

// True once the 3D canvas has actually painted frames (set from inside the r3f
// render loop — see SceneCanvas's <SceneReadySignal>). LoadingVeil waits on
// this instead of window.load: `load` waits for every subresource on the page
// (images, fonts, any stray large asset), which has nothing to do with whether
// the scene is ready to look at, and reliably pinned the veil to its timeout
// cap on slow connections while the real content sat finished behind it.
export const sceneReadyAtom = atom(false)
