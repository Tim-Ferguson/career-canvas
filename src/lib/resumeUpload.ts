import { MAX_DOCUMENT_BYTES, parseResumeImportJson, type ResumeDocument, type ResumeImportFormat } from './resume'
import { MAX_RESUME_FILE_BYTES, extractResumeFileText, sniffResumeFile, type PdfJsLoader, type ResumeFileKind } from './resumeFileText'
import { importResumeText } from './resumeTextImport'

export type ResumeUploadFormat = ResumeImportFormat | ResumeFileKind

export interface ResumeUploadResult {
  document: ResumeDocument
  format: ResumeUploadFormat
  warnings: string[]
}

/** File-picker filter for every format the importer reads. */
export const RESUME_UPLOAD_ACCEPT = 'application/json,.json,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/plain,.txt,text/markdown,.md'

const SOURCE_LABELS: Readonly<Record<ResumeFileKind, string>> = { pdf: 'PDF', docx: 'Word', text: 'text' }

export function isDocumentUpload(format: ResumeUploadFormat): format is ResumeFileKind {
  return format === 'pdf' || format === 'docx' || format === 'text'
}

/** Reads resume JSON as before, or converts a PDF, Word or text resume into a schema v2 draft. */
export async function readResumeUpload(name: string, bytes: Uint8Array, loadPdfJs?: PdfJsLoader): Promise<ResumeUploadResult> {
  if (bytes.byteLength > MAX_RESUME_FILE_BYTES) throw new Error('File is larger than the 10 MB limit for PDF, Word and text resumes.')
  if (sniffResumeFile(name, bytes) === 'json') {
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new Error('File is larger than the 2 MB safety limit.')
    return parseResumeImportJson(new TextDecoder().decode(bytes))
  }
  const extracted = await extractResumeFileText(name, bytes, loadPdfJs)
  const imported = importResumeText(extracted.lines, { sourceLabel: SOURCE_LABELS[extracted.kind], links: extracted.links })
  return { document: imported.document, format: extracted.kind, warnings: [...extracted.warnings, ...imported.warnings] }
}
