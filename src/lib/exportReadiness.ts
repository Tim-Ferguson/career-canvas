import { analyzeResume, safeFilename, type ResumeAnalysis, type ResumeDocument, type ResumeIssue } from './resume'

export interface ExportPreflight {
  analysis: ResumeAnalysis
  essentialIssues: ResumeIssue[]
  sampleContent: boolean
  renderedPages: number | null
  pagePressure: boolean
  filenameBase: string
  needsConfirmation: boolean
}

export function exportFilenameBase(resume: ResumeDocument): string {
  const libraryTitle = resume.title.trim()
  if (libraryTitle && !/^untitled resume$/i.test(libraryTitle)) return safeFilename(libraryTitle)
  return safeFilename([resume.profile.name, resume.targetRole, 'resume'].filter((value) => value.trim()).join(' '))
}

export function buildExportPreflight(resume: ResumeDocument, renderedPages?: number): ExportPreflight {
  const analysis = analyzeResume(resume)
  const essentialIssues = analysis.issues.filter((issue) => issue.severity === 'essential')
  const safeRenderedPages = typeof renderedPages === 'number' && Number.isFinite(renderedPages) && renderedPages > 0 ? Math.ceil(renderedPages) : null
  const pagePressure = safeRenderedPages !== null && safeRenderedPages > 2
  return {
    analysis,
    essentialIssues,
    sampleContent: essentialIssues.some((issue) => issue.id === 'sample-content'),
    renderedPages: safeRenderedPages,
    pagePressure,
    filenameBase: exportFilenameBase(resume),
    needsConfirmation: essentialIssues.length > 0 || pagePressure,
  }
}

export function exportConfirmationMessage(preflight: ExportPreflight, outputLabel: 'PDF' | 'plain-text file' | 'JSON Resume file'): string {
  const notes: string[] = []
  if (preflight.sampleContent) notes.push('Fictional starter identity or evidence is still present. Do not send it as your own work.')
  const otherEssential = preflight.essentialIssues.filter((issue) => issue.id !== 'sample-content')
  if (otherEssential.length) {
    const titles = otherEssential.slice(0, 4).map((issue) => issue.title).join('; ')
    notes.push(`The editorial review has ${otherEssential.length} other essential ${otherEssential.length === 1 ? 'item' : 'items'}: ${titles}${otherEssential.length > 4 ? '; and more' : ''}.`)
  }
  if (preflight.pagePressure && preflight.renderedPages !== null) notes.push(`The rendered resume currently spans ${preflight.renderedPages} pages. That can be appropriate for academic or specialized CVs; verify it matches this reader’s expectations.`)
  return [`Before creating the ${outputLabel}:`, ...notes.map((note) => `• ${note}`), 'Continue only if this is an intentional draft or you have verified these points.'].join('\n\n')
}
