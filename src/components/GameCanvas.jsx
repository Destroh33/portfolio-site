import { useRef, useEffect } from 'react'
import { WORLD_W, buildPlatforms, buildEntities, getZone } from '../data/world'

// ─── Physics constants ────────────────────────────────────────────────────────
const GRAVITY      = 1800
const JUMP_VY      = -680
const MOVE_SPEED   = 215
const INTERACT_DIST = 88
const PW = 20   // player collision width
const PH = 52   // player collision height

// ─── Cloud layer ──────────────────────────────────────────────────────────────
const CLOUD_TILE = 750
const CLOUD_DEFS = [
  { t: 0.06, fy: 0.07, s: 1.05 },
  { t: 0.28, fy: 0.13, s: 0.80 },
  { t: 0.54, fy: 0.06, s: 1.20 },
  { t: 0.79, fy: 0.11, s: 0.90 },
]

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawCloud(ctx, cx, cy, s) {
  ctx.beginPath()
  ctx.arc(cx,           cy + 5 * s,  18 * s, 0, Math.PI * 2)
  ctx.arc(cx + 22 * s,  cy - 2 * s,  22 * s, 0, Math.PI * 2)
  ctx.arc(cx + 46 * s,  cy + 3 * s,  16 * s, 0, Math.PI * 2)
  ctx.arc(cx + 28 * s,  cy + 12 * s, 13 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawClouds(ctx, camX, cW, cH) {
  const off   = (camX * 0.065) % CLOUD_TILE
  const tiles = Math.ceil(cW / CLOUD_TILE) + 2
  ctx.fillStyle   = 'rgba(255,255,255,0.88)'
  ctx.strokeStyle = 'rgba(160,200,230,0.35)'
  ctx.lineWidth   = 1
  for (let tile = -1; tile <= tiles; tile++) {
    const bx = tile * CLOUD_TILE - off
    for (const c of CLOUD_DEFS) {
      const cx = bx + c.t * CLOUD_TILE
      if (cx + 70 * c.s < 0 || cx > cW + 10) continue
      drawCloud(ctx, cx, cH * c.fy, c.s)
    }
  }
}

function drawHills(ctx, camX, cW, cH, baseY, amp, period, parallax, color) {
  const off = camX * parallax
  ctx.beginPath()
  ctx.moveTo(-5, cH + 5)
  for (let x = -5; x <= cW + 5; x += 4) {
    const wx = x + off
    const h = Math.sin(wx / period * Math.PI * 2)                     * amp * 0.50
            + Math.sin(wx / (period * 0.61) * Math.PI * 2 + 1.1)     * amp * 0.32
            + Math.sin(wx / (period * 1.70) * Math.PI * 2 + 2.4)     * amp * 0.18
    ctx.lineTo(x, baseY - h)
  }
  ctx.lineTo(cW + 5, cH + 5)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawBackground(ctx, camX, cW, cH) {
  // Paper-sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, cH)
  grad.addColorStop(0,    '#b4d8f2')
  grad.addColorStop(0.52, '#d8edc8')
  grad.addColorStop(1,    '#e4dcc0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cW, cH)

  // Notebook ruled lines (screen-fixed – always crisp)
  ctx.strokeStyle = 'rgba(140,170,210,0.13)'
  ctx.lineWidth   = 1
  for (let y = 28; y < cH; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke()
  }
  // Left margin line
  ctx.strokeStyle = 'rgba(215,130,130,0.17)'
  ctx.beginPath(); ctx.moveTo(56, 0); ctx.lineTo(56, cH); ctx.stroke()

  drawClouds(ctx, camX, cW, cH)
  drawHills(ctx, camX, cW, cH, cH * 0.81, 58, 920, 0.12, '#aace7a')
  drawHills(ctx, camX, cW, cH, cH * 0.87, 44, 640, 0.28, '#78b04e')
}

function drawPlatform(ctx, plat, camX, cW) {
  const x = plat.x - camX
  if (x + plat.w < -60 || x > cW + 60) return
  const isGround = plat.h > 30

  ctx.fillStyle = isGround ? '#9a7456' : '#c4956a'
  ctx.fillRect(x, plat.y, plat.w, plat.h)

  const grassH = isGround ? 9 : 7
  ctx.fillStyle = '#5cb85c'
  ctx.fillRect(x, plat.y, plat.w, grassH)
  ctx.fillStyle = '#80d080'
  ctx.fillRect(x, plat.y, plat.w, 2)

  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = isGround ? 2 : 1.5
  ctx.strokeRect(x + 0.5, plat.y + 0.5, plat.w - 1, plat.h - 1)

  if (!isGround && plat.w > 40) {
    ctx.strokeStyle = 'rgba(42,26,10,0.18)'
    ctx.lineWidth   = 0.8
    for (let hx = x + 14; hx < x + plat.w - 10; hx += 18) {
      ctx.beginPath(); ctx.moveTo(hx, plat.y + grassH + 3); ctx.lineTo(hx + 6, plat.y + grassH + 10); ctx.stroke()
    }
  }
}

// ── Helper: wooden post planted in the ground ──────────────────────────────────
function drawPost(ctx, sx, topY, groundY, w = 7) {
  ctx.fillStyle   = '#8b6548'
  ctx.fillRect(sx - w / 2, topY, w, groundY - topY + 10)  // +10 digs into soil
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = 1.5
  ctx.strokeRect(sx - w / 2, topY, w, groundY - topY + 10)
}

function drawDecorSign(ctx, entity, camX, groundY, cW) {
  const sx = entity.x - camX
  if (sx < -150 || sx > cW + 150) return

  const BW = 172, BH = 58
  const boardBottom = groundY - 14  // board sits low but post digs in
  const boardTop    = boardBottom - BH

  drawPost(ctx, sx, boardBottom - 4, groundY)   // post behind board, starts near bottom

  // Board shadow
  ctx.fillStyle = 'rgba(42,26,10,0.10)'
  ctx.fillRect(sx - BW / 2 + 4, boardTop + 4, BW, BH)

  // Board (cream paper)
  ctx.fillStyle = '#fdfaf0'
  ctx.fillRect(sx - BW / 2, boardTop, BW, BH)

  // Ink border (double)
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = 2.5
  ctx.strokeRect(sx - BW / 2, boardTop, BW, BH)
  ctx.lineWidth = 1
  ctx.strokeRect(sx - BW / 2 + 5, boardTop + 5, BW - 10, BH - 10)

  // Label
  ctx.textAlign = 'center'
  ctx.fillStyle = '#2a1a0a'
  ctx.font      = '7px "Press Start 2P", monospace'
  ctx.fillText(entity.label, sx, boardTop + BH * 0.52)
  if (entity.data.sub) {
    ctx.fillStyle = '#6a4a2a'
    ctx.font      = '6px "Press Start 2P", monospace'
    ctx.fillText(entity.data.sub, sx, boardTop + BH * 0.78)
  }
}

function drawStatSign(ctx, entity, camX, groundY, artImgs, cW) {
  const sx = entity.x - camX
  const BW = 240, BH = 302
  if (sx < -BW || sx > cW + BW) return

  const bx = sx - BW / 2
  const by = groundY - BH - 6

  // Easel legs (dig into ground)
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#6b4e37'
  ctx.lineWidth   = 7
  ctx.beginPath(); ctx.moveTo(bx + 20, by + BH - 2); ctx.lineTo(bx - 16, groundY + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx + BW - 20, by + BH - 2); ctx.lineTo(bx + BW + 16, groundY + 10); ctx.stroke()
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = 1.5
  ctx.beginPath(); ctx.moveTo(bx + 20, by + BH - 2); ctx.lineTo(bx - 16, groundY + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx + BW - 20, by + BH - 2); ctx.lineTo(bx + BW + 16, groundY + 10); ctx.stroke()
  ctx.lineCap = 'butt'

  // Board drop shadow
  ctx.fillStyle = 'rgba(42,26,10,0.12)'
  ctx.fillRect(bx + 7, by + 7, BW, BH)

  // Board
  ctx.fillStyle = '#fdfaf0'
  ctx.fillRect(bx, by, BW, BH)
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = 2.5
  ctx.strokeRect(bx, by, BW, BH)
  ctx.lineWidth = 1
  ctx.strokeRect(bx + 8, by + 8, BW - 16, BH - 16)

  // Header band
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(bx + 8, by + 8, BW - 16, 27)
  ctx.font      = '7px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fdfaf0'
  ctx.fillText('✦  WHO AM I?  ✦', sx, by + 25)

  // Portrait
  const imgX = bx + 16, imgY = by + 44
  const imgW = BW - 32,  imgH = 172

  const portrait = artImgs && artImgs['portrait']
  if (portrait && portrait.complete && portrait.naturalWidth > 0) {
    const ia = portrait.naturalWidth / portrait.naturalHeight
    const ba = imgW / imgH
    let dw, dh, ddx = 0, ddy = 0
    if (ia > ba) { dw = imgW; dh = imgW / ia; ddy = (imgH - dh) / 2 }
    else          { dh = imgH; dw = imgH * ia; ddx = (imgW - dw) / 2 }
    ctx.drawImage(portrait, imgX + ddx, imgY + ddy, dw, dh)
  } else {
    ctx.fillStyle = '#e8e0d0'
    ctx.fillRect(imgX, imgY, imgW, imgH)
    ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#9a8c7a'
    ctx.fillText('PORTRAIT', sx, imgY + imgH / 2 + 4)
  }
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.strokeRect(imgX, imgY, imgW, imgH)

  const ty = imgY + imgH + 14
  ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#2a1a0a'; ctx.textAlign = 'center'
  ctx.fillText('KRISHNA T.', sx, ty)
  ctx.font = '5.5px "Press Start 2P", monospace'; ctx.fillStyle = '#5a2d8a'
  ctx.fillText('LVL 21 · GAME DEV · CS@UCLA', sx, ty + 17)
  ctx.font = '5px "Press Start 2P", monospace'; ctx.fillStyle = '#5c8f3a'
  ctx.fillText('[ E ] TALK', sx, ty + 33)
}

function drawQuestBoard(ctx, entity, camX, groundY, time, cW) {
  const sx = entity.x - camX
  if (sx < -160 || sx > cW + 160) return

  const isActive = entity.data.status === 'active'
  const BW = 142, BH = 124
  const boardBottom = groundY - 48   // 48px gap between board bottom and ground
  const boardTop    = boardBottom - BH
  const bx          = sx - BW / 2

  // Post (single, digs into ground)
  drawPost(ctx, sx, boardBottom, groundY, 8)

  // Horizontal rail at top of board
  ctx.fillStyle   = '#8b6548'
  ctx.fillRect(bx - 6, boardTop - 3, BW + 12, 7)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.strokeRect(bx - 6, boardTop - 3, BW + 12, 7)

  // Paper drop shadow
  ctx.fillStyle = 'rgba(42,26,10,0.10)'
  ctx.fillRect(bx + 4, boardTop + 4, BW, BH)

  // Paper note
  ctx.fillStyle   = isActive ? '#fdfaf0' : '#f0ece0'
  ctx.fillRect(bx, boardTop, BW, BH)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2
  ctx.strokeRect(bx, boardTop, BW, BH)

  // Red thumbtack pin
  ctx.fillStyle = '#c0392b'
  ctx.beginPath(); ctx.arc(sx, boardTop + 3, 5, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.stroke()

  // Ruled lines at bottom of paper
  ctx.strokeStyle = 'rgba(100,140,180,0.2)'; ctx.lineWidth = 0.5
  for (let ly = boardTop + 80; ly < boardTop + BH - 8; ly += 10) {
    ctx.beginPath(); ctx.moveTo(bx + 8, ly); ctx.lineTo(bx + BW - 8, ly); ctx.stroke()
  }

  // Status icon with pulse
  const pulse = isActive ? 0.7 + Math.sin(time * 3.2) * 0.3 : 1
  ctx.globalAlpha = pulse
  ctx.font = '16px "Press Start 2P", monospace'; ctx.textAlign = 'center'
  ctx.fillStyle = isActive ? '#c8880a' : '#5c8f3a'
  ctx.fillText(isActive ? '★' : '✓', sx, boardTop + 32)
  ctx.globalAlpha = 1

  // Label
  ctx.font = '6px "Press Start 2P", monospace'; ctx.fillStyle = '#2a1a0a'
  const lbl = entity.label.length > 12 ? entity.label.slice(0, 11) + '…' : entity.label
  ctx.fillText(lbl, sx, boardTop + 54)

  // Status badge
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = isActive ? '#c8880a' : '#5c8f3a'
  ctx.fillText(isActive ? 'ACTIVE' : 'COMPLETE', sx, boardTop + 68)
}

function drawArtFrame(ctx, entity, camX, groundY, artImgs, cW) {
  const sx = entity.x - camX
  if (sx < -200 || sx > cW + 200) return

  const FW = 162, FH = 140
  const fx = sx - FW / 2
  const fy = groundY - 270

  // Easel legs (digs into ground) — art frames are on floor easels
  ctx.lineCap     = 'round'
  ctx.strokeStyle = '#8b6548'; ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(fx + 14,      fy + FH - 2); ctx.lineTo(fx - 10,      groundY + 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(fx + FW - 14, fy + FH - 2); ctx.lineTo(fx + FW + 10, groundY + 8); ctx.stroke()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(fx + 14,      fy + FH - 2); ctx.lineTo(fx - 10,      groundY + 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(fx + FW - 14, fy + FH - 2); ctx.lineTo(fx + FW + 10, groundY + 8); ctx.stroke()
  ctx.lineCap = 'butt'

  // Drop shadow
  ctx.fillStyle = 'rgba(42,26,10,0.15)'
  ctx.fillRect(fx + 5, fy + 5, FW + 14, FH + 14)

  // Outer wooden frame
  ctx.fillStyle = '#8b6548'
  ctx.fillRect(fx - 7, fy - 7, FW + 14, FH + 14)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5
  ctx.strokeRect(fx - 7, fy - 7, FW + 14, FH + 14)

  // Inner lighter frame
  ctx.fillStyle = '#c4956a'
  ctx.fillRect(fx - 4, fy - 4, FW + 8, FH + 8)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1
  ctx.strokeRect(fx - 4, fy - 4, FW + 8, FH + 8)

  // Mat
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(fx, fy, FW, FH)

  // Image with contain-mode aspect ratio
  const img = artImgs[entity.id]
  if (img && img.complete && img.naturalWidth > 0) {
    const ia = img.naturalWidth / img.naturalHeight
    const ba = FW / FH
    let dw, dh, ddx = 0, ddy = 0
    if (ia > ba) { dw = FW; dh = FW / ia; ddy = (FH - dh) / 2 }
    else          { dh = FH; dw = FH * ia; ddx = (FW - dw) / 2 }
    ctx.drawImage(img, fx + ddx, fy + ddy, dw, dh)
  } else {
    ctx.fillStyle = '#e0d8cc'
    ctx.fillRect(fx, fy, FW, FH)
    ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#9a8c7a'
    ctx.fillText('ART', sx, fy + FH / 2 + 4)
  }

  // Label tag
  const tagY = groundY - 122
  ctx.fillStyle = '#fdfaf0'; ctx.fillRect(sx - 42, tagY, 84, 19)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.strokeRect(sx - 42, tagY, 84, 19)
  ctx.font = '5px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#2a1a0a'
  ctx.fillText(entity.label, sx, tagY + 12)
}

function drawPortal(ctx, entity, camX, groundY, time, cW) {
  const sx = entity.x - camX
  if (sx < -220 || sx > cW + 220) return

  const cy    = groundY - 80
  const pulse = 0.88 + Math.sin(time * 2.2) * 0.12
  const r     = 54 * pulse

  ctx.fillStyle = 'rgba(42,26,10,0.18)'
  ctx.beginPath(); ctx.ellipse(sx, groundY - 4, 44, 10, 0, 0, Math.PI * 2); ctx.fill()

  ctx.globalAlpha = 0.22
  const gr = ctx.createRadialGradient(sx, cy, 0, sx, cy, r + 30)
  gr.addColorStop(0, 'rgba(200,155,55,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, cy, r + 30, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  for (const [rad, alpha, w] of [
    [r + 9,  0.30, 1.5], [r,      0.80, 2.5],
    [r - 13, 0.45, 1.5], [r - 23, 0.25, 1.0],
  ]) {
    ctx.beginPath(); ctx.arc(sx, cy, rad, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(42,26,10,${alpha * pulse})`; ctx.lineWidth = w; ctx.stroke()
  }

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + time * 1.5
    ctx.fillStyle = `rgba(180,120,30,${0.75 * pulse})`
    ctx.fillRect(sx + Math.cos(ang) * (r - 8) - 3, cy + Math.sin(ang) * (r - 8) - 3, 6, 6)
  }

  ctx.globalAlpha = 0.1 * pulse
  ctx.fillStyle = '#1a1206'; ctx.beginPath(); ctx.arc(sx, cy, r - 5, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#2a1a0a'
  ctx.fillText('ARENA', sx, cy + r + 22)
  ctx.font = '5px "Press Start 2P", monospace'; ctx.fillStyle = '#5c8f3a'
  ctx.fillText('MODE', sx, cy + r + 36)
}

function drawInteractPrompt(ctx, entity, camX, groundY, time) {
  const sx = entity.x - camX
  let promptY
  if      (entity.type === 'art')    promptY = groundY - 296
  else if (entity.type === 'portal') promptY = groundY - 168
  else if (entity.type === 'stat')   promptY = groundY - 336
  else                               promptY = groundY - 200

  const bob = Math.sin(time * 4.5) * 3
  const by  = promptY + bob - 22

  const bw = 52, bh = 20

  ctx.fillStyle   = '#fdfaf0'
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth   = 2
  ctx.fillRect(sx - bw / 2, by, bw, bh)
  ctx.strokeRect(sx - bw / 2, by, bw, bh)

  // Down-pointing triangle
  ctx.fillStyle = '#fdfaf0'
  ctx.beginPath(); ctx.moveTo(sx - 5, by + bh); ctx.lineTo(sx + 5, by + bh); ctx.lineTo(sx, by + bh + 7); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(sx - 5, by + bh - 1); ctx.lineTo(sx, by + bh + 7); ctx.lineTo(sx + 5, by + bh - 1); ctx.stroke()

  ctx.fillStyle = '#2a1a0a'; ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'
  ctx.fillText('[ E ]', sx, by + 13)
}

// ─── Stick-figure player ──────────────────────────────────────────────────────
//
//  Walk cycle uses a proper two-leg alternating gait:
//   - swing = sin(phase):  +1 = left leg max forward, -1 = right leg max forward
//   - leftLiftY  = max(0,  cos(phase)) * LIFT  (left foot in air near phase 0)
//   - rightLiftY = max(0, -cos(phase)) * LIFT  (right foot in air near phase π)
//   - Arm: contralateral – right arm forward when left leg forward (swing>0)
//

function drawStickFigure(ctx, player, camX, time) {
  const sx = Math.floor(player.x - camX + PW / 2)
  const by = Math.floor(player.y + PH)            // y of feet

  const isMoving  = Math.abs(player.vx) > 10
  const phase     = player.walkDist * 0.19         // walk-cycle phase
  const swing     = isMoving ? Math.sin(phase) : 0  // −1…+1

  // Vertical body-bob: highest at mid-swing, lowest at foot-strike
  const bob = isMoving ? -Math.abs(Math.cos(phase)) * 3 : Math.sin(time * 1.4) * 1.5

  const HEAD_R    = 11
  const HEAD_Y    = -49   // head center above feet
  const NECK_Y    = HEAD_Y + HEAD_R   // −38
  const SHLD_Y    = NECK_Y + 7        // −31
  const HIP_Y     = -17
  const STEP      = 17   // max foot offset from body centre
  const LIFT      = 10   // max foot lift height
  const ARM_REACH = 13   // arm swing amplitude

  // ── Foot positions ──────────────────────────────────────────────────────────
  const leftFootX  =  swing * STEP     // +STEP = forward (leading)
  const rightFootX = -swing * STEP     // opposite leg

  // Foot Y: lifts during the swing-through phase (between foot-strikes)
  //   Left foot airborne when cos(phase) > 0  (phase ∈ [−π/2, +π/2])
  //   Right foot airborne when cos(phase) < 0 (phase ∈ [+π/2, +3π/2])
  const leftLiftY  = isMoving ? Math.max(0,  Math.cos(phase)) * LIFT : 0
  const rightLiftY = isMoving ? Math.max(0, -Math.cos(phase)) * LIFT : 0
  const leftFootY  = -leftLiftY
  const rightFootY = -rightLiftY

  // ── Knee positions (midpoint + slight upward offset for visible bend) ───────
  const leftKneeX  = (0          + leftFootX)  * 0.5
  const leftKneeY  = (HIP_Y      + leftFootY)  * 0.5 - 3
  const rightKneeX = (0          + rightFootX) * 0.5
  const rightKneeY = (HIP_Y      + rightFootY) * 0.5 - 3

  // ── Arm positions (contralateral: right arm leads when left leg leads) ───────
  //   When swing > 0 (left leg forward): right arm forward, left arm back
  const leftHandX  = -8 - swing * ARM_REACH   // back when swing > 0
  const rightHandX =  8 + swing * ARM_REACH   // forward when swing > 0
  const HAND_Y     = SHLD_Y + 18

  ctx.save()
  ctx.translate(sx, by + bob)
  if (player.facing === 'left') ctx.scale(-1, 1)

  ctx.strokeStyle = '#2a1a0a'
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  // ── LEGS ──
  ctx.lineWidth = 2.5
  // Left leg: hip → knee → foot
  ctx.beginPath()
  ctx.moveTo(0, HIP_Y)
  ctx.lineTo(leftKneeX,  leftKneeY)
  ctx.lineTo(leftFootX,  leftFootY)
  ctx.stroke()
  // Right leg
  ctx.beginPath()
  ctx.moveTo(0, HIP_Y)
  ctx.lineTo(rightKneeX, rightKneeY)
  ctx.lineTo(rightFootX, rightFootY)
  ctx.stroke()

  // ── BODY ──
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, NECK_Y); ctx.lineTo(0, HIP_Y); ctx.stroke()

  // ── ARMS ──
  ctx.lineWidth = 2
  if (!player.onGround) {
    // Jumping: both arms raised
    ctx.beginPath(); ctx.moveTo(-2, SHLD_Y); ctx.lineTo(-16, SHLD_Y - 18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo( 2, SHLD_Y); ctx.lineTo( 16, SHLD_Y - 18); ctx.stroke()
  } else {
    ctx.beginPath(); ctx.moveTo(-2, SHLD_Y); ctx.lineTo(leftHandX,  HAND_Y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo( 2, SHLD_Y); ctx.lineTo(rightHandX, HAND_Y); ctx.stroke()
  }

  // ── HEAD ──
  ctx.beginPath(); ctx.arc(0, HEAD_Y, HEAD_R, 0, Math.PI * 2)
  ctx.fillStyle = '#fde8c8'; ctx.fill()
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.stroke()

  // Eyes
  ctx.fillStyle = '#2a1a0a'
  ctx.beginPath(); ctx.arc(-4, HEAD_Y - 2, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc( 4, HEAD_Y - 2, 2, 0, Math.PI * 2); ctx.fill()

  // Smile
  ctx.beginPath(); ctx.arc(0, HEAD_Y + 3, 4, 0.2, Math.PI - 0.2)
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5; ctx.stroke()

  ctx.restore()

  // Ground shadow
  ctx.fillStyle = 'rgba(42,26,10,0.10)'
  ctx.beginPath(); ctx.ellipse(sx, by + bob + 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill()
}

// ─── Physics ──────────────────────────────────────────────────────────────────

function updatePhysics(state, dt, platforms, cW) {
  const { player, keys } = state

  const goLeft  = keys.has('ArrowLeft')  || keys.has('KeyA')
  const goRight = keys.has('ArrowRight') || keys.has('KeyD')
  const jump    = keys.has('ArrowUp')    || keys.has('KeyW') || keys.has('Space')

  if (goLeft) {
    player.vx = -MOVE_SPEED; player.facing = 'left'; player.walkTarget = null
  } else if (goRight) {
    player.vx = MOVE_SPEED;  player.facing = 'right'; player.walkTarget = null
  } else if (player.walkTarget !== null) {
    const dx = player.walkTarget - (player.x + PW / 2)
    if (Math.abs(dx) < 5) {
      player.vx = 0; player.walkTarget = null
    } else {
      player.vx     = dx > 0 ? MOVE_SPEED : -MOVE_SPEED
      player.facing = dx > 0 ? 'right'    : 'left'
    }
  } else {
    player.vx = 0
  }

  if (jump && player.onGround) {
    player.vy = JUMP_VY; player.onGround = false; player.walkTarget = null
  }

  player.vy = Math.min(player.vy + GRAVITY * dt, 950)

  player.x += player.vx * dt
  player.x  = Math.max(0, Math.min(WORLD_W - PW, player.x))

  const prevY = player.y
  player.y   += player.vy * dt
  player.onGround = false

  for (const plat of platforms) {
    const pR = player.x + PW - 2, pL = player.x + 2
    if (pR <= plat.x || pL >= plat.x + plat.w) continue
    const pBottom = player.y + PH, platTop = plat.y
    if (player.vy >= 0 && pBottom >= platTop && pBottom <= platTop + plat.h && prevY + PH <= platTop + 12) {
      player.y = platTop - PH; player.vy = 0; player.onGround = true; break
    }
  }

  if (Math.abs(player.vx) > 10) player.walkDist += Math.abs(player.vx) * dt

  // Camera lerp
  const targetCamX = player.x - cW * 0.35
  state.camera.x  += (targetCamX - state.camera.x) * 0.1
  state.camera.x   = Math.max(0, Math.min(WORLD_W - cW, state.camera.x))
  if (WORLD_W < cW) state.camera.x = 0

  // Fell off map
  const groundY = platforms[0]?.y ?? 0
  if (player.y > groundY + 220) {
    if (player.x > 5700 && player.x < 5960) player.x = 5680
    player.y = groundY - PH; player.vy = 0; player.vx = 0; player.walkTarget = null
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────

function renderAll(ctx, state, platforms, entities, artImgs, groundY, nearEntity, cW, cH) {
  const camX = state.camera.x
  const time  = state.time

  ctx.clearRect(0, 0, cW, cH)
  drawBackground(ctx, camX, cW, cH)

  for (const plat of platforms)  drawPlatform(ctx, plat, camX, cW)

  for (const entity of entities) {
    if (entity.type === 'sign')   { drawDecorSign(ctx, entity, camX, groundY, cW);          continue }
    if (entity.type === 'stat')   { drawStatSign(ctx, entity, camX, groundY, artImgs, cW);  continue }
    if (entity.type === 'quest')  { drawQuestBoard(ctx, entity, camX, groundY, time, cW);   continue }
    if (entity.type === 'art')    { drawArtFrame(ctx, entity, camX, groundY, artImgs, cW);  continue }
    if (entity.type === 'portal') { drawPortal(ctx, entity, camX, groundY, time, cW);       continue }
  }

  if (nearEntity) drawInteractPrompt(ctx, nearEntity, camX, groundY, time)

  drawStickFigure(ctx, state.player, camX, time)

  // Walk-target crosshair
  if (state.player.walkTarget !== null) {
    const tx = state.player.walkTarget - camX
    const ty = groundY - 6
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(tx - 5, ty - 5); ctx.lineTo(tx + 5, ty + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(tx + 5, ty - 5); ctx.lineTo(tx - 5, ty + 5); ctx.stroke()
    ctx.lineCap = 'butt'; ctx.globalAlpha = 1
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameCanvas({ onOpenModal, onOpenMiniGame, onZoneChange, paused }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const animRef   = useRef(null)
  const pausedRef = useRef(paused)
  const cbRef     = useRef({ onOpenModal, onOpenMiniGame, onZoneChange })

  pausedRef.current = paused
  cbRef.current     = { onOpenModal, onOpenMiniGame, onZoneChange }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    // Logical (CSS-pixel) dimensions — DPR-independent coordinate space
    let logicalW = 0, logicalH = 0
    let platforms, entities, groundY, artImgs = {}

    function rebuild() {
      groundY  = logicalH - 80
      platforms = buildPlatforms(groundY)
      entities  = buildEntities(groundY)
      for (const e of entities) {
        if (e.type === 'art' && !artImgs[e.id]) {
          const img = new Image(); img.src = e.data.src; artImgs[e.id] = img
        }
      }
      if (!artImgs['portrait']) {
        const img = new Image(); img.src = '/images/gcprofile.png'; artImgs['portrait'] = img
      }
    }

    function resize() {
      // Use Math.round to avoid fractional DPR values (e.g. 1.5 on some devices)
      const dpr = Math.round(window.devicePixelRatio || 1)
      logicalW = window.innerWidth
      logicalH = window.innerHeight
      canvas.width        = logicalW * dpr
      canvas.height       = logicalH * dpr
      canvas.style.width  = logicalW + 'px'
      canvas.style.height = logicalH + 'px'
      // Reset context transform each time (canvas resize resets it)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      rebuild()
      if (stateRef.current) {
        const gY = logicalH - 80
        const p  = stateRef.current.player
        if (p.y > gY - PH) p.y = gY - PH
      }
    }

    resize()

    const state = {
      player: {
        x: 80, y: groundY - PH,
        vx: 0, vy: 0,
        onGround: true, facing: 'right',
        walkDist: 0, walkTarget: null,
      },
      camera: { x: 0 },
      keys: new Set(),
      time: 0,
      nearEntityId: null,
      currentZone: null,
    }
    stateRef.current = state

    function handleInteract(entity) {
      if (!entity) return
      if (entity.type === 'portal') cbRef.current.onOpenMiniGame()
      else                          cbRef.current.onOpenModal({ type: entity.type, entity })
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
      const rect = canvas.getBoundingClientRect()
      // Scale from CSS pixels to logical pixels (handles page zoom)
      const scaleX      = logicalW / rect.width
      const clickWorldX = (e.clientX - rect.left) * scaleX + state.camera.x
      const playerCX    = state.player.x + PW / 2

      for (const entity of entities) {
        if (entity.type === 'sign') continue
        const clickDist  = Math.abs(clickWorldX - entity.x)
        const playerDist = Math.abs(playerCX    - entity.x)
        if (clickDist < 80 && playerDist < INTERACT_DIST) { handleInteract(entity); return }
      }
      state.player.walkTarget = clickWorldX
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    canvas.addEventListener('click', onCanvasClick)
    window.addEventListener('resize', resize, { passive: true })

    let lastTime = performance.now()

    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.033)
      lastTime  = now
      state.time += dt

      if (!pausedRef.current) {
        updatePhysics(state, dt, platforms, logicalW)

        const playerCX = state.player.x + PW / 2
        let nearEntity = null, nearDist = INTERACT_DIST
        for (const e of entities) {
          if (e.type === 'sign') continue
          const d = Math.abs(playerCX - e.x)
          if (d < nearDist) { nearDist = d; nearEntity = e }
        }
        state.nearEntityId = nearEntity?.id ?? null

        const newZone = getZone(state.player.x)
        if (newZone !== state.currentZone) {
          state.currentZone = newZone
          cbRef.current.onZoneChange(newZone)
        }
      }

      const nearEntity = entities.find(e => e.id === state.nearEntityId)
      renderAll(ctx, state, platforms, entities, artImgs, groundY, nearEntity, logicalW, logicalH)
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
      canvas.removeEventListener('click', onCanvasClick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: 'crosshair' }}
    />
  )
}
