import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { pointer } from '../../stores/sceneFx'

// Tilts a world-space card a few degrees toward the cursor. Pointer stays at
// 0 on touch devices and under reduced motion, so the card just sits flat.
export function useCardTilt(ref: RefObject<HTMLElement | null>, maxDeg = 5) {
  useFrame(() => {
    const el = ref.current
    if (!el) return
    const rx = -pointer.y * maxDeg * 0.6
    const ry = pointer.x * maxDeg
    el.style.transform =
      Math.abs(rx) + Math.abs(ry) < 0.01 ? '' : `perspective(1600px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
  })
}
