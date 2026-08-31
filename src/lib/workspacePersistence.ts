import { saveDeletedResumeRecovery, type DeletedResumeRecovery } from './deletionRecovery'
import { saveLibrary } from './storage'
import type { ResumeLibrary } from './resume'

export type WorkspaceStorage = Pick<Storage, 'setItem' | 'removeItem'>

export function saveWorkspace(storage: WorkspaceStorage, library: ResumeLibrary, deletedRecovery: DeletedResumeRecovery | null): void {
  if (deletedRecovery && !library.documents.some((document) => document.id === deletedRecovery.document.id && JSON.stringify(document) === JSON.stringify(deletedRecovery.document))) {
    saveDeletedResumeRecovery(storage, deletedRecovery)
    saveLibrary(storage, library)
    return
  }
  saveLibrary(storage, library)
  saveDeletedResumeRecovery(storage, deletedRecovery)
}
