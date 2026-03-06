import { useRef, useEffect } from 'react'
import { PROJECTS, ART_PIECES } from '../data/world'

const B = import.meta.env.BASE_URL

// ─── Physics constants ─────────────────────────────────────────────────────
const GRAVITY       = 1800
const MAX_SPEED     = 300
const ACCEL_GND     = 1500
const ACCEL_AIR     = 380
const FRICTION_GND  = 1500
const FRICTION_RAIL = 220
const JUMP_BASE     = -700
const JUMP_BONUS    = 130
const INTERACT_DIST = 72
const PW = 20, PH = 52

// ─── Sprite constants ──────────────────────────────────────────────────────
const SRC_W = 32, SRC_H = 32
const DST_SCALE = 2.5
const DST_W = SRC_W * DST_SCALE
const DST_H = SRC_H * DST_SCALE
const ANIM_PERIOD = 0.3

// ─── Layout constants ──────────────────────────────────────────────────────
const PED_H_IMG  = 90    // pedestal image display height
const PED_W_IMG  = 90    // pedestal image display width
const ICON_SIZE  = 64    // 8×8 at PS=8
const FRAME_W    = 110   // art thumbnail frame total width (incl border)
const FRAME_H    = 86    // art thumbnail frame total height
const ITEM_GAP   = 3    // px gap between pedestal top and item bottom at rest
const BOB_AMP    = 3    // bob amplitude (BOB_AMP ≤ ITEM_GAP ensures no pedestal overlap)

// ─── Room config ───────────────────────────────────────────────────────────
const ROOM_DOORS = {
  home:     { right: 'projects' },
  projects: { left:  'home',    right: 'art' },
  art:      { left:  'projects' },
}
const DOOR_W = 56

// ─── Project icon image sources ────────────────────────────────────────────
const ICON_SRCS = {
  spider: `${B}images/primeweaver.png`,
  xwing:  `${B}images/rebelstarsicon.png`,
  vr:     `${B}images/vrheadset.png`,
  pin:    `${B}images/tourguide.png`,
  gun:    `${B}images/oitcicon.png`,
  slime:  `${B}images/slime.png`,
}

// ─── Skill icons (ordered by importance, 4×3 grid) ────────────────────────
const SKILL_ICONS = [
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/unrealengine/unrealengine-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/unity/unity-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/blender/blender-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg',
  'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg',
]

// ─── Home links ────────────────────────────────────────────────────────────
const HOME_LINKS = [
  { label: 'GITHUB',   url: 'https://github.com/Destroh33',                                  color: '#2a1a0a' },
  { label: 'LINKEDIN', url: 'https://www.linkedin.com/in/krishna-tholudur-5b90a5330/',       color: '#5a2d8a' },
  { label: 'ITCH.IO',  url: 'https://destroh3.itch.io/',                                     color: '#5c9f3a' },
  { label: 'RESUME',   url: '/KrishnaTholudurResume.pdf',                                    color: '#2a1a0a' },
]

// ─── Skatepark ─────────────────────────────────────────────────────────────
const SKATEPARK_MULT = 2.4

// ─── Helpers ──────────────────────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ')
  let line = '', outY = y
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' '
    if (ctx.measureText(test).width > maxW && i > 0) {
      ctx.fillText(line.trim(), x, outY)
      line = words[i] + ' '; outY += lineH
    } else { line = test }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, outY)
  return outY
}

