import type { ResumeDocument } from './resume'

export interface AdvancedDraftAnchor {
  resumeId: string
  snapshot: string
}

export function createAdvancedDraftAnchor(resume: ResumeDocument): AdvancedDraftAnchor {
  return {
    resumeId: resume.id,
    snapshot: JSON.stringify(resume),
  }
}

export function advancedDraftIsStale(anchor: AdvancedDraftAnchor, resume: ResumeDocument): boolean {
  return anchor.resumeId !== resume.id || anchor.snapshot !== JSON.stringify(resume)
}
