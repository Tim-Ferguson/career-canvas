import { MAX_DOCUMENT_BYTES, MAX_RESUMES, createId, createStarter, migrateResume, type ResumeDocument, type ResumeLibrary } from './resume'

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
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return createDefaultLibrary()
    const source = parsed as Record<string, unknown>
    if (!Array.isArray(source.documents)) return createDefaultLibrary()
    const documents: ResumeDocument[] = []
    const ids = new Set<string>()
    for (const value of source.documents.slice(0, MAX_RESUMES)) {
      try {
        let document = migrateResume(value)
        if (ids.has(document.id)) document = { ...document, id: createId('resume'), title: `${document.title || 'Resume'} recovered copy` }
        documents.push(document)
        ids.add(document.id)
      } catch {
        // Preserve every healthy resume even when another saved record is corrupt.
      }
    }
    if (!documents.length) return createDefaultLibrary()
    const requestedActiveId = typeof source.activeId === 'string' ? source.activeId : ''
    return { activeId: ids.has(requestedActiveId) ? requestedActiveId : documents[0]!.id, documents }
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