// ─── Draw: background ─────────────────────────────────────────────────────
function drawBackground(ctx, lW, lH) {
  ctx.fillStyle = '#c4bdb4'
  ctx.fillRect(0, 0, lW, lH)
  const BW = 40, BH = 20
  ctx.fillStyle = '#ddd6cc'
  for (let row = 0; row <= Math.ceil(lH / BH); row++) {
    const off = (row % 2) * (BW / 2)
    for (let col = -1; col <= Math.ceil(lW / BW); col++) {
      ctx.fillRect(col * BW + off + 1, row * BH + 1, BW - 2, BH - 2)
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  for (let row = 0; row <= Math.ceil(lH / BH); row++) {
    const off = (row % 2) * (BW / 2)
    for (let col = -1; col <= Math.ceil(lW / BW); col++) {
      ctx.fillRect(col * BW + off + 1, row * BH + 1, BW - 2, 3)
    }
  }
}

// ─── Draw: ground (chunky pixel-art tiles, PX=3 matches pedestal/skater scale) ──
function drawGround(ctx, groundY, lW, camX) {
  const PX = 3   // 1 art-pixel = 3 screen-pixels
  const TW = 48  // tile width  (16 art-px)
  const TH = 15  // tile row height body (5 art-px)

  // Base fill (below tiles)
  ctx.fillStyle = '#706c68'
  ctx.fillRect(0, groundY, lW, 80)

  const off1 = Math.round(-(camX % TW))
  const off2 = Math.round(-((camX + TW / 2) % TW))  // half-tile stagger for row 2

  // Row 2 tile fills (staggered)
  ctx.fillStyle = '#888480'
  for (let x = off2 - TW; x < lW + TW; x += TW)
    ctx.fillRect(Math.round(x) + PX, groundY + PX + TH + PX, TW - PX, TH)

  // Row 1 tile fills
  ctx.fillStyle = '#a09890'
  for (let x = off1 - TW; x < lW + TW; x += TW)
    ctx.fillRect(Math.round(x) + PX, groundY + PX, TW - PX, TH)

  // Row 1 highlight strip (top 1 art-px of each tile)
  ctx.fillStyle = '#c4bdb4'
  for (let x = off1 - TW; x < lW + TW; x += TW)
    ctx.fillRect(Math.round(x) + PX, groundY + PX, TW - PX, PX)

  // All borders in black
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(0, groundY, lW, PX)                          // top edge
  ctx.fillRect(0, groundY + PX + TH, lW, PX)               // row 1/2 shared border
  ctx.fillRect(0, groundY + PX + TH + PX + TH, lW, PX)     // row 2 bottom
  // Row 1 vertical seams
  for (let x = off1 - TW; x < lW + TW; x += TW)
    ctx.fillRect(Math.round(x), groundY, PX, PX + TH + PX)
  // Row 2 vertical seams (from shared border)
  for (let x = off2 - TW; x < lW + TW; x += TW)
    ctx.fillRect(Math.round(x), groundY + PX + TH, PX, PX + TH + PX)
}

// ─── Draw: door ───────────────────────────────────────────────────────────
function drawDoor(ctx, side, groundY, lW, targetRoom, overrideX) {
  const DW = DOOR_W, DH = 110
  const doorX = overrideX !== undefined ? overrideX : (side === 'left' ? 0 : lW - DW)
  const doorY = groundY - DH
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(doorX, doorY - 6, DW, DH + 6)
  ctx.fillStyle = '#7a5534'; ctx.fillRect(doorX + 4, doorY, DW - 8, DH - 4)
  ctx.fillStyle = '#8a6544'
  ctx.fillRect(doorX + 10, doorY + 8,  DW - 20, 38)
  ctx.fillRect(doorX + 10, doorY + 54, DW - 20, 38)
  const knobX = side === 'left' ? doorX + DW - 12 : doorX + 12
  ctx.fillStyle = '#d4a84a'
  ctx.beginPath(); ctx.arc(knobX, doorY + 76, 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.stroke()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.strokeRect(doorX + 0.5, doorY - 6 + 0.5, DW - 1, DH + 5)
  const roomName = targetRoom === 'skatepark' ? 'SKATE' : targetRoom.toUpperCase()
  const label = (side === 'left' ? '< ' : '') + roomName + (side === 'right' ? ' >' : '')
  ctx.fillStyle = '#2a1a0a'
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(label, doorX + DW / 2, doorY - 10)
}

// ─── Draw: pedestal ───────────────────────────────────────────────────────
function drawPedestal(ctx, cx, groundY, pedestalImg) {
  if (pedestalImg && pedestalImg.complete && pedestalImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(pedestalImg, cx - PED_W_IMG / 2, groundY - PED_H_IMG + 5, PED_W_IMG, PED_H_IMG)
  } else {
    // Canvas fallback
    const BW=68, BH=10, SW=42, SH=56, CW=62, CH=10
    const baseY = groundY - BH
    ctx.fillStyle = '#b0aaa2'; ctx.fillRect(cx - BW/2, baseY, BW, BH)
    ctx.fillStyle = '#ccc6be'; ctx.fillRect(cx - BW/2, baseY, BW, 3)
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.strokeRect(cx-BW/2+.5, baseY+.5, BW-1, BH-1)
    const sy = baseY - SH
    ctx.fillStyle = '#cac4bc'; ctx.fillRect(cx-SW/2, sy, SW, SH)
    ctx.fillStyle = '#dedad4'; ctx.fillRect(cx-SW/2, sy, 5, SH)
    ctx.fillStyle = '#a89e94'; ctx.fillRect(cx+SW/2-5, sy, 5, SH)
    ctx.strokeRect(cx-SW/2+.5, sy+.5, SW-1, SH-1)
    const cy2 = sy - CH
    ctx.fillStyle = '#b8b2aa'; ctx.fillRect(cx-CW/2, cy2, CW, CH)
    ctx.fillStyle = '#e0dcd6'; ctx.fillRect(cx-CW/2, cy2, CW, 3)
    ctx.strokeRect(cx-CW/2+.5, cy2+.5, CW-1, CH-1)
  }
}


// ─── Draw: art thumbnail (chunky pixel-art frame) ─────────────────────────
function drawArtThumb(ctx, cx, bottomY, artImg, fw = FRAME_W, fh = FRAME_H) {
  const sc = fw / FRAME_W                     // scale relative to reference size
  const PX = Math.max(1, Math.round(3 * sc))  // pixel unit scales with frame
  const B  = Math.max(4, Math.round(12 * sc)) // border thickness scales with frame
  const fx = cx - fw / 2, fy = bottomY - fh
  const IW = fw - B * 2, IH = fh - B * 2
  const ix = fx + B, iy = fy + B

  // Outer black border
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(fx, fy, fw, fh)

  // Frame body (dark brown)
  ctx.fillStyle = '#5a3820'
  ctx.fillRect(fx + PX, fy + PX, fw - PX * 2, fh - PX * 2)

  // Top + left highlight
  ctx.fillStyle = '#9a6848'
  ctx.fillRect(fx + PX, fy + PX, fw - PX * 2, PX)
  ctx.fillRect(fx + PX, fy + PX, PX, fh - PX * 2)

  // Bottom + right shadow
  ctx.fillStyle = '#2e1408'
  ctx.fillRect(fx + PX, fy + fh - PX * 2, fw - PX * 2, PX)
  ctx.fillRect(fx + fw - PX * 2, fy + PX, PX, fh - PX * 2)

  // Inner black inset line
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(ix - PX, iy - PX, IW + PX * 2, PX)
  ctx.fillRect(ix - PX, iy,      PX, IH)
  ctx.fillRect(ix - PX, iy + IH, IW + PX * 2, PX)
  ctx.fillRect(ix + IW, iy - PX, PX, IH + PX)

  // Image mat
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(ix, iy, IW, IH)

  // Image
  if (artImg && artImg.complete && artImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = true
    const ia = artImg.naturalWidth / artImg.naturalHeight, fa = IW / IH
    let dw, dh, ddx = 0, ddy = 0
    if (ia > fa) { dw = IW; dh = IW / ia; ddy = (IH - dh) / 2 }
    else         { dh = IH; dw = IH * ia; ddx = (IW - dw) / 2 }
    ctx.drawImage(artImg, ix + ddx, iy + ddy, dw, dh)
    ctx.imageSmoothingEnabled = false
  }
}

// ─── Draw: skatepark platform ─────────────────────────────────────────────
function drawPlatform(ctx, plat, camX, cW, groundY) {
  const x = Math.round(plat.x - camX)
  if (x + plat.w < -80 || x > cW + 80) return
  if (plat.type === 'rail') {
    const postH = groundY - (plat.y + plat.h)
    const px1 = x + 14, px2 = x + plat.w - 18
    ctx.fillStyle = '#7a6858'
    ctx.fillRect(px1, plat.y + plat.h, 6, postH + 8)
    if (plat.w > 60) ctx.fillRect(px2, plat.y + plat.h, 6, postH + 8)
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1
    ctx.strokeRect(px1+.5, plat.y+plat.h+.5, 5, postH+7)
    if (plat.w > 60) ctx.strokeRect(px2+.5, plat.y+plat.h+.5, 5, postH+7)
    ctx.fillStyle = '#c8c0b0'; ctx.fillRect(x, plat.y, plat.w, plat.h)
    ctx.fillStyle = '#e0d8c8'; ctx.fillRect(x, plat.y, plat.w, 3)
    ctx.fillStyle = '#a89880'; ctx.fillRect(x, plat.y+plat.h-3, plat.w, 3)
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5; ctx.strokeRect(x+.5, plat.y+.5, plat.w-1, plat.h-1)
    return
  }
  // Box
  ctx.fillStyle = '#c8c0b4'; ctx.fillRect(x, plat.y, plat.w, plat.h)
  ctx.fillStyle = '#d8d0c4'; ctx.fillRect(x, plat.y, plat.w, 3)
  ctx.fillStyle = '#d0c8bc'; ctx.fillRect(x, plat.y, 3, plat.h)
  ctx.fillStyle = '#a89888'
  ctx.fillRect(x+3, plat.y+plat.h-3, plat.w-3, 3)
  ctx.fillRect(x+plat.w-3, plat.y+3, 3, plat.h-3)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.strokeRect(x+.5, plat.y+.5, plat.w-1, plat.h-1)
}

// ─── Virtual touch buttons ─────────────────────────────────────────────────
function getVBtns(lW, lH) {
  const bs = Math.max(52, Math.min(72, lW * 0.13))
  const m = 16, g = 8
  return [
    { id: 'left',     x: m,                  y: lH - bs - m, w: bs, h: bs, label: '<', key: 'ArrowLeft'  },
    { id: 'right',    x: m + bs + g,         y: lH - bs - m, w: bs, h: bs, label: '>', key: 'ArrowRight' },
    { id: 'jump',     x: lW - m - bs,        y: lH - bs - m, w: bs, h: bs, label: '^', key: 'Space'      },
    { id: 'interact', x: lW - m - bs * 2 - g,y: lH - bs - m, w: bs, h: bs, label: 'E', key: 'KeyE'       },
  ]
}

function drawTouchControls(ctx, lW, lH, pressedKeys) {
  const btns = getVBtns(lW, lH)
  for (const b of btns) {
    const active = b.key !== 'KeyE' && pressedKeys.has(b.key)
    ctx.globalAlpha = active ? 0.9 : 0.6
    ctx.fillStyle   = active ? 'rgba(80,60,30,0.8)' : 'rgba(42,26,10,0.55)'
    ctx.fillRect(b.x, b.y, b.w, b.h)
    ctx.strokeStyle = 'rgba(253,250,244,0.8)'; ctx.lineWidth = 2
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2)
    ctx.fillStyle = '#fdfaf4'
    ctx.font = `${Math.round(b.w * 0.36)}px "Press Start 2P", monospace`
    ctx.textAlign = 'center'
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + Math.round(b.w * 0.13))
  }
  ctx.globalAlpha = 1
}

// ─── Draw: home content (drawn on canvas before player) ───────────────────
function drawHomeContent(ctx, lW, groundY, portrait, skillImgs, linkRectsOut, uiScale, isTouch, gameScale) {
  const NAV_H    = Math.round(72 / gameScale)
  const panelTop = NAV_H + 12
  const panelBot = groundY - 12
  const contentCY = (panelTop + panelBot) / 2
  const isMobile  = lW < 650
  const f    = (base, min) => Math.max(min, Math.round(base * uiScale))
  const step = s => Math.round(s * uiScale)


  const innerL = 52
  const innerR = lW - 52

  if (!isMobile) {
    // ── Tech icon strip: BOTTOM of panel ─────────────────────────────────
    const n       = skillImgs.length
    const spacing = Math.round((innerR - innerL) / n)
    const iconSz  = Math.min(Math.round(48 * uiScale), Math.round(spacing * 0.75))
    const stripH  = iconSz + step(16)
    const stripTop = panelBot - stripH - step(4)

    ctx.strokeStyle = 'rgba(42,26,10,0.10)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(innerL, stripTop); ctx.lineTo(innerR, stripTop); ctx.stroke()

    const iconY = stripTop + Math.round((stripH - iconSz) / 2)
    skillImgs.forEach((img, idx) => {
      const cx = innerL + Math.round(spacing * (idx + 0.5))
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(img, cx - Math.round(iconSz / 2), iconY, iconSz, iconSz)
        ctx.imageSmoothingEnabled = false
      }
    })

    // ── Top section: text LEFT, portrait RIGHT — block centered in panel ──
    const topCY    = (panelTop + stripTop) / 2
    const portSize = Math.min(Math.round(220 * uiScale), Math.round((stripTop - panelTop) * 0.72))
    const textMaxW = Math.round(portSize * 1.7)
    const gapTP    = step(250)
    const blockW   = textMaxW + gapTP + portSize
    const blockL   = Math.round((innerL + innerR - blockW) / 2)
    const textX    = blockL
    const portX    = blockL + textMaxW + gapTP
    const portFrameY = topCY - portSize / 2
    ctx.fillStyle = '#f0ebd8'
    ctx.fillRect(portX - 5, portFrameY - 5, portSize + 10, portSize + 10)
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2.5
    ctx.strokeRect(portX - 5, portFrameY - 5, portSize + 10, portSize + 10)
    if (portrait && portrait.complete && portrait.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true
      const ia = portrait.naturalWidth / portrait.naturalHeight
      let dw, dh, ddx = 0, ddy = 0
      if (ia > 1) { dw = portSize; dh = portSize / ia; ddy = (portSize - dh) / 2 }
      else        { dh = portSize; dw = portSize * ia; ddx = (portSize - dw) / 2 }
      ctx.drawImage(portrait, portX + ddx, portFrameY + ddy, dw, dh)
      ctx.imageSmoothingEnabled = false
    }

    let ty = topCY - step(100)
    ctx.textAlign = 'left'

    ctx.fillStyle = '#9a8a7a'
    ctx.font = `${f(9, 6)}px "Press Start 2P", monospace`
    ctx.fillText("HI, I'M", textX, ty); ty += step(28)

    ctx.fillStyle = '#2a1a0a'
    ctx.font = `${f(22, 10)}px "Press Start 2P", monospace`
    ctx.fillText('KRISHNA THOLUDUR', textX, ty); ty += step(30)

    ctx.fillStyle = '#5a2d8a'
    const subtitleText = 'CS @ UCLA  \u00b7  SOFTWARE ENGINEER AND GAME DEVELOPER'
    let subtitleFontSz = f(10, 6)
    ctx.font = `${subtitleFontSz}px "Press Start 2P", monospace`
    const subtitleW = ctx.measureText(subtitleText).width
    if (subtitleW > textMaxW) {
      subtitleFontSz = Math.max(5, Math.floor(subtitleFontSz * textMaxW / subtitleW))
      ctx.font = `${subtitleFontSz}px "Press Start 2P", monospace`
    }
    ctx.fillText(subtitleText, textX, ty)
    ty += step(28)

    ctx.fillStyle = '#3a2a1a'
    ctx.font = `${f(8, 6)}px "Press Start 2P", monospace`
    ty = wrapText(ctx,
      "I'm a CS student at UCLA who likes to make games and other weird interactive software. Check out my projects and art, or click the links to see what I'm up to!",
      textX, ty, Math.round(textMaxW * 1.5), step(20))
    ty += step(22)

    // Link buttons
    linkRectsOut.length = 0
    const btnFontSz = f(7, 5)
    ctx.font = `${btnFontSz}px "Press Start 2P", monospace`
    const btnH    = Math.round(26 * uiScale)
    const maxBtnX = lW * 0.57
    let bx = textX, btnRowY = ty
    for (const link of HOME_LINKS) {
      const tw = ctx.measureText(link.label).width
      const bw = tw + Math.round(28 * uiScale)
      if (bx + bw > maxBtnX && bx > textX) { bx = textX; btnRowY += btnH + 6 }
      const by = btnRowY
      ctx.fillStyle = 'rgba(253,250,244,0.95)'
      ctx.fillRect(bx, by, bw, btnH)
      ctx.strokeStyle = link.color; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, btnH)
      ctx.fillStyle = link.color; ctx.fillText(link.label, bx + Math.round(10 * uiScale), by + Math.round(btnH * 0.70))
      linkRectsOut.push({ x: bx, y: by, w: bw, h: btnH, url: link.url })
      bx += bw + 6
    }

    // WASD controls hint
    if (isTouch) {
      ctx.fillStyle = '#7a6a5a'
      ctx.font = `${f(6, 5)}px "Press Start 2P", monospace`
      ctx.textAlign = 'left'
      ctx.fillText('USE BUTTONS TO MOVE + JUMP', textX, btnRowY + btnH + 18)
    } else {
      const kbTop = btnRowY + btnH + 18
      const ks = Math.max(14, step(20))
      const kh = Math.max(12, step(18))
      function drawKey(kx, ky, label, kw) {
        ctx.font = `${f(5, 4)}px "Press Start 2P", monospace`
        const w = kw !== undefined ? kw : Math.max(ks, ctx.measureText(label).width + 10)
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(kx, ky, w, kh)
        ctx.fillStyle = '#9a9088'; ctx.fillRect(kx + 1, ky + kh - 2, w - 2, 2)
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1
        ctx.strokeRect(kx + 0.5, ky + 0.5, w - 1, kh - 1)
        ctx.fillStyle = '#2a1a0a'; ctx.textAlign = 'center'
        ctx.fillText(label, kx + w / 2, ky + kh - 4)
      }
      drawKey(textX + ks,     kbTop,      'W')
      drawKey(textX,          kbTop + ks, 'A')
      drawKey(textX + ks,     kbTop + ks, 'S')
      drawKey(textX + ks * 2, kbTop + ks, 'D')
      drawKey(textX + ks * 4, kbTop + ks, 'SPC', Math.round(44 * uiScale))
      ctx.fillStyle = '#7a6a5a'
      ctx.font = `${f(6, 5)}px "Press Start 2P", monospace`
      ctx.textAlign = 'left'
      ctx.fillText('MOVE', textX + 3,          kbTop + ks * 2 + 14)
      ctx.fillText('JUMP', textX + ks * 4 + 3, kbTop + ks * 2 + 14)
    }
  } else {
    // ── Mobile layout ─────────────────────────────────────────────────────
    const textX    = 24
    const textMaxW = lW - 48

    let ty = contentCY - step(120)
    ctx.textAlign = 'left'

    ctx.fillStyle = '#9a8a7a'
    ctx.font = `${f(9, 6)}px "Press Start 2P", monospace`
    ctx.fillText("HI, I'M", textX, ty); ty += step(28)

    ctx.fillStyle = '#2a1a0a'
    const ns = Math.max(12, Math.round(lW * 0.034))
    ctx.font = `${ns}px "Press Start 2P", monospace`
    ctx.fillText('KRISHNA', textX, ty);  ty += Math.round(ns * 1.6)
    ctx.fillText('THOLUDUR', textX, ty); ty += Math.round(ns * 1.3)

    ctx.fillStyle = '#5a2d8a'
    ctx.font = `${f(10, 6)}px "Press Start 2P", monospace`
    ctx.fillText('CS @ UCLA', textX, ty);      ty += step(18)
    ctx.fillText('SWE + GAME DEV', textX, ty); ty += step(24)

    ctx.fillStyle = '#3a2a1a'
    ctx.font = `${f(8, 6)}px "Press Start 2P", monospace`
    ty = wrapText(ctx,
      "I'm a CS student at UCLA who likes to make games and other weird interactive software. Currently working on Prime Weaver and Rebel Stars.",
      textX, ty, textMaxW, step(20))
    ty += step(22)

    linkRectsOut.length = 0
    const btnFontSz = f(7, 5)
    ctx.font = `${btnFontSz}px "Press Start 2P", monospace`
    const btnH    = Math.round(26 * uiScale)
    const maxBtnX = lW - 40
    let bx = textX, btnRowY = ty
    for (const link of HOME_LINKS) {
      const tw = ctx.measureText(link.label).width
      const bw = tw + Math.round(28 * uiScale)
      if (bx + bw > maxBtnX && bx > textX) { bx = textX; btnRowY += btnH + 6 }
      const by = btnRowY
      ctx.fillStyle = 'rgba(253,250,244,0.95)'
      ctx.fillRect(bx, by, bw, btnH)
      ctx.strokeStyle = link.color; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, btnH)
      ctx.fillStyle = link.color; ctx.fillText(link.label, bx + Math.round(10 * uiScale), by + Math.round(btnH * 0.70))
      linkRectsOut.push({ x: bx, y: by, w: bw, h: btnH, url: link.url })
      bx += bw + 6
    }

    ctx.fillStyle = '#7a6a5a'
    ctx.font = `${f(6, 5)}px "Press Start 2P", monospace`
    ctx.textAlign = 'left'
    ctx.fillText('USE BUTTONS TO MOVE + JUMP', textX, btnRowY + btnH + 18)
  }
}

