import { atom } from 'nanostores'

// Ship motion state, written by CameraRig each frame (it owns the flight
// math) and read imperatively by Ship.tsx for thruster visuals.

// Signed path speed in curve-u per second (positive = forward along the path).
export const shipSpeedAtom = atom(0)
// |speed| / SPEED_REF clamped 0-1 — drives flame length/brightness.
export const shipSpeedNormAtom = atom(0)
// 0 = cruising (nose along path), 1 = full idle hover (nose up, bobbing).
export const hoverAmountAtom = atom(1)

// du/dt that counts as "full speed" for the flame (a healthy scroll glide).
export const SPEED_REF = 0.02
