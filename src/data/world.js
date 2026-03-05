export const WORLD_W = 6300

export const ZONES = [
  { name: 'INTRO',     x: 0,    endX: 1400 },
  { name: 'QUEST LOG', x: 1400, endX: 4000 },
  { name: 'GALLERY',   x: 4000, endX: 5700 },
  { name: '???',       x: 5700, endX: WORLD_W },
]

export function getZone(playerX) {
  for (const z of ZONES) if (playerX < z.endX) return z.name
  return ZONES[ZONES.length - 1].name
}

export function buildPlatforms(groundY) {
  const p = (x, ya, w, h = 16) => ({ x, y: groundY - ya, w, h })
  return [
    // Main ground
    { x: 0,    y: groundY, w: 5710, h: 80 },
    // Secret island (gap at 5710–5960)
    { x: 5960, y: groundY, w: 400,  h: 80 },

    // Zone 1 — INTRO
    p(180,  80,  120),
    p(420,  120, 100),
    p(660,  70,  140),
    p(880,  100, 100),
    p(1100, 60,  160),

    // Zone 2 — QUEST LOG
    p(1700, 80,  110),
    p(1950, 110, 90),
    p(2200, 70,  110),
    p(2460, 90,  100),
    p(2730, 80,  100),
    p(2980, 60,  100),
    p(3240, 100, 110),
    p(3500, 70,  100),
    p(3750, 90,  120),

    // Zone 3 — GALLERY
    p(4080, 70,  120),
    p(4320, 110, 100),
    p(4580, 80,  120),
    p(4820, 100, 100),
    p(5050, 70,  110),
    p(5310, 90,  100),

    // Stepping stones across the gap
    p(5750, 0,   70),
    p(5820, 45,  60),
    p(5895, 65,  55),

    // Secret zone upper platform
    p(6090, 80,  110),
  ]
}

