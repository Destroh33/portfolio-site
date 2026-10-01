import { useRef, type CSSProperties } from 'react'
import { useStore } from '@nanostores/react'
import { Html } from '@react-three/drei'
import { planetFramesAtom } from '../../stores/flybyLayout'
import { flybySequenceAtom } from '../../stores/flybySequence'
import { narrowViewportAtom } from '../../stores/device'
import { openVideoAtom } from '../../stores/videoModal'
import { FLAGSHIPS, type Project } from '../../data/projects'
import { PROJECT_TINT } from '../shard'
import ShardFacets from './ShardFacets'
import { useCardTilt } from './useCardTilt'

// Phone: distanceFactor for the CENTERED card. Lower = larger on screen. This
// is a calibration constant — tuned against a real phone-width render so the
// stacked card fills the frame without clipping. (Desktop stays at 900.)
// In THIS scene's setup, HIGHER distanceFactor = bigger on screen (the outer
// object-scale term dominates). Tuned high so the centered stacked card fills
// the phone frame. (Desktop uses 900 for the small side-by-side pose.)
const PHONE_BLURB_FACTOR = 1300
// World size + peak opacity of the dark backing plane behind the centered
// phone card. Big enough to cover the card's footprint; opacity kept low so
// the scene stays visible through it (scales with the fade-in blend).
const PHONE_SCRIM_SIZE = 900
const PHONE_SCRIM_OPACITY = 0.4

function Embed({ project, narrow }: { project: Project; narrow: boolean }) {
  const media = project.media
  if (!media) return null

  // Phone: an inline iframe inside the 3D-transformed card won't render on iOS
  // Safari and isn't tappable on Android. So on phone, videos become a button
  // that opens a flat screen-space overlay (VideoModal), and image embeds are
  // dropped entirely (the screenshot adds little on a small screen, and the
  // links still reach the project).
  if (narrow) {
    if (media.type === 'image') return null
    return (
      <button
        type="button"
        className="shard-btn flyby-embed-btn"
        onClick={() => openVideoAtom.set({ src: media.src, title: `${project.name} ${media.label ?? 'trailer'}` })}
      >
        <span>▶ Watch {media.label ?? 'trailer'}</span>
      </button>
    )
  }

  // Frame corners are cut by overlay triangles rather than clip-path, so the
  // iframe never sits inside a clipped ancestor (keeps it clickable in 3D).
  if (media.type === 'image') {
    return (
      <div className="shard-frame">
        <img className="flyby-embed" src={media.src} alt={`${project.name} screenshot`} loading="lazy" />
      </div>
    )
  }
  return (
    <div className="shard-frame">
      <iframe
        className="flyby-embed"
        src={media.src}
        title={`${project.name} embed`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// World-space popups anchored to each planet (via drei's Html), fading in only
// while the camera is blending into that planet's cinematic side-on shot.
// Layout mirrors the storyboard: text + links on the left, embed on the right.
export default function FlybyBlurbs() {
  const frames = useStore(planetFramesAtom)
  const seq = useStore(flybySequenceAtom)
  const narrow = useStore(narrowViewportAtom)
  const framesById = Object.fromEntries(frames.map((f) => [f.id, f]))
  // Only one card is ever mounted at a time, so one tilt ref covers it.
  const tiltRef = useRef<HTMLDivElement>(null)
  useCardTilt(tiltRef)

  return (
    <>
      {FLAGSHIPS.map((project) => {
        const frame = framesById[project.id]
        // Only the currently-active planet shows its blurb, faded by the
        // sequence blend (raw 0-1 clock value — a plain fade is fine here).
        const blend = seq.activeId === project.id ? seq.blend : 0
        if (!frame || blend < 0.02) return null

        // Phone: instead of sitting outboard next to the planet (where the
        // narrow FOV pushes it off-screen), the card is centered on the shot —
        // anchored at the camera's look point (= screen center) and scaled up
        // to fill the frame. Desktop keeps the storyboard's side-by-side pose.
        const anchorPos = narrow ? frame.camLookAt : frame.blurbPosition
        const factor = narrow ? PHONE_BLURB_FACTOR : 900

        return (
          <group key={project.id}>
            {/* Phone: a large, faintly dark billboarded plane just behind the
                centered card, so its text reads over the busy starfield/nebula
                while the scene stays visible through it. DOM (the Html card)
                always composites in front of WebGL, so this naturally sits
                behind the card. */}
            {narrow && (
              <mesh position={anchorPos} rotation={frame.blurbRotation}>
                <planeGeometry args={[PHONE_SCRIM_SIZE, PHONE_SCRIM_SIZE]} />
                <meshBasicMaterial
                  color="#04050b"
                  transparent
                  opacity={blend * PHONE_SCRIM_OPACITY}
                  depthWrite={false}
                />
              </mesh>
            )}
            <Html
              transform
              position={anchorPos}
              rotation={frame.blurbRotation}
              occlude={false}
              distanceFactor={factor}
              style={{ pointerEvents: blend > 0.5 ? 'auto' : 'none' }}
            >
            <div ref={tiltRef}>
            <div
              className={[
                'shard flyby-blurb',
                narrow && 'is-stacked',
                // Past halfway the shard assembles (CSS transitions); dropping
                // back below reverses it on fly-out.
                blend > 0.5 && 'is-in',
                project.name.length > 20 && 'has-long-name',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  '--tint': PROJECT_TINT[project.id] ?? '#7dd3fc',
                  opacity: blend,
                  // Slides in from the outboard side as the camera settles.
                  // Centered on phone, so no lateral slide there.
                  transform: narrow ? undefined : `translateX(${(1 - blend) * 70}px)`,
                } as CSSProperties
              }
            >
              <div className="shard-plate">
                <h3>{project.name}</h3>
              </div>
              <div className="shard-panel">
                <div className="shard-bg" aria-hidden="true">
                  <ShardFacets seed={project.order} />
                </div>
                <div className="shard-content flyby-blurb-body">
                  <div className="flyby-blurb-text">
                    <p>{project.description}</p>
                    {project.tags.length > 0 && (
                      <ul className="shard-tags">
                        {project.tags.map((tag) => (
                          <li key={tag}>
                            <span>{tag}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="shard-actions">
                      {project.links.github && (
                        <a className="shard-btn" href={project.links.github} target="_blank" rel="noreferrer">
                          <span>GitHub</span>
                        </a>
                      )}
                      {project.links.demo && (
                        <a className="shard-btn" href={project.links.demo} target="_blank" rel="noreferrer">
                          <span>Play</span>
                        </a>
                      )}
                      {project.links.slides && (
                        <a className="shard-btn" href={project.links.slides} target="_blank" rel="noreferrer">
                          <span>Slides</span>
                        </a>
                      )}
                      {project.links.youtube && (
                        <a className="shard-btn" href={project.links.youtube} target="_blank" rel="noreferrer">
                          <span>YouTube</span>
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Skip the embed slot entirely for the one case that renders
                      nothing (phone + image), so there's no empty box. */}
                  {project.media && !(narrow && project.media.type === 'image') && (
                    <div className="flyby-blurb-embed">
                      <Embed project={project} narrow={narrow} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}
