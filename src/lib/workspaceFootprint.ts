import { DELETION_RECOVERY_STORAGE_KEY, type DeletedResumeRecovery } from './deletionRecovery'
import { utf8ByteLength, type ResumeLibrary } from './resume'
import { LIBRARY_STORAGE_KEY } from './storage'

export const WORKSPACE_WATCH_BYTES = 2.5 * 1024 * 1024
export const WORKSPACE_HIGH_BYTES = 4 * 1024 * 1024

export type WorkspacePressure = 'normal' | 'watch' | 'high'

export interface WorkspaceFootprint {
  totalBytes: number
  libraryBytes: number
  recoveryBytes: number
  largestDocumentBytes: number
  recoveryIncluded: boolean
  pressure: WorkspacePressure
}

export function classifyWorkspacePressure(bytes: number): WorkspacePressure {
  if (!Number.isFinite(bytes) || bytes < WORKSPACE_WATCH_BYTES) return 'normal'
  return bytes >= WORKSPACE_HIGH_BYTES ? 'high' : 'watch'
}

export function formatWorkspaceBytes(bytes: number): string {
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, Math.round(bytes)) : 0
  if (safeBytes < 1024) return `${safeBytes} B`
  const kilobytes = safeBytes / 1024
  if (kilobytes < 1024) return `${kilobytes < 10 ? kilobytes.toFixed(1).replace(/\.0$/, '') : Math.round(kilobytes)} KB`
  const megabytes = kilobytes / 1024
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0).replace(/\.0$/, '')} MB`
}

export function buildWorkspaceFootprint(library: ResumeLibrary, deletedRecovery: DeletedResumeRecovery | null): WorkspaceFootprint {
  const serializedLibrary = JSON.stringify(library)
  const libraryBytes = utf8ByteLength(LIBRARY_STORAGE_KEY) + utf8ByteLength(serializedLibrary)
  const recoveryIncluded = Boolean(deletedRecovery && !library.documents.some((document) => JSON.stringify(document) === JSON.stringify(deletedRecovery.document)))
  const recoveryBytes = recoveryIncluded && deletedRecovery ? utf8ByteLength(DELETION_RECOVERY_STORAGE_KEY) + utf8ByteLength(JSON.stringify(deletedRecovery)) : 0
  const largestDocumentBytes = Math.max(0, ...library.documents.map((document) => utf8ByteLength(JSON.stringify(document))))
  const totalBytes = libraryBytes + recoveryBytes
  return { totalBytes, libraryBytes, recoveryBytes, largestDocumentBytes, recoveryIncluded, pressure: classifyWorkspacePressure(totalBytes) }
}