// ─── Draw: interact prompt ────────────────────────────────────────────────
function drawInteractPrompt(ctx, cx, topY, time) {
  const by = topY + Math.sin(time * 4.5) * 2 - 22
  const bw = 52, bh = 20
  ctx.fillStyle = '#fdfaf0'; ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2
  ctx.fillRect(cx - bw/2, by, bw, bh); ctx.strokeRect(cx - bw/2, by, bw, bh)
  ctx.fillStyle = '#fdfaf0'
  ctx.beginPath(); ctx.moveTo(cx-5, by+bh); ctx.lineTo(cx+5, by+bh); ctx.lineTo(cx, by+bh+7); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx-5, by+bh-1); ctx.lineTo(cx, by+bh+7); ctx.lineTo(cx+5, by+bh-1); ctx.stroke()
  ctx.fillStyle = '#2a1a0a'; ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'
  ctx.fillText('[ E ]', cx, by + 13)
}

// ─── Draw: player sprite ──────────────────────────────────────────────────
function drawSkater(ctx, player, animFrame, spriteSheet, camX) {
  const sx = Math.round(player.x - camX + PW / 2)
  const by = Math.round(player.y + PH)
  const frame = player.onGround ? animFrame : animFrame + 2
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(sx, by)
  if (player.facing === 'left') ctx.scale(-1, 1)
  if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
    ctx.drawImage(spriteSheet, frame * SRC_W, 0, SRC_W, SRC_H, -DST_W/2, -DST_H, DST_W, DST_H)
  }
  ctx.restore()
}

