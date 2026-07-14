import { atom } from 'nanostores'
import type { Project } from '../data/projects'

// The belt project whose full blurb modal is currently open (centered DOM
// overlay), or null. Set by clicking an asteroid, cleared by the X.
export const openBeltProjectAtom = atom<Project | null>(null)
