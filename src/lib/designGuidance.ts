import { entryHasRenderableContent, type ResumeDocument } from './resume'

export interface DesignGuidanceAction {
  id: 'edit-content' | 'use-academic' | 'compare-compact' | 'use-balanced'
  label: string
  settings?: Partial<ResumeDocument['settings']>
}

export interface DesignGuidance {
  title: string
  detail: string
  tone: 'ready' | 'attention'
  actions: DesignGuidanceAction[]
}

export function buildDesignGuidance(resume: ResumeDocument, renderedPages: number): DesignGuidance {
  const pages = Math.max(1, renderedPages)
  const publicationEntries = resume.sections
    .filter((section) => section.visible && section.kind === 'publications')
    .flatMap((section) => section.entries)
    .filter(entryHasRenderableContent).length
  const cvLike = publicationEntries >= 3

  if (cvLike) {
    const actions: DesignGuidanceAction[] = []
    if (resume.settings.layout !== 'academic') actions.push({ id: 'use-academic', label: 'Try academic layout', settings: { layout: 'academic', fontPair: 'serif' } })
    if (resume.settings.density === 'comfortable' && pages > 2) actions.push({ id: 'use-balanced', label: 'Use balanced spacing', settings: { density: 'balanced' } })
    return {
      title: 'Long-form CV structure detected',
      detail: `${publicationEntries} visible publication ${publicationEntries === 1 ? 'entry' : 'entries'} suggest a document where multiple pages can be appropriate. Preserve readable citations and consistent hierarchy instead of forcing a one-page fit.`,
      tone: 'ready',
      actions,
    }
  }

  if (pages >= 3) {
    const actions: DesignGuidanceAction[] = [{ id: 'edit-content', label: 'Prioritize content' }]
    if (resume.settings.layout !== 'compact') actions.push({ id: 'compare-compact', label: 'Compare compact', settings: { layout: 'compact' } })
    if (resume.settings.density === 'comfortable') actions.push({ id: 'use-balanced', label: 'Use balanced spacing', settings: { density: 'balanced' } })
    return {
      title: `Review this ${pages}-page draft before compressing it`,
      detail: 'Lead with relevance and remove repetition first. A longer document may be right for a CV or specialized application, but tight type should be the last adjustment.',
      tone: 'attention',
      actions,
    }
  }

  if (pages === 2) {
    const actions: DesignGuidanceAction[] = [{ id: 'edit-content', label: 'Review page-two value' }]
    if (resume.settings.layout !== 'compact') actions.push({ id: 'compare-compact', label: 'Compare compact', settings: { layout: 'compact' } })
    return {
      title: 'Make the second page earn its place',
      detail: 'Two pages can be entirely appropriate when page two carries relevant evidence. Check that it starts cleanly and does not contain only a stranded line or section heading.',
      tone: 'ready',
      actions,
    }
  }

  if (resume.settings.density === 'tight') {
    return {
      title: 'There is room to restore breathing space',
      detail: 'This resume already fits on one rendered page with tight spacing. Balanced spacing may improve scanning without changing the content.',
      tone: 'ready',
      actions: [{ id: 'use-balanced', label: 'Try balanced spacing', settings: { density: 'balanced' } }],
    }
  }

  return {
    title: 'The current design fits one rendered page',
    detail: 'Use the live preview to judge hierarchy and readability. A one-page result is useful when the evidence is complete, not as a goal that overrides relevance.',
    tone: 'ready',
    actions: [],
  }
}
