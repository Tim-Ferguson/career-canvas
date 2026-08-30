import { MAX_DOCUMENT_BYTES, MAX_RESUMES, createId, migrateResume, type ResumeDocument, type ResumeLibrary } from './resume'
import { parseLibrary } from './storage'

export const DELETION_RECOVERY_STORAGE_KEY = 'career-canvas.deleted-resume.v1'

export interface DeletedResumeRecovery {
  deletedAt: string
  document: ResumeDocument
}

export interface RecoveryRestoreResult {
  library: ResumeLibrary
  restoredAsCopy: boolean
  alreadyPresent: boolean
}

export function createDeletedResumeRecovery(document: ResumeDocument, deletedAt = new Date().toISOString()): DeletedResumeRecovery {
  return { deletedAt, document: migrateResume(document) }
}

export function parseDeletedResumeRecovery(value: unknown): DeletedResumeRecovery {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Deleted resume recovery must be an object.')
  const raw = value as Record<string, unknown>
  if (typeof raw.deletedAt !== 'string' || raw.deletedAt.length > 64 || Number.isNaN(Date.parse(raw.deletedAt))) throw new Error('Deleted resume recovery has an invalid date.')
  return { deletedAt: raw.deletedAt, document: migrateResume(raw.document) }
}

export function loadDeletedResumeRecovery(storage: Pick<Storage, 'getItem'>): DeletedResumeRecovery | null {
  try {
    const raw = storage.getItem(DELETION_RECOVERY_STORAGE_KEY)
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES + 1_024) return null
    return parseDeletedResumeRecovery(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveDeletedResumeRecovery(storage: Pick<Storage, 'setItem' | 'removeItem'>, recovery: DeletedResumeRecovery | null): void {
  if (!recovery) {
    storage.removeItem(DELETION_RECOVERY_STORAGE_KEY)
    return
  }
  const parsed = parseDeletedResumeRecovery(recovery)
  const serialized = JSON.stringify(parsed)
  if (new TextEncoder().encode(serialized).byteLength > MAX_DOCUMENT_BYTES + 1_024) throw new Error('Deleted resume recovery exceeds the safety limit.')
  storage.setItem(DELETION_RECOVERY_STORAGE_KEY, serialized)
}

export function recoveryAlreadyPresent(library: ResumeLibrary, recovery: DeletedResumeRecovery): boolean {
  return parseLibrary(library).documents.some((document) => JSON.stringify(document) === JSON.stringify(recovery.document))
}

export function restoreDeletedResume(library: ResumeLibrary, recovery: DeletedResumeRecovery): RecoveryRestoreResult {
  const base = parseLibrary(library)
  const parsed = parseDeletedResumeRecovery(recovery)
  const identical = base.documents.find((document) => JSON.stringify(document) === JSON.stringify(parsed.document))
  if (identical) return { library: { ...base, activeId: identical.id }, restoredAsCopy: false, alreadyPresent: true }
  if (base.documents.length >= MAX_RESUMES) throw new Error(`Your device library is full at ${MAX_RESUMES} resumes. Remove or export one before restoring this recovery copy.`)
  const idCollision = base.documents.some((document) => document.id === parsed.document.id)
  const document = idCollision ? { ...parsed.document, id: createId('resume'), title: `${parsed.document.title || 'Deleted resume'} recovered copy` } : parsed.document
  return {
    library: { activeId: document.id, documents: [...base.documents, document] },
    restoredAsCopy: idCollision,
    alreadyPresent: false,
  }
}
