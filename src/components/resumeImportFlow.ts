import { MAX_RESUMES, containsStarterSampleContent, type ResumeDocument, type ResumeLibrary } from '../lib/resume'
import { isDocumentUpload, readResumeUpload, type ResumeUploadFormat } from '../lib/resumeUpload'

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function describeSource(format: ResumeUploadFormat): string {
  if (format === 'json-resume') return 'Source: JSON Resume. Timo’s Resume Maker will convert its portable content into strict schema v2.'
  if (format === 'career-canvas-v1') return 'Source: Timo’s Resume Maker v1. It will migrate automatically to schema v2.'
  if (format === 'career-canvas-v2') return 'Source: Timo’s Resume Maker schema v2.'
  const label = format === 'pdf' ? 'a PDF' : format === 'docx' ? 'a Word document' : 'a text file'
  return `Source: ${label}, read on this device. Nothing was uploaded. Headings, dates and bullets were matched by rule into schema v2, so treat the result as a first draft.`
}

function describeFound(resume: ResumeDocument): string {
  const entries = resume.sections.reduce((total, section) => total + section.entries.length, 0)
  const contact = [resume.profile.name ? 'a name' : '', resume.profile.email ? 'an email address' : '', resume.profile.phone ? 'a phone number' : ''].filter(Boolean)
  return `Found ${contact.length ? contact.join(', ') : 'no contact details'}, ${countLabel(resume.sections.length, 'section')} (${resume.sections.map((section) => section.title).join(', ') || 'none'}) and ${countLabel(entries, 'entry', 'entries')}.`
}

/**
 * Shared upload flow for the Data workspace and the new-resume dialog: read the file,
 * disclose what will change, then add it as a new active version.
 */
export async function importResumeFile({ file, library, onImport, announce }: {
  file: File | undefined
  library: ResumeLibrary
  onImport: (resume: ResumeDocument) => boolean
  announce: (message: string) => void
}): Promise<boolean> {
  if (!file) return false
  try {
    announce(`Reading ${file.name} on this device…`)
    const importResult = await readResumeUpload(file.name, new Uint8Array(await file.arrayBuffer()))
    const imported = importResult.document
    const fromDocument = isDocumentUpload(importResult.format)
    const sameId = library.documents.find((document) => document.id === imported.id)
    if (sameId && JSON.stringify(sameId) === JSON.stringify(imported)) {
      announce(`Import skipped: “${imported.title || 'Untitled resume'}” is already in this library unchanged.`)
      return false
    }
    if (library.documents.length >= MAX_RESUMES) throw new Error(`Your device library is full at ${MAX_RESUMES} resumes. Export and remove one before importing.`)
    const details = [
      `Import “${imported.title || 'Untitled resume'}” from ${file.name}?`,
      describeSource(importResult.format),
      fromDocument ? describeFound(imported) : `Target: ${imported.targetRole || 'not specified'}. Industry: ${imported.industry || 'not specified'}. ${countLabel(imported.sections.length, 'section')}.`,
      sameId ? 'Its internal ID matches an existing version, so Timo’s Resume Maker will assign a new ID and “copy” title.' : '',
      containsStarterSampleContent(imported) ? 'Warning: this file still contains fictional starter content.' : '',
      ...importResult.warnings.map((warning) => `Note: ${warning}`),
      fromDocument ? 'Compare every field with your original before you send this resume anywhere.' : '',
      'The imported file will become active; every existing version stays unchanged.',
    ].filter(Boolean).join('\n\n')
    if (!window.confirm(details)) {
      announce('Resume import canceled. Your library is unchanged.')
      return false
    }
    if (!onImport({ ...imported, updatedAt: new Date().toISOString() })) return false
    announce(`Imported “${imported.title || 'Untitled resume'}” from ${file.name}${importResult.format === 'json-resume' ? ' and converted it from JSON Resume' : fromDocument ? ' as a first draft. Check each section against your original' : ''}${fromDocument ? '.' : ' as the active resume.'} Existing versions are unchanged.`)
    return true
  } catch (caught) {
    announce(caught instanceof Error ? `Import refused: ${caught.message}` : 'Import refused.')
    return false
  }
}