// ─── Draw: score HUD ──────────────────────────────────────────────────────
function drawScoreHUD(ctx, state, lW) {
  const x = lW - 185, y = 52
  ctx.fillStyle = 'rgba(253,250,244,0.92)'
  ctx.fillRect(x, y, 175, 72)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.strokeRect(x+.5, y+.5, 174, 71)
  ctx.fillStyle = '#7a6a5a'; ctx.font = '6px "Press Start 2P", monospace'; ctx.textAlign = 'left'
  ctx.fillText('SCORE', x+12, y+18)
  ctx.fillStyle = '#2a1a0a'; ctx.font = '13px "Press Start 2P", monospace'
  ctx.fillText(String(Math.floor(state.score)).padStart(7, '0'), x+12, y+38)
  ctx.font = '6px "Press Start 2P", monospace'
  ctx.fillStyle = state.combo > 1 ? '#c8880a' : '#7a6a5a'
  ctx.fillText('x' + state.combo + ' COMBO', x+12, y+58)
}

// ─── Draw: trick message ──────────────────────────────────────────────────
function drawTrickMsg(ctx, state, lW, lH) {
  if (state.trickMsgTimer <= 0 || !state.trickMsg) return
  const alpha = Math.min(1, state.trickMsgTimer * 1.5)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#2a1a0a'; ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = 'center'
  ctx.fillText(state.trickMsg, lW / 2, lH / 2 - 80)
  ctx.restore()
}

