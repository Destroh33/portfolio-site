import { useStore } from '@nanostores/react'
import { Html } from '@react-three/drei'
import { planetFramesAtom } from '../../stores/flybyLayout'
import { flybySequenceAtom } from '../../stores/flybySequence'
import { narrowViewportAtom } from '../../stores/device'
import { FLAGSHIPS, type Project } from '../../data/projects'

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

function Embed({ project }: { project: Project }) {
  const media = project.media
  if (!media) return null
  if (media.type === 'image') {
    return <img className="flyby-embed" src={media.src} alt={`${project.name} screenshot`} loading="lazy" />
  }
  return (
    <iframe
      className="flyby-embed"
      src={media.src}
      title={`${project.name} embed`}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
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
            <div
              className={narrow ? 'flyby-blurb is-stacked' : 'flyby-blurb'}
              style={{
                opacity: blend,
                // Slides in from the outboard side as the camera settles.
                // Centered on phone, so no lateral slide there.
                transform: narrow ? undefined : `translateX(${(1 - blend) * 70}px)`,
              }}
            >
              <div className="flyby-blurb-text">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                {project.tags.length > 0 && (
                  <ul className="flyby-tags">
                    {project.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
                <div className="flyby-blurb-links">
                  {project.links.github && (
                    <a href={project.links.github} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  )}
                  {project.links.demo && (
                    <a href={project.links.demo} target="_blank" rel="noreferrer">
                      Play
                    </a>
                  )}
                  {project.links.slides && (
                    <a href={project.links.slides} target="_blank" rel="noreferrer">
                      Slides
                    </a>
                  )}
                </div>
              </div>
              {project.media && (
                <div className="flyby-blurb-embed">
                  <Embed project={project} />
                </div>
              )}
            </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}
