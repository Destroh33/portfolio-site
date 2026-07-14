import { atom } from 'nanostores'

// Whether the ambient audio is currently on (user has enabled + it's playing).
export const audioOnAtom = atom(false)