export function buildEntities(groundY) {
  const gY = groundY
  return [
    // ── Decorative signs (type='sign', not interactable) ──
    { id: 's-start',   type: 'sign', x: 60,   y: gY, label: '→ EXPLORE!',   data: { sub: 'E·INTERACT' } },
    { id: 's-ql',      type: 'sign', x: 1440, y: gY, label: '→ QUEST LOG',  data: {} },
    { id: 's-past',    type: 'sign', x: 3040, y: gY, label: 'PAST QUESTS',  data: { sub: '✓ COMPLETE' } },
    { id: 's-gallery', type: 'sign', x: 4045, y: gY, label: '→ GALLERY',    data: {} },
    { id: 's-danger',  type: 'sign', x: 5610, y: gY, label: '⚠ DANGER',     data: { sub: 'GAP AHEAD' } },
    { id: 's-end',     type: 'sign', x: 6280, y: gY, label: '★ FIN ★',      data: {} },

    // ── Zone 1: Stat board ──
    {
      id: 'stat', type: 'stat', x: 380, y: gY, label: 'WHO AM I?',
      data: {
        skills: [
          { name: 'C++',    value: 80 },
          { name: 'Unity',  value: 90 },
          { name: 'Unreal', value: 72 },
          { name: 'React',  value: 80 },
          { name: 'Python', value: 75 },
        ],
      },
    },

    // ── Zone 2: Active quests ──
    {
      id: 'prime-weaver', type: 'quest', x: 1560, y: gY, label: 'Prime Weaver',
      data: {
        name: 'Prime Weaver',
        description: "A third-person wizard arena game focused on responsive spellcasting and combo-based combat.",
        status: 'active',
        tags: ['Unreal', 'C++', 'Blueprints', 'SRS 2025'],
        embed: 'https://www.youtube.com/embed/BOdZzJk2aG8',
        github: 'https://github.com/Destroh33/PrimeWeaver',
        play: 'https://destroh3.itch.io/prime-weaver',
      },
    },
    {
      id: 'rebel-stars', type: 'quest', x: 1960, y: gY, label: 'Rebel Stars',
      data: {
        name: 'Rebel Stars',
        description: "A 1v1 starfighter dogfight prototype with tight controls and latency-optimized networking.",
        status: 'active',
        tags: ['Unity', 'Networking', 'Multiplayer', 'C#'],
        embed: 'https://www.youtube.com/embed/K7MxGe22dZA',
        github: 'https://github.com/Destroh33/PlaneFighter',
        play: 'https://destroh3.itch.io/rebelstars',
      },
    },
    {
      id: 'vr-shooter', type: 'quest', x: 2360, y: gY, label: 'VR Shooter',
      data: {
        name: 'VR Target Shooter',
        description: 'A VR Target Shooter made in Unity as a demo for the ACM Studio Winter 2025 "VR in Unity" Workshop Track.',
        status: 'active',
        tags: ['Unity', 'VR', 'C#'],
        embed: 'https://youtube.com/embed/G5bI9HSazDw',
        github: 'https://github.com/Destroh33/VRWSTest2',
      },
    },
    {
      id: 'ai-guide', type: 'quest', x: 2760, y: gY, label: 'AI Tour Guide',
      data: {
        name: 'AI Tour Guide',
        description: 'A mobile app that generates customized, location-aware narrated walking tours.',
        status: 'active',
        tags: ['React Native', 'Expo', 'AI', 'TypeScript'],
        embed: 'https://docs.google.com/presentation/d/e/2PACX-1vT3_dJob6AGEyxE7Sdgf7qDnUbM4BuNaKNTTt-QEHrQ946jE5tByDdom_lpcqTNc3osH9iDuVa6ZD5o/embed',
        github: 'https://github.com/JCVillanova/ai-tour-guide-cs35l-project',
        slidesLink: 'https://docs.google.com/presentation/d/e/2PACX-1vT3_dJob6AGEyxE7Sdgf7qDnUbM4BuNaKNTTt-QEHrQ946jE5tByDdom_lpcqTNc3osH9iDuVa6ZD5o/pub',
      },
    },

    // ── Zone 2: Past quests ──
    {
      id: 'oitc', type: 'quest', x: 3160, y: gY, label: 'One in Chamber',
      data: {
        name: 'One in the Chamber',
        description: 'A gun-based puzzle game made for Studio Jam 2025.',
        status: 'complete',
        tags: ['Unity', 'Puzzle', 'C#'],
        image: '/images/oitc.png',
        itch: 'https://jomnaq.itch.io/one-in-the-chamber',
      },
    },
    {
      id: 'slimesara', type: 'quest', x: 3560, y: gY, label: 'Slimesara',
      data: {
        name: 'Slimesara',
        description: 'A puzzle platformer about escaping a mutation lab.',
        status: 'complete',
        tags: ['Unity', 'Puzzle', 'C#'],
        image: '/images/slimesara.png',
        itch: 'https://destroh3.itch.io/slimesara',
      },
    },

    // ── Zone 3: Art frames ──
    { id: 'art-bear',    type: 'art', x: 4200, y: gY, label: 'Bear',        data: { src: '/images/Bear.png',        caption: 'Bear model from Prime Weaver.' } },
    { id: 'art-revolver',type: 'art', x: 4450, y: gY, label: 'Revolver',    data: { src: '/images/revolver.png',    caption: 'Old-fashioned revolver for an FPS.' } },
    { id: 'art-vector',  type: 'art', x: 4700, y: gY, label: 'KRISS Vector',data: { src: '/images/vector.png',      caption: 'KRISS Vector for the VR game.' } },
    { id: 'art-deer',    type: 'art', x: 4950, y: gY, label: 'Deer',        data: { src: '/images/DeerDrawing.jpg', caption: 'Deer sketch.' } },
    { id: 'art-tiger',   type: 'art', x: 5200, y: gY, label: 'Tiger',       data: { src: '/images/TigerDrawing.jpg',caption: 'Tiger sketch.' } },
    { id: 'art-pixel',   type: 'art', x: 5450, y: gY, label: 'Pyramids',    data: { src: '/images/sandsuckers.png', caption: 'Pyramids pixel art for LD58.' } },

    // ── Secret zone: Arena portal ──
    { id: 'portal', type: 'portal', x: 6150, y: gY, label: 'ARENA MODE', data: {} },
  ]
}
