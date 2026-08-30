import { MAX_DOCUMENT_BYTES, MAX_RESUMES, createStarter, migrateResume, type ResumeDocument, type ResumeLibrary } from './resume'

export const LIBRARY_STORAGE_KEY = 'career-canvas.library.v2'

export function createDefaultLibrary(): ResumeLibrary {
  const document = createStarter('universal')
  return { activeId: document.id, documents: [document] }
}

export function parseLibrary(value: unknown): ResumeLibrary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Resume library must be an object.')
  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw.documents)) throw new Error('Resume library is missing its documents.')
  if (raw.documents.length > MAX_RESUMES) throw new Error(`A library can contain at most ${MAX_RESUMES} resumes.`)
  const documents = raw.documents.map(migrateResume)
  if (!documents.length) throw new Error('Resume library must contain at least one document.')
  const ids = documents.map((document) => document.id)
  if (new Set(ids).size !== ids.length) throw new Error('Resume IDs must be unique in the library.')
  const requestedActiveId = typeof raw.activeId === 'string' ? raw.activeId : ''
  return { activeId: ids.includes(requestedActiveId) ? requestedActiveId : documents[0]!.id, documents }
}

export function loadLibrary(storage: Pick<Storage, 'getItem'>): ResumeLibrary {
  try {
    const raw = storage.getItem(LIBRARY_STORAGE_KEY)
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES * MAX_RESUMES) return createDefaultLibrary()
    return parseLibrary(JSON.parse(raw) as unknown)
  } catch {
    return createDefaultLibrary()
  }
}

export function saveLibrary(storage: Pick<Storage, 'setItem'>, library: ResumeLibrary): void {
  storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(parseLibrary(library)))
}

export function upsertDocument(library: ResumeLibrary, document: ResumeDocument): ResumeLibrary {
  const index = library.documents.findIndex((item) => item.id === document.id)
  if (index < 0) {
    if (library.documents.length >= MAX_RESUMES) throw new Error(`You can keep up to ${MAX_RESUMES} resumes on this device.`)
    return { activeId: document.id, documents: [...library.documents, document] }
  }
  const documents = [...library.documents]
  documents[index] = document
  return { ...library, documents }
}

export function removeDocument(library: ResumeLibrary, documentId: string): ResumeLibrary {
  if (library.documents.length <= 1) throw new Error('Keep at least one resume in your library.')
  const documents = library.documents.filter((item) => item.id !== documentId)
  if (documents.length === library.documents.length) return library
  return { activeId: library.activeId === documentId ? documents[0]!.id : library.activeId, documents }
}