// ─── Skatepark builder ────────────────────────────────────────────────────
function buildSkatepark(lW, groundY) {
  const W = Math.round(lW * SKATEPARK_MULT)
  const g = groundY
  const box  = (x, ya, w, h=22) => ({ x: Math.round(x), y: g-ya, w: Math.round(w), h, type: 'box'  })
  const rail = (x, ya, w)        => ({ x: Math.round(x), y: g-ya, w: Math.round(w), h: 10, type: 'rail' })
  return {
    worldW: W,
    platforms: [
      { x: 0, y: groundY, w: W, h: 80, type: 'ground' },
      // Left section
      box( lW*0.07,  70, lW*0.12),
      rail(lW*0.21, 115, lW*0.14),
      box( lW*0.37,  85, lW*0.09),
      box( lW*0.48, 155, lW*0.07),
      rail(lW*0.57,  70, lW*0.15),
      box( lW*0.74,  95, lW*0.09),
      rail(lW*0.85, 135, lW*0.12),
      // Mid section
      box( lW*1.04,  75, lW*0.10),
      rail(lW*1.16, 120, lW*0.16),
      box( lW*1.34,  65, lW*0.08),
      box( lW*1.44, 145, lW*0.07),
      rail(lW*1.53,  90, lW*0.18),
      box( lW*1.73,  75, lW*0.09),
      box( lW*1.84, 165, lW*0.07),
      rail(lW*1.93,  65, lW*0.14),
      // Right section
      box( lW*2.10,  80, lW*0.10),
      rail(lW*2.22, 125, lW*0.17),
      box( lW*2.41,  72, lW*0.08),
      rail(lW*2.51, 105, lW*0.22),
      box( lW*2.75,  88, lW*0.10),
    ]
  }
}

// ─── Room entity builder ──────────────────────────────────────────────────
function getEntitiesForRoom(room, lW) {
  if (room === 'projects') {
    const n = PROJECTS.length
    return PROJECTS.map((p, i) => ({
      id: p.id, type: 'project',
      cx: Math.round(lW / (n + 1) * (i + 1)),
      label: p.name, icon: p.icon, data: p,
    }))
  }
  if (room === 'art') {
    const n = ART_PIECES.length
    return ART_PIECES.map((a, i) => ({
      id: a.id, type: 'art',
      cx: Math.round(lW / (n + 1) * (i + 1)),
      label: a.name, data: a,
    }))
  }
  return []
}

