export const SITE = {
  name: 'Krishna Tholudur',
  role: 'CS @ UCLA · Software Engineer and Game Developer',
  bio: "I'm a CS student at UCLA who likes to make games and other weird interactive software. Check out my projects and art, or click the links to see what I'm up to!",
  portrait: '/images/gcprofile.png',
}

export const SITE_EMAIL = 'krishna.tholudur@gmail.com'

export interface SiteLink {
  label: string
  url: string
}

export const SITE_LINKS: SiteLink[] = [
  { label: 'Resume', url: '/images/KrishnaTholudurResume.pdf' },
  { label: 'GitHub', url: 'https://github.com/Destroh33' },
  { label: 'itch.io', url: 'https://destroh3.itch.io/' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/krishna-tholudur-5b90a5330/' },
]
