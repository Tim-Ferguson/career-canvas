import { MAX_DOCUMENT_BYTES, MAX_RESUMES, createId, createStarter, migrateResume, type ResumeDocument, type ResumeLibrary } from './resume'
import { classifyDeviceStorageFailure, type DeviceStorageFailure } from './deviceStorage'

export const LIBRARY_STORAGE_KEY = 'career-canvas.library.v2'

export interface LibraryLoadResult {
  library: ResumeLibrary
  status: 'empty' | 'loaded' | 'recovered' | 'reset' | 'unavailable'
  discardedDocuments: number
  repairedDocuments: number
  activeIdRecovered: boolean
  failureReason?: DeviceStorageFailure
}

export interface LibraryMergeSummary {
  incomingDocuments: number
  addedDocuments: number
  collisionCopies: number
  unchangedDocuments: number
  requiredSlots: number
  resultingDocuments: number
  exceedsLimit: boolean
}

export function createDefaultLibrary(): ResumeLibrary {
  const document = createStarter('universal')
  return { activeId: document.id, documents: [document] }
}

// Adds the owner's resumes ahead of the library and activates the first one it adds. A fresh
// device opens with only those resumes instead of the fictional starter.
export function seedPrimaryResumes(loaded: LibraryLoadResult, primaries: readonly ResumeDocument[]): LibraryLoadResult {
  const base = loaded.status === 'empty' ? [] : loaded.library.documents
  const missing = primaries.filter((primary) => !base.some((document) => document.id === primary.id)).slice(0, Math.max(0, MAX_RESUMES - base.length))
  if (!missing.length) return loaded
  return { ...loaded, library: { activeId: missing[0]!.id, documents: [...missing, ...base] } }
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

export function loadLibraryResult(storage: Pick<Storage, 'getItem'>): LibraryLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(LIBRARY_STORAGE_KEY)
  } catch (error) {
    return { library: createDefaultLibrary(), status: 'unavailable', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false, failureReason: classifyDeviceStorageFailure(error) }
  }
  if (!raw) return { library: createDefaultLibrary(), status: 'empty', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false }
  if (new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES * MAX_RESUMES) return { library: createDefaultLibrary(), status: 'reset', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { library: createDefaultLibrary(), status: 'reset', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false }
    const source = parsed as Record<string, unknown>
    if (!Array.isArray(source.documents)) return { library: createDefaultLibrary(), status: 'reset', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false }
    const documents: ResumeDocument[] = []
    const ids = new Set<string>()
    let discardedDocuments = Math.max(0, source.documents.length - MAX_RESUMES)
    let repairedDocuments = 0
    for (const value of source.documents.slice(0, MAX_RESUMES)) {
      try {
        let document = migrateResume(value)
        if (ids.has(document.id)) {
          document = { ...document, id: createId('resume'), title: `${document.title || 'Resume'} recovered copy` }
          repairedDocuments += 1
        }
        documents.push(document)
        ids.add(document.id)
      } catch {
        // Preserve every healthy resume even when another saved record is corrupt.
        discardedDocuments += 1
      }
    }
    if (!documents.length) return { library: createDefaultLibrary(), status: 'reset', discardedDocuments, repairedDocuments, activeIdRecovered: false }
    const requestedActiveId = typeof source.activeId === 'string' ? source.activeId : ''
    const activeIdRecovered = !ids.has(requestedActiveId)
    return {
      library: { activeId: activeIdRecovered ? documents[0]!.id : requestedActiveId, documents },
      status: discardedDocuments || repairedDocuments || activeIdRecovered ? 'recovered' : 'loaded',
      discardedDocuments,
      repairedDocuments,
      activeIdRecovered,
    }
  } catch {
    return { library: createDefaultLibrary(), status: 'reset', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false }
  }
}

export function loadLibrary(storage: Pick<Storage, 'getItem'>): ResumeLibrary {
  return loadLibraryResult(storage).library
}

export function loadLibraryFromProvider(getStorage: () => Pick<Storage, 'getItem'>): LibraryLoadResult {
  try {
    return loadLibraryResult(getStorage())
  } catch (error) {
    return { library: createDefaultLibrary(), status: 'unavailable', discardedDocuments: 0, repairedDocuments: 0, activeIdRecovered: false, failureReason: classifyDeviceStorageFailure(error) }
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

function summarizeParsedLibraryMerge(base: ResumeLibrary, restored: ResumeLibrary): LibraryMergeSummary {
  let addedDocuments = 0
  let collisionCopies = 0
  let unchangedDocuments = 0
  for (const candidate of restored.documents) {
    const existing = base.documents.find((document) => document.id === candidate.id)
    if (!existing) addedDocuments += 1
    else if (JSON.stringify(existing) === JSON.stringify(candidate)) unchangedDocuments += 1
    else collisionCopies += 1
  }
  const requiredSlots = addedDocuments + collisionCopies
  const resultingDocuments = base.documents.length + requiredSlots
  return {
    incomingDocuments: restored.documents.length,
    addedDocuments,
    collisionCopies,
    unchangedDocuments,
    requiredSlots,
    resultingDocuments,
    exceedsLimit: resultingDocuments > MAX_RESUMES,
  }
}

export function summarizeLibraryMerge(current: ResumeLibrary, incoming: ResumeLibrary): LibraryMergeSummary {
  return summarizeParsedLibraryMerge(parseLibrary(current), parseLibrary(incoming))
}

export function mergeLibraries(current: ResumeLibrary, incoming: ResumeLibrary): ResumeLibrary {
  const base = parseLibrary(current)
  const restored = parseLibrary(incoming)
  const summary = summarizeParsedLibraryMerge(base, restored)
  if (summary.exceedsLimit) throw new Error(`Restoring this backup needs ${summary.requiredSlots} open ${summary.requiredSlots === 1 ? 'slot' : 'slots'} and would exceed the ${MAX_RESUMES}-resume device limit.`)
  const documents = [...base.documents]
  for (const candidate of restored.documents) {
    const existing = documents.find((document) => document.id === candidate.id)
    if (existing && JSON.stringify(existing) === JSON.stringify(candidate)) continue
    documents.push(existing ? { ...candidate, id: createId('resume'), title: `${candidate.title || 'Resume'} restored copy` } : candidate)
  }
  return { activeId: base.activeId, documents }
}