// ─── Physics ──────────────────────────────────────────────────────────────
function updatePhysics(state, dt, lW, groundY, platforms, skateparkWorldW) {
  const { player, keys } = state
  const goLeft  = keys.has('ArrowLeft')  || keys.has('KeyA')
  const goRight = keys.has('ArrowRight') || keys.has('KeyD')
  const jump    = keys.has('ArrowUp')    || keys.has('KeyW') || keys.has('Space')
  const dir = goRight ? 1 : goLeft ? -1 : 0

  if (dir !== 0) {
    const accel = player.onGround ? ACCEL_GND : ACCEL_AIR
    player.vx += dir * accel * dt
    player.vx  = Math.sign(player.vx) * Math.min(Math.abs(player.vx), MAX_SPEED)
    player.facing = dir > 0 ? 'right' : 'left'
    player.walkTarget = null
  } else if (player.walkTarget !== null) {
    const dx = player.walkTarget - (player.x + PW / 2)
    if (Math.abs(dx) < 5) { player.vx = 0; player.walkTarget = null }
    else { player.vx = (dx > 0 ? 1 : -1) * MAX_SPEED * 0.65; player.facing = dx > 0 ? 'right' : 'left' }
  } else {
    const friction = (player.onRail ? FRICTION_RAIL : FRICTION_GND) * dt
    if (Math.abs(player.vx) <= friction) player.vx = 0
    else player.vx -= Math.sign(player.vx) * friction
  }

  if (jump && player.onGround) {
    const speedFactor = Math.min(Math.abs(player.vx) / MAX_SPEED, 1)
    player.vy = JUMP_BASE - speedFactor * JUMP_BONUS
    player.onGround = false; player.onRail = false; player.walkTarget = null
  }

  player.vy = Math.min(player.vy + GRAVITY * dt, 980)
  player.x += player.vx * dt
  const maxX = skateparkWorldW > 0 ? skateparkWorldW - PW : lW - PW
  player.x = Math.max(0, Math.min(maxX, player.x))

  const prevY = player.y
  player.y += player.vy * dt
  player.onGround = false; player.onRail = false

  if (platforms.length > 0) {
    for (const plat of platforms) {
      if (plat.type === 'ground') {
        if (player.vy >= 0 && player.y + PH >= plat.y && prevY + PH <= plat.y + 16) {
          player.y = plat.y - PH; player.vy = 0; player.onGround = true
        }
      } else {
        const pR = player.x + PW - 2, pL = player.x + 2
        if (pR <= plat.x || pL >= plat.x + plat.w) continue
        const pBottom = player.y + PH, platTop = plat.y
        if (player.vy >= 0 && pBottom >= platTop && pBottom <= platTop + plat.h && prevY + PH <= platTop + 16) {
          player.y = platTop - PH; player.vy = 0; player.onGround = true
          player.onRail = (plat.type === 'rail'); break
        }
      }
    }
  } else {
    if (player.vy >= 0 && player.y + PH >= groundY && prevY + PH <= groundY + 16) {
      player.y = groundY - PH; player.vy = 0; player.onGround = true
    }
  }

  if (player.y + PH > groundY + 300) {
    player.y = groundY - PH; player.vy = 0; player.vx = 0; player.walkTarget = null
  }

  // Camera (skatepark only)
  if (skateparkWorldW > 0) {
    const target = player.x - lW * 0.38
    state.camera.x += (target - state.camera.x) * 0.1
    state.camera.x = Math.max(0, Math.min(skateparkWorldW - lW, state.camera.x))
  } else {
    state.camera.x = 0
  }
}

