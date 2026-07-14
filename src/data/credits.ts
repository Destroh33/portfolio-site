export interface Credit {
  label: string
  detail: string
  href?: string
}

// "Built with" — the site's own stack.
export const BUILT_WITH: Credit[] = [
  { label: 'Astro', detail: 'static site framework', href: 'https://astro.build' },
  { label: 'Three.js + react-three-fiber', detail: '3D scene', href: 'https://r3f.docs.pmnd.rs' },
  { label: 'nanostores', detail: 'state', href: 'https://github.com/nanostores/nanostores' },
]

// Asset attributions. The two 3D models are CC-BY-4.0 and REQUIRE crediting —
// keep these accurate (see each model's license.txt / Sketchfab page).
export const ATTRIBUTIONS: Credit[] = [
  {
    label: '"Rocket Ship - Low Poly"',
    detail: 'by Billy Jackman — CC-BY-4.0',
    href: 'https://sketchfab.com/3d-models/rocket-ship-low-poly-96858de4225f42048c88be630697f9cb',
  },
  {
    label: '"Asteroid 01"',
    detail: 'by exabyte — CC-BY-4.0',
    href: 'https://sketchfab.com/3d-models/asteroid-01-df95d3da67aa4c769ec81394e0b0ffef',
  },
  {
    label: 'Ambient music',
    detail: 'from Pixabay',
    href: 'https://pixabay.com/music/main-title-violin-299793/',
  },
  {
    label: 'Whoosh SFX',
    detail: 'from Pixabay',
    href: 'https://pixabay.com/sound-effects/film-special-effects-simple-whoosh-02-433006/',
  },
  {
    label: 'Boom SFX',
    detail: 'from Pixabay',
    href: 'https://pixabay.com/sound-effects/suspenseful-boom-451863/',
  },
]

export const CREDITS_REPO = 'https://github.com/Destroh33/portfolio-site'
export const CREDITS_CLOSING = 'Thanks for flying through. — Krishna'
