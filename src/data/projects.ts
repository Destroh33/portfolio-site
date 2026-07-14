export type ProjectTier = 'flagship' | 'belt'
export type ProjectStatus = 'active' | 'complete' | 'research' | 'placeholder'

export interface ProjectMedia {
  type: 'youtube' | 'slides' | 'image'
  src: string
}

export interface ProjectLinks {
  github?: string
  demo?: string
  slides?: string
}

export interface Project {
  id: string
  name: string
  tier: ProjectTier
  order: number
  icon: string
  description: string
  isPlaceholder?: boolean
  status: ProjectStatus
  tags: string[]
  media: ProjectMedia | null
  links: ProjectLinks
}

export const PROJECTS: Project[] = [
  // ─── Flagship (5), scroll order per locked plan ────────────────────────
  {
    id: 'broken-peaces',
    name: 'Broken Peaces',
    tier: 'flagship',
    order: 1,
    icon: 'broken-peaces',
    description:
      "A 2.5D combat platformer built in Unreal Engine 5, featuring fast-paced melee and ranged combat across three interconnected chapters with distinct traversal and combat styles. Won 1st place out of 18 teams at UCLA's Fiat Ludum Game Jam 2026.",
    status: 'complete',
    tags: ['Unreal Engine 5', 'C++', 'Blueprints', '2.5D Physics', 'Combat Systems'],
    media: { type: 'youtube', src: 'https://www.youtube.com/embed/tT6s56HwwCU' },
    links: {},
  },
  {
    id: 'prime-weaver',
    name: 'Prime Weaver',
    tier: 'flagship',
    order: 2,
    icon: 'spider',
    description:
      'A third-person wizard arena game focused on responsive spellcasting and combo-based combat.',
    status: 'active',
    tags: ['Unreal Engine 5', 'C++', 'Blueprints', 'Arena Combat', 'Combo Systems'],
    media: { type: 'youtube', src: 'https://www.youtube.com/embed/BOdZzJk2aG8' },
    links: {
      github: 'https://github.com/Destroh33/PrimeWeaver',
      demo: 'https://destroh3.itch.io/prime-weaver',
    },
  },
  {
    id: 'motomania',
    name: 'MotoMania',
    tier: 'flagship',
    order: 4,
    icon: 'motomania',
    description:
      'A solo-developed time trial motorcycle racing game built in Unity 6, featuring physics-based bike handling, drift/skid mechanics, and a global online leaderboard for competitive lap times.',
    status: 'complete',
    tags: ['Unity 6', 'C#', 'Physics-Based Handling', 'Online Leaderboard'],
    media: { type: 'image', src: '/images/motomania.png' },
    links: {
      github: 'https://github.com/Destroh33/RacingGame',
      demo: 'https://destroh3.itch.io/motomania',
    },
  },
  {
    id: 'vr-lab',
    name: 'Cross Movements Disorder Lab — UCLA',
    tier: 'flagship',
    order: 3,
    icon: 'vr-lab',
    description:
      "Building immersive VR environments in Unreal Engine and Unity for clinical research on Parkinson's disease, supporting studies on 'freezing of gait' and patient motor responses to environmental stimuli. Includes MetaHuman AI navigation configuration and a custom Unity C# runtime scene configuration system.",
    isPlaceholder: true,
    status: 'research',
    tags: ['Unreal Engine 5', 'Unity', 'C#', 'Unity XR Interaction Toolkit', 'MetaHuman AI'],
    media: null,
    links: {},
  },
  {
    id: 'ai-guide',
    name: 'AI Tour Guide',
    tier: 'flagship',
    order: 5,
    icon: 'pin',
    description: 'A mobile app that generates customized, location-aware narrated walking tours.',
    status: 'active',
    tags: ['React Native', 'Expo', 'TypeScript', 'Node.js', 'Gemini LLM API', 'REST API'],
    media: {
      type: 'slides',
      src: 'https://docs.google.com/presentation/d/e/2PACX-1vT3_dJob6AGEyxE7Sdgf7qDnUbM4BuNaKNTTt-QEHrQ946jE5tByDdom_lpcqTNc3osH9iDuVa6ZD5o/embed',
    },
    links: {
      github: 'https://github.com/JCVillanova/ai-tour-guide-cs35l-project',
      slides:
        'https://docs.google.com/presentation/d/e/2PACX-1vT3_dJob6AGEyxE7Sdgf7qDnUbM4BuNaKNTTt-QEHrQ946jE5tByDdom_lpcqTNc3osH9iDuVa6ZD5o/pub',
    },
  },

  // ─── Belt (4), lightweight hover-popup only ────────────────────────────
  {
    id: 'rebel-stars',
    name: 'Rebel Stars',
    tier: 'belt',
    order: 1,
    icon: 'xwing',
    description:
      'A 1v1 starfighter dogfight prototype with tight controls and latency-optimized networking.',
    status: 'active',
    tags: ['Unity', 'C#', 'FishNet Networking', 'Edgegap Hosting'],
    media: { type: 'youtube', src: 'https://www.youtube.com/embed/K7MxGe22dZA' },
    links: {
      github: 'https://github.com/Destroh33/PlaneFighter',
      demo: 'https://destroh3.itch.io/rebelstars',
    },
  },
  {
    id: 'vr-shooter',
    name: 'VR Shooter',
    tier: 'belt',
    order: 2,
    icon: 'vr',
    description:
      'A VR Target Shooter made in Unity as a demo for the ACM Studio Winter 2025 "VR in Unity" Workshop Track.',
    status: 'active',
    tags: ['Unity', 'C#', 'Unity XR Interaction Toolkit', 'VR'],
    media: { type: 'youtube', src: 'https://youtube.com/embed/G5bI9HSazDw' },
    links: { github: 'https://github.com/Destroh33/VRWSTest2' },
  },
  {
    id: 'oitc',
    name: 'One in the Chamber',
    tier: 'belt',
    order: 3,
    icon: 'gun',
    description: 'A gun-based puzzle game made for Studio Jam 2025.',
    status: 'complete',
    tags: ['Unity', 'C#', 'Puzzle Mechanics'],
    media: { type: 'image', src: '/images/oitc.png' },
    links: { demo: 'https://jomnaq.itch.io/one-in-the-chamber' },
  },
  {
    id: 'slimesara',
    name: 'Slimesara',
    tier: 'belt',
    order: 4,
    icon: 'slime',
    description: 'A puzzle platformer about escaping a mutation lab.',
    status: 'complete',
    tags: ['Unity', 'C#', '2D Platformer'],
    media: { type: 'image', src: '/images/slimesara.png' },
    links: { demo: 'https://destroh3.itch.io/slimesara' },
  },
]

export const FLAGSHIPS = PROJECTS.filter((p) => p.tier === 'flagship').sort((a, b) => a.order - b.order)
export const BELT = PROJECTS.filter((p) => p.tier === 'belt').sort((a, b) => a.order - b.order)
