import { analyzeResume, type ResumeAnalysis, type ResumeDocument, type ResumeLibrary } from './resume'

export const STALE_LIBRARY_VERSION_DAYS = 180

export type LibrarySort = 'updated' | 'attention' | 'title' | 'target'

export interface LibraryResumeInsight {
  resume: ResumeDocument
  analysis: ResumeAnalysis
  essentialIssues: number
  sameContent: boolean
  stale: boolean
  updatedTimestamp: number | null
}

function contentKey(resume: ResumeDocument): string {
  return JSON.stringify({
    schemaVersion: resume.schemaVersion,
    targetRole: resume.targetRole,
    industry: resume.industry,
    profile: resume.profile,
    settings: resume.settings,
    sections: resume.sections,
  })
}

export function buildLibraryInsights(library: ResumeLibrary, now = Date.now()): LibraryResumeInsight[] {
  const keys = library.documents.map(contentKey)
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return library.documents.map((resume, index) => {
    const parsedTimestamp = Date.parse(resume.updatedAt)
    const updatedTimestamp = Number.isNaN(parsedTimestamp) ? null : parsedTimestamp
    const analysis = analyzeResume(resume)
    return {
      resume,
      analysis,
      essentialIssues: analysis.issues.filter((issue) => issue.severity === 'essential').length,
      sameContent: (counts.get(keys[index]!) ?? 0) > 1,
      stale: updatedTimestamp !== null && now - updatedTimestamp >= STALE_LIBRARY_VERSION_DAYS * 24 * 60 * 60 * 1000,
      updatedTimestamp,
    }
  })
}

function textCompare(left: string, right: string): number {
  const normalizedLeft = left.trim()
  const normalizedRight = right.trim()
  if (!normalizedLeft && normalizedRight) return 1
  if (normalizedLeft && !normalizedRight) return -1
  return normalizedLeft.localeCompare(normalizedRight, undefined, { sensitivity: 'base' })
}

function newestFirst(left: LibraryResumeInsight, right: LibraryResumeInsight): number {
  return (right.updatedTimestamp ?? Number.NEGATIVE_INFINITY) - (left.updatedTimestamp ?? Number.NEGATIVE_INFINITY)
}

export function sortLibraryInsights(insights: readonly LibraryResumeInsight[], sort: LibrarySort): LibraryResumeInsight[] {
  return [...insights].sort((left, right) => {
    if (sort === 'attention') {
      return right.essentialIssues - left.essentialIssues
        || left.analysis.score - right.analysis.score
        || right.analysis.issues.length - left.analysis.issues.length
        || newestFirst(left, right)
    }
    if (sort === 'title') return textCompare(left.resume.title, right.resume.title) || newestFirst(left, right)
    if (sort === 'target') return textCompare(left.resume.targetRole, right.resume.targetRole) || textCompare(left.resume.title, right.resume.title)
    return newestFirst(left, right) || textCompare(left.resume.title, right.resume.title)
  })
}
