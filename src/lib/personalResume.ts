import { validateResume, type ResumeDocument } from './resume'

// Optional, gitignored owner resumes at src/personal/*.json, in filename order. The glob runs
// only inside the function so Node-based tests (no Vite transform) can import this module.
export function loadPersonalResumes(): ResumeDocument[] {
  const modules = import.meta.glob<{ default: unknown }>('../personal/*.json', { eager: true })
  return Object.keys(modules).sort().flatMap((path) => {
    try {
      return [validateResume(modules[path]!.default)]
    } catch (error) {
      console.warn(`Ignoring invalid ${path}`, error)
      return []
    }
  })
}
