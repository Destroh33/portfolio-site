export interface Skill {
  name: string
  iconSlug: string
}

// iconSlug maps to a devicon slug; vendored as /icons/<iconSlug>.svg (see public/icons/)
export const SKILLS: Skill[] = [
  { name: 'Unreal Engine', iconSlug: 'unrealengine' },
  { name: 'Unity', iconSlug: 'unity' },
  { name: 'C++', iconSlug: 'cplusplus' },
  { name: 'C#', iconSlug: 'csharp' },
  { name: 'Python', iconSlug: 'python' },
  { name: 'TypeScript', iconSlug: 'typescript' },
  { name: 'React', iconSlug: 'react' },
  { name: 'Git', iconSlug: 'git' },
  { name: 'Blender', iconSlug: 'blender' },
  { name: 'Java', iconSlug: 'java' },
  { name: 'Docker', iconSlug: 'docker' },
  { name: 'Node.js', iconSlug: 'nodejs' },
]
