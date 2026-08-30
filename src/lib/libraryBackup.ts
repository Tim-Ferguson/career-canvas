import { parseDeletedResumeRecovery, restoreDeletedResume, type DeletedResumeRecovery } from './deletionRecovery'
import { MAX_DOCUMENT_BYTES, MAX_RESUMES, type ResumeLibrary } from './resume'
import { mergeLibraries, parseLibrary, summarizeLibraryMerge, type LibraryMergeSummary } from './storage'

export const LIBRARY_BACKUP_FORMAT = 'career-canvas-library'
export const MAX_LIBRARY_BACKUP_BYTES = MAX_DOCUMENT_BYTES * (MAX_RESUMES + 1) + 4_096

export interface LibraryBackup {
  format: typeof LIBRARY_BACKUP_FORMAT
  schemaVersion: 2
  exportedAt: string
  library: ResumeLibrary
  deletedRecovery: DeletedResumeRecovery | null
}

export interface ParsedLibraryBackup extends LibraryBackup {
  sourceSchemaVersion: 1 | 2
}

export type BackupRecoveryDisposition = 'not-included' | 'already-present' | 'restore' | 'restore-copy'

export interface LibraryBackupRestoreSummary {
  library: LibraryMergeSummary
  recoveryDisposition: BackupRecoveryDisposition
  recoveryAddsDocument: boolean
  requiredSlots: number
  resultingDocuments: number
  exceedsLimit: boolean
}

export interface LibraryBackupRestoreResult {
  library: ResumeLibrary
  summary: LibraryBackupRestoreSummary
}

function validExportedAt(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && !Number.isNaN(Date.parse(value))
}

export function createLibraryBackup(
  library: ResumeLibrary,
  deletedRecovery: DeletedResumeRecovery | null = null,
  exportedAt = new Date().toISOString(),
): LibraryBackup {
  if (!validExportedAt(exportedAt)) throw new Error('Library backup has an invalid export date.')
  return {
    format: LIBRARY_BACKUP_FORMAT,
    schemaVersion: 2,
    exportedAt,
    library: parseLibrary(library),
    deletedRecovery: deletedRecovery ? parseDeletedResumeRecovery(deletedRecovery) : null,
  }
}

export function parseLibraryBackup(value: unknown): ParsedLibraryBackup {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Library backup must be an object.')
  const raw = value as Record<string, unknown>
  if (raw.format !== LIBRARY_BACKUP_FORMAT || (raw.schemaVersion !== 1 && raw.schemaVersion !== 2)) throw new Error('This is not a supported Career Canvas library backup.')
  if (!validExportedAt(raw.exportedAt)) throw new Error('Library backup has an invalid export date.')
  if (raw.schemaVersion === 2 && !Object.prototype.hasOwnProperty.call(raw, 'deletedRecovery')) throw new Error('This schema v2 backup is missing its deleted-recovery field.')
  return {
    format: LIBRARY_BACKUP_FORMAT,
    schemaVersion: 2,
    sourceSchemaVersion: raw.schemaVersion,
    exportedAt: raw.exportedAt,
    library: parseLibrary(raw.library),
    deletedRecovery: raw.schemaVersion === 2 && raw.deletedRecovery !== null ? parseDeletedResumeRecovery(raw.deletedRecovery) : null,
  }
}

function validateParsedLibraryBackup(backup: ParsedLibraryBackup): ParsedLibraryBackup {
  const sourceSchemaVersion = backup.sourceSchemaVersion
  const parsed = parseLibraryBackup(backup)
  return { ...parsed, sourceSchemaVersion: sourceSchemaVersion === 1 ? 1 : 2 }
}

export function summarizeLibraryBackupRestore(current: ResumeLibrary, backup: ParsedLibraryBackup): LibraryBackupRestoreSummary {
  const base = parseLibrary(current)
  const parsedBackup = validateParsedLibraryBackup(backup)
  const library = summarizeLibraryMerge(base, parsedBackup.library)
  let recoveryDisposition: BackupRecoveryDisposition = 'not-included'
  let recoveryAddsDocument = false
  if (parsedBackup.deletedRecovery) {
    const recoveryDocument = parsedBackup.deletedRecovery.document
    const knownDocuments = [...base.documents, ...parsedBackup.library.documents]
    const alreadyPresent = knownDocuments.some((document) => JSON.stringify(document) === JSON.stringify(recoveryDocument))
    const idCollision = knownDocuments.some((document) => document.id === recoveryDocument.id)
    recoveryDisposition = alreadyPresent ? 'already-present' : idCollision ? 'restore-copy' : 'restore'
    recoveryAddsDocument = !alreadyPresent
  }
  const requiredSlots = library.requiredSlots + (recoveryAddsDocument ? 1 : 0)
  const resultingDocuments = base.documents.length + requiredSlots
  return {
    library,
    recoveryDisposition,
    recoveryAddsDocument,
    requiredSlots,
    resultingDocuments,
    exceedsLimit: resultingDocuments > MAX_RESUMES,
  }
}

export function restoreLibraryBackup(current: ResumeLibrary, backup: ParsedLibraryBackup): LibraryBackupRestoreResult {
  const base = parseLibrary(current)
  const parsedBackup = validateParsedLibraryBackup(backup)
  const summary = summarizeLibraryBackupRestore(base, parsedBackup)
  if (summary.exceedsLimit) throw new Error(`Restoring this backup needs ${summary.requiredSlots} open ${summary.requiredSlots === 1 ? 'slot' : 'slots'} and would exceed the ${MAX_RESUMES}-resume device limit.`)
  let restored = mergeLibraries(base, parsedBackup.library)
  if (parsedBackup.deletedRecovery && summary.recoveryAddsDocument) {
    restored = restoreDeletedResume(restored, parsedBackup.deletedRecovery).library
  }
  return { library: { ...restored, activeId: base.activeId }, summary }
}