// ─── Component ────────────────────────────────────────────────────────────
export default function GameCanvas({ room, onRoomChange, onOpenModal, paused }) {
  const canvasRef           = useRef(null)
  const stateRef            = useRef(null)
  const animRef             = useRef(null)
  const pausedRef           = useRef(paused)
  const cbRef               = useRef({ onRoomChange, onOpenModal })
  const roomRef             = useRef(room)
  const pendingSpawnRef     = useRef(null)
  const pendingSpawnSideRef = useRef(null)

  pausedRef.current = paused
  cbRef.current     = { onRoomChange, onOpenModal }

  useEffect(() => {
    roomRef.current         = room
    pendingSpawnRef.current = pendingSpawnSideRef.current ?? 'left'
  }, [room])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    const spriteSheet = new Image(); spriteSheet.src = `${B}images/skateboardersheet.png`
    const pedestalImg = new Image(); pedestalImg.src = `${B}images/pedestal.png`

    const artImgs = {}
    for (const a of ART_PIECES) {
      const img = new Image(); img.src = a.src; artImgs[a.id] = img
    }
    artImgs['portrait'] = new Image(); artImgs['portrait'].src = `${B}images/gcprofile.png`

    const skillImgsArr = SKILL_ICONS.map(url => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; return img
    })

    const iconImgs = {}
    for (const [key, src] of Object.entries(ICON_SRCS)) {
      const img = new Image(); img.src = src; iconImgs[key] = img
    }

    let logicalW = 0, logicalH = 0, groundY = 0
    let entities = [], platforms = [], skateparkWorldW = 0
    let uiScale = 1, gameScale = 1
    let isTouchDevice = false
    const homeLinkRects = []
    const touchMap = new Map()   // touchId → btn.id

    function rebuildRoom() {
      groundY = logicalH - 80
      entities = getEntitiesForRoom(roomRef.current, logicalW)
      if (roomRef.current === 'skatepark') {
        const sk = buildSkatepark(logicalW, groundY)
        platforms = sk.platforms; skateparkWorldW = sk.worldW
      } else {
        platforms = []; skateparkWorldW = 0
      }
    }

    function resize() {
      const dpr  = Math.round(window.devicePixelRatio || 1)
      gameScale  = window.innerWidth / 1280
      logicalW   = 1280
      logicalH   = Math.round(window.innerHeight / gameScale)
      canvas.width        = Math.round(window.innerWidth  * dpr)
      canvas.height       = Math.round(window.innerHeight * dpr)
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr * gameScale, 0, 0, dpr * gameScale, 0, 0)
      uiScale = Math.max(0.35, Math.min(1.0, Math.min(logicalW / 1440, logicalH / 810)))
      rebuildRoom()
      if (stateRef.current) {
        const gY = logicalH - 80
        if (stateRef.current.player.y > gY - PH) stateRef.current.player.y = gY - PH
      }
    }

    resize()

    const state = {
      player: { x: 80, y: groundY - PH, vx: 0, vy: 0, onGround: true, onRail: false, facing: 'right', walkTarget: null },
      keys:          new Set(),
      camera:        { x: 0 },
      time:          0,
      animTimer:     0,
      animFrame:     0,
      transitionCD:  0,
      nearEntityId:  null,
      score:         0,
      combo:         1,
      airTime:       0,
      railTime:      0,
      comboTimer:    0,
      trickMsg:      '',
      trickMsgTimer: 0,
      prevOnGround:  true,
      prevOnRail:    false,
    }
    stateRef.current = state

    function handleInteract(entity) {
      if (!entity) return
      if (entity.type === 'project') {
        cbRef.current.onOpenModal({ type: 'quest', entity: { data: entity.data } })
      } else if (entity.type === 'art') {
        cbRef.current.onOpenModal({ type: 'art', entity: { data: { src: entity.data.src, caption: entity.data.caption } } })
      }
    }

    function onKeyDown(e) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
      if (e.code === 'KeyE' && !pausedRef.current) {
        const near = entities.find(en => en.id === state.nearEntityId)
        if (near) { handleInteract(near); return }
      }
      if (pausedRef.current) return
      state.keys.add(e.code)
    }
    function onKeyUp(e) { state.keys.delete(e.code) }

    function onCanvasClick(e) {
      if (pausedRef.current) return
      const rect   = canvas.getBoundingClientRect()
      const scaleX = logicalW / rect.width
      const scaleY = logicalH / rect.height
      const clickX = (e.clientX - rect.left) * scaleX
      const clickY = (e.clientY - rect.top)  * scaleY
      const currentRoom = roomRef.current

      if (currentRoom === 'home') {
        for (const lr of homeLinkRects) {
          if (clickX >= lr.x && clickX <= lr.x + lr.w && clickY >= lr.y && clickY <= lr.y + lr.h) {
            window.open(lr.url, '_blank', 'noopener,noreferrer'); return
          }
        }
        state.player.walkTarget = clickX; return
      }

      const playerCX = state.player.x + PW / 2
      for (const entity of entities) {
        if (Math.abs(clickX - entity.cx) < 60 && Math.abs(playerCX - entity.cx) < INTERACT_DIST) {
          handleInteract(entity); return
        }
      }
      state.player.walkTarget = currentRoom === 'skatepark' ? clickX + state.camera.x : clickX
    }

    function onMouseMove(e) {
      if (roomRef.current !== 'home') { canvas.style.cursor = 'crosshair'; return }
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (logicalW / rect.width)
      const y = (e.clientY - rect.top)  * (logicalH / rect.height)
      canvas.style.cursor = homeLinkRects.some(r => x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h) ? 'pointer' : 'crosshair'
    }

    // ── Touch control handlers ────────────────────────────────────────────
    function logicalTouch(t) {
      const rect = canvas.getBoundingClientRect()
      return {
        cx: (t.clientX - rect.left) * (logicalW / rect.width),
        cy: (t.clientY - rect.top)  * (logicalH / rect.height),
      }
    }

    function onTouchStart(e) {
      e.preventDefault()
      isTouchDevice = true
      for (const t of e.changedTouches) {
        const { cx, cy } = logicalTouch(t)
        const btn = getVBtns(logicalW, logicalH).find(
          b => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h
        )
        if (btn) {
          touchMap.set(t.identifier, btn.id)
          if (btn.id === 'interact') {
            const near = entities.find(en => en.id === stateRef.current.nearEntityId)
            if (near) handleInteract(near)
          } else {
            stateRef.current.keys.add(btn.key)
          }
        } else if (!pausedRef.current) {
          stateRef.current.player.walkTarget = cx
        }
      }
    }

    function onTouchMove(e) {
      e.preventDefault()
      const btns = getVBtns(logicalW, logicalH)
      for (const t of e.changedTouches) {
        const { cx, cy } = logicalTouch(t)
        const btn = btns.find(b => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h)
        const prevId = touchMap.get(t.identifier)
        if (prevId !== btn?.id) {
          if (prevId) {
            const prev = btns.find(b => b.id === prevId)
            if (prev && prev.id !== 'interact') stateRef.current.keys.delete(prev.key)
          }
          if (btn && btn.id !== 'interact') {
            touchMap.set(t.identifier, btn.id)
            stateRef.current.keys.add(btn.key)
          } else {
            touchMap.delete(t.identifier)
          }
        }
      }
    }

    function onTouchEnd(e) {
      e.preventDefault()
      const btns = getVBtns(logicalW, logicalH)
      for (const t of e.changedTouches) {
        const btnId = touchMap.get(t.identifier)
        if (btnId) {
          const btn = btns.find(b => b.id === btnId)
          if (btn && btn.id !== 'interact') stateRef.current.keys.delete(btn.key)
          touchMap.delete(t.identifier)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    canvas.addEventListener('click',     onCanvasClick)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart',  onTouchStart,  { passive: false })
    canvas.addEventListener('touchmove',   onTouchMove,   { passive: false })
    canvas.addEventListener('touchend',    onTouchEnd,    { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd,    { passive: false })
    window.addEventListener('resize',    resize, { passive: true })

    let lastTime = performance.now()

    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.033)
      lastTime = now
      state.time += dt

      if (!pausedRef.current) {
        // Handle room transition spawn
        if (pendingSpawnRef.current !== null) {
          const gY = logicalH - 80, lW = logicalW
          const side = pendingSpawnRef.current
          state.player.x        = side === 'left' ? 90 : lW - PW - 90
          state.player.y        = gY - PH
          state.player.vx       = side === 'left' ? 120 : -120
          state.player.vy       = 0
          state.player.onGround = true; state.player.onRail = false
          state.player.facing   = side === 'left' ? 'right' : 'left'
          state.player.walkTarget = null
          state.transitionCD    = 0.9
          state.camera.x        = 0
          pendingSpawnRef.current = null
          groundY = gY; rebuildRoom()
        }

        updatePhysics(state, dt, logicalW, groundY, platforms, skateparkWorldW)
        state.transitionCD = Math.max(0, state.transitionCD - dt)

        // Door detection
        if (state.transitionCD <= 0) {
          const doors    = ROOM_DOORS[roomRef.current] || {}
          const playerCX = state.player.x + PW / 2
          const viewCX   = roomRef.current === 'skatepark' ? playerCX - state.camera.x : playerCX
          if (doors.left && (roomRef.current === 'skatepark' ? playerCX < DOOR_W : viewCX < DOOR_W)) {
            pendingSpawnSideRef.current = 'right'
            state.transitionCD = 1.0
            cbRef.current.onRoomChange(doors.left)
          } else if (doors.right && viewCX > logicalW - DOOR_W) {
            pendingSpawnSideRef.current = 'left'
            state.transitionCD = 1.0
            cbRef.current.onRoomChange(doors.right)
          }
        }

        // Animation (falling plays at 3× speed)
        const period = state.player.onGround ? ANIM_PERIOD : ANIM_PERIOD / 3
        state.animTimer += dt
        if (state.animTimer >= period) {
          state.animTimer -= period
          state.animFrame = state.animFrame === 0 ? 1 : 0
        }

        // Trick scoring (skatepark only)
        if (roomRef.current === 'skatepark') {
          const p = state.player
          const wasOnGround = state.prevOnGround
          const wasOnRail   = state.prevOnRail

          if (p.onRail) {
            state.railTime += dt
            state.score += dt * 15
          } else if (wasOnRail && !p.onRail) {
            const pts = Math.round(state.railTime * 250 * state.combo)
            state.score += pts
            state.combo = Math.min(state.combo + 1, 8)
            state.trickMsg = 'GRIND!  +' + pts
            state.trickMsgTimer = 2.0
            state.railTime = 0
          }

          if (!p.onGround && !p.onRail) {
            state.airTime += dt
          } else if (p.onGround && !wasOnGround && !wasOnRail && state.airTime > 0.4) {
            const pts = Math.round(state.airTime * 200 * state.combo)
            state.score += pts
            if (state.airTime > 0.9) state.combo = Math.min(state.combo + 1, 8)
            state.trickMsg = 'AIR!  +' + pts
            state.trickMsgTimer = 2.0
            state.airTime = 0
          } else if (p.onGround && state.airTime > 0 && state.airTime <= 0.4) {
            state.airTime = 0
          }

          if (p.onGround && !p.onRail && Math.abs(p.vx) < 15) {
            state.comboTimer += dt
            if (state.comboTimer > 4.0) { state.combo = 1; state.comboTimer = 0 }
          } else { state.comboTimer = 0 }

          state.trickMsgTimer = Math.max(0, state.trickMsgTimer - dt)
          state.prevOnGround = p.onGround
          state.prevOnRail   = p.onRail
        }

        // Nearest interactable
        const playerCX = state.player.x + PW / 2
        let nearEntity = null, nearDist = INTERACT_DIST
        for (const e of entities) {
          const d = Math.abs(playerCX - e.cx)
          if (d < nearDist) { nearDist = d; nearEntity = e }
        }
        state.nearEntityId = nearEntity?.id ?? null
      }

      // ── Render ──
      const camX = state.camera.x
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, logicalW, logicalH)

      drawBackground(ctx, logicalW, logicalH)
      drawGround(ctx, groundY, logicalW, camX)

      // Home room content (rendered before player so player goes in front)
      if (roomRef.current === 'home') {
        drawHomeContent(ctx, logicalW, groundY, artImgs['portrait'], skillImgsArr, homeLinkRects, uiScale, isTouchDevice, gameScale)
      }

      const doors = ROOM_DOORS[roomRef.current] || {}
      if (roomRef.current === 'skatepark') {
        // Draw all skatepark platforms (not ground — handled by drawGround)
        for (const plat of platforms) {
          if (plat.type !== 'ground') drawPlatform(ctx, plat, camX, logicalW, groundY)
        }
        // Draw left door in world space
        if (doors.left) {
          const doorScrX = Math.round(-camX)
          if (doorScrX > -DOOR_W && doorScrX < logicalW) {
            drawDoor(ctx, 'left', groundY, logicalW, doors.left, doorScrX)
          }
        }
      } else {
        if (doors.left)  drawDoor(ctx, 'left',  groundY, logicalW, doors.left)
        if (doors.right) drawDoor(ctx, 'right', groundY, logicalW, doors.right)
      }

      // Room title (projects / art)
      const ROOM_TITLES = { projects: 'PROJECTS GALLERY', art: 'ART GALLERY' }
      const roomTitle = ROOM_TITLES[roomRef.current]
      if (roomTitle) {
        ctx.font = '14px "Press Start 2P", monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(253,250,244,0.7)'
        ctx.fillText(roomTitle, logicalW / 2, 80)
        ctx.fillStyle = '#2a1a0a'
        ctx.fillText(roomTitle, logicalW / 2, 78)
      }

      // Project / art entities
      // pedestalTopY: drawPedestal receives (groundY-3) and offsets by +5 internally
      // so actual pedestal image top = (groundY-3) - PED_H_IMG + 5 = groundY - 88
      const pedestalTopY = groundY - 3 - PED_H_IMG + 5
      const baseBottomY  = pedestalTopY - ITEM_GAP
      if (entities.length > 0) {
        // Scale items so they never overlap regardless of viewport width
        const spacing   = logicalW / (entities.length + 1)
        const maxRef    = Math.max(ICON_SIZE, FRAME_W)
        const itemScale = Math.min(uiScale, (spacing * 0.82) / maxRef)
        const effIS = Math.round(ICON_SIZE * itemScale)   // effective icon size
        const effFW = Math.round(FRAME_W   * itemScale)   // effective frame width
        const effFH = Math.round(FRAME_H   * itemScale)   // effective frame height
        const lblSz = Math.max(5, Math.round(6 * itemScale))

        const nearId = state.nearEntityId
        entities.forEach((e, i) => {
          const bob = Math.sin(state.time * 1.8 + i * 1.1) * BOB_AMP
          const drawBottomY = baseBottomY + bob
          drawPedestal(ctx, e.cx, groundY-3, pedestalImg)
          if (e.type === 'project') {
            const iImg = iconImgs[e.icon]
            ctx.imageSmoothingEnabled = false
            if (iImg && iImg.complete && iImg.naturalWidth > 0)
              ctx.drawImage(iImg, e.cx - effIS / 2, drawBottomY - effIS, effIS, effIS)
            ctx.fillStyle = '#2a1a0a'; ctx.font = `${lblSz}px "Press Start 2P", monospace`; ctx.textAlign = 'center'
            ctx.fillText(e.label, e.cx, drawBottomY - effIS - 6)
          } else if (e.type === 'art') {
            drawArtThumb(ctx, e.cx, drawBottomY, artImgs[e.id], effFW, effFH)
            ctx.fillStyle = '#2a1a0a'; ctx.font = `${lblSz}px "Press Start 2P", monospace`; ctx.textAlign = 'center'
            ctx.fillText(e.label, e.cx, drawBottomY - effFH - 6)
          }
          if (e.id === nearId) {
            const itemH    = e.type === 'art' ? effFH : effIS
            const itemTopY = drawBottomY - itemH
            drawInteractPrompt(ctx, e.cx, itemTopY - 20, state.time)
          }
        })
      }

      drawSkater(ctx, state.player, state.animFrame, spriteSheet, camX)

      // Walk-target indicator
      if (state.player.walkTarget !== null) {
        const tx = state.player.walkTarget - camX, ty = groundY - 6
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(tx-5, ty-5); ctx.lineTo(tx+5, ty+5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(tx+5, ty-5); ctx.lineTo(tx-5, ty+5); ctx.stroke()
        ctx.lineCap = 'butt'; ctx.globalAlpha = 1
      }

      if (roomRef.current === 'skatepark') {
        drawScoreHUD(ctx, state, logicalW)
        drawTrickMsg(ctx, state, logicalW, logicalH)
      }

      // Virtual touch controls (shown on touch devices or narrow screens)
      if (isTouchDevice || logicalW < 650) {
        drawTouchControls(ctx, logicalW, logicalH, state.keys)
      }

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
      canvas.removeEventListener('click',     onCanvasClick)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart',  onTouchStart)
      canvas.removeEventListener('touchmove',   onTouchMove)
      canvas.removeEventListener('touchend',    onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('resize',    resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', cursor: 'crosshair' }} />
}
