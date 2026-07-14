import { useMemo, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { pathCurveAtom } from '../../stores/flybyLayout'
import { narrowViewportAtom } from '../../stores/device'
import { INTRO_PLANET_RADIUS } from './IntroPlanet'
import { introBlendAtom } from '../../stores/introLayout'
import { SITE, SITE_LINKS, SITE_EMAIL } from '../../data/site'
import { SKILLS } from '../../data/skills'

// These must mirror CameraRig's intro constants so the card is oriented to
// face the actual intro-start camera position (frontal at blend=0).
const INTRO_BEHIND_DISTANCE = 38 * (INTRO_PLANET_RADIUS / 30)
const INTRO_START_HEIGHT = 12 * (INTRO_PLANET_RADIUS / 30)
const INTRO_LOOK_UP = 41 * (INTRO_PLANET_RADIUS / 30)
// Anchor the card fully ABOVE the planet's top rim with generous clearance
// (margin comfortably exceeds the card's half-height at this scale) so it
// floats in open sky — never overlapping the planet or its atmosphere rim.
// Nudged slightly toward the camera (-tangent) to clear the surface cleanly.
const RIM_MARGIN = 0.55 * INTRO_PLANET_RADIUS
const ANCHOR_BACK = 0.22
// Phone: enlarge the centered card to fill the narrow frame. Higher = bigger
// in this scene (matches the blurb's tuning direction). Desktop stays at 240.
const PHONE_HERO_FACTOR = 250
// World size + peak opacity of the dark backing plane behind the phone hero
// card (kept low so the scene shows through). Mirrors the blurb scrim.
const PHONE_SCRIM_SIZE = 60
const PHONE_SCRIM_OPACITY = 0.4

// Square hero panel (old-site style, matching the project-blurb look):
// portrait + name + role + link buttons, floating over the home planet's rim
// as a world-space card. Fades out as the intro flyover hands off to the ship.
export default function HeroSurfaceCard() {
  const curve = useStore(pathCurveAtom)
  const narrow = useStore(narrowViewportAtom)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useFrame(() => {
    if (wrapperRef.current) {
      const opacity = 1 - introBlendAtom.get()
      wrapperRef.current.style.opacity = String(opacity)
      wrapperRef.current.style.pointerEvents = opacity < 0.4 ? 'none' : 'auto'
    }
  })

  const layout = useMemo(() => {
    if (!curve) return null
    const planetPos = curve.getPoint(0)
    const tangent = curve.getTangent(0).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize()
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize()

    // Anchor just above the top rim: mostly straight up, nudged toward the
    // camera (-tangent) so the card floats over the visible top edge.
    const normal = up
      .clone()
      .add(tangent.clone().multiplyScalar(-ANCHOR_BACK))
      .normalize()
    const anchorPos = planetPos.clone().add(normal.clone().multiplyScalar(INTRO_PLANET_RADIUS + RIM_MARGIN))

    // Orient the card with the intro camera's OWN orientation (same lookAt,
    // same frame-up basis as CameraRig) so it is exactly parallel to the
    // screen at blend=0 — perfectly straight, no perspective skew. (Facing the
    // camera's *position* from an off-axis anchor point renders tilted; and
    // mixing world-up here with frame-up in CameraRig added roll.)
    const camStart = planetPos
      .clone()
      .sub(tangent.clone().multiplyScalar(INTRO_BEHIND_DISTANCE))
      .add(up.clone().multiplyScalar(INTRO_START_HEIGHT))
    const lookTarget = planetPos.clone().add(up.clone().multiplyScalar(INTRO_LOOK_UP))
    // Camera-convention lookAt: -Z toward target, so +Z faces back toward the
    // viewer — exactly what the Html plane needs.
    const lookMatrix = new THREE.Matrix4().lookAt(camStart, lookTarget, up)
    const euler = new THREE.Euler().setFromRotationMatrix(lookMatrix)

    return { anchorPos, euler }
  }, [curve])

  if (!layout) return null

  const rotationTuple: [number, number, number] = [layout.euler.x, layout.euler.y, layout.euler.z]

  return (
    <group>
      {/* Phone: faint dark backing plane behind the centered hero card so its
          text reads over the starfield; scene still visible through it. */}
      {narrow && (
        <mesh position={layout.anchorPos} rotation={rotationTuple}>
          <planeGeometry args={[PHONE_SCRIM_SIZE, PHONE_SCRIM_SIZE]} />
          <meshBasicMaterial color="#04050b" transparent opacity={PHONE_SCRIM_OPACITY} depthWrite={false} />
        </mesh>
      )}
      <Html
        transform
        occlude={false}
        position={layout.anchorPos}
        rotation={rotationTuple}
        distanceFactor={narrow ? PHONE_HERO_FACTOR : 240}
      >
        <div ref={wrapperRef} className={narrow ? 'hero-surface-card is-stacked' : 'hero-surface-card'}>
        <div className="hero-card-top">
          <div className="hero-card-text">
            <h1>{SITE.name}</h1>
            <p>{SITE.role}</p>
          </div>
          <img className="hero-card-portrait" src={SITE.portrait} alt={`Portrait of ${SITE.name}`} />
        </div>

        {/* Drifting skill-icon strip — the row scrolls slowly; each icon shows
            its name on hover. Duplicated once for a seamless marquee loop. */}
        <div className="hero-skills" aria-label="Tech stack">
          <div className="hero-skills-track">
            {[...SKILLS, ...SKILLS].map((s, i) => (
              <span key={i} className="hero-skill" title={s.name}>
                <img src={`/icons/${s.iconSlug}.svg`} alt="" aria-hidden="true" />
                <span className="hero-skill-name">{s.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Order: Resume · GitHub · itch.io · LinkedIn · Get in touch — the
            CTA sits last and morphs IN PLACE into the email+copy+close (same
            slot, no new line). */}
        <div className="hero-card-actions">
          {SITE_LINKS.map((link) => (
            <a key={link.label} className="link-btn" href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
          {contactOpen ? (
            <span className="hero-contact">
              <a className="hero-contact-email" href={`mailto:${SITE_EMAIL}`}>
                {SITE_EMAIL}
              </a>
              <button
                type="button"
                className="hero-copy"
                onClick={() => {
                  navigator.clipboard?.writeText(SITE_EMAIL)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1600)
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button type="button" className="hero-contact-close" aria-label="Close" onClick={() => setContactOpen(false)}>
                &times;
              </button>
            </span>
          ) : (
            <button type="button" className="link-btn hero-cta" onClick={() => setContactOpen(true)}>
              Get in touch
            </button>
          )}
        </div>
      </div>
      </Html>
    </group>
  )
}
