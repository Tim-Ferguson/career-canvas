import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { createDefaultLibrary, loadLibrary, loadLibraryFromProvider, loadLibraryResult, mergeLibraries, parseLibrary, removeDocument, saveLibrary, seedPrimaryResumes, summarizeLibraryMerge, upsertDocument } from './storage'

describe('local resume library', () => {
  it('round trips validated documents through a storage boundary', () => {
    let stored: string | null = null
    const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value } }
    const first = createDefaultLibrary()
    saveLibrary(storage, first)
    assert.deepEqual(loadLibrary(storage), first)
  })

  it('falls back safely when persisted data is malformed', () => {
    const result = loadLibraryResult({ getItem: () => '{bad json' })
    assert.equal(result.status, 'reset')
    assert.equal(result.library.documents.length, 1)
    assert.equal(result.library.activeId, result.library.documents[0]!.id)
  })

  it('salvages healthy resumes when one saved record is corrupt', () => {
    const healthy = createStarter()
    const storage = { getItem: () => JSON.stringify({ activeId: 'broken', documents: [{ schemaVersion: 2, id: 'broken' }, healthy] }) }
    const result = loadLibraryResult(storage)
    assert.equal(result.status, 'recovered')
    assert.equal(result.discardedDocuments, 1)
    assert.equal(result.library.documents.length, 1)
    assert.equal(result.library.documents[0]!.profile.name, healthy.profile.name)
    assert.equal(result.library.activeId, healthy.id)
  })

  it('repairs duplicate IDs and reports unavailable browser storage', () => {
    const resume = createStarter()
    const repaired = loadLibraryResult({ getItem: () => JSON.stringify({ activeId: resume.id, documents: [resume, resume] }) })
    assert.equal(repaired.status, 'recovered')
    assert.equal(repaired.repairedDocuments, 1)
    assert.equal(new Set(repaired.library.documents.map((item) => item.id)).size, 2)
    const unavailable = loadLibraryResult({ getItem: () => { throw new Error('blocked') } })
    assert.equal(unavailable.status, 'unavailable')
    assert.equal(unavailable.failureReason, 'unavailable')
    assert.equal(unavailable.library.documents.length, 1)
    const blockedGetter = loadLibraryFromProvider(() => { throw new DOMException('Denied', 'SecurityError') })
    assert.equal(blockedGetter.status, 'unavailable')
    assert.equal(blockedGetter.failureReason, 'blocked')
  })

  it('adds, updates, activates, and removes document versions', () => {
    const first = createStarter()
    const second = createBlankResume()
    let library = parseLibrary({ activeId: first.id, documents: [first] })
    library = upsertDocument(library, second)
    assert.equal(library.activeId, second.id)
    assert.equal(library.documents.length, 2)
    library = upsertDocument(library, { ...second, title: 'Updated' })
    assert.equal(library.documents.find((item) => item.id === second.id)?.title, 'Updated')
    library = removeDocument(library, second.id)
    assert.equal(library.documents.length, 1)
    assert.throws(() => removeDocument(library, first.id), /at least one/)
  })

  it('restores changed library collisions as copies', () => {
    const original = createDefaultLibrary()
    const edited = { ...original.documents[0]!, title: 'Edited after backup' }
    const current = { activeId: edited.id, documents: [edited] }
    const merged = mergeLibraries(current, original)
    assert.equal(merged.documents.length, 2)
    assert.equal(merged.documents[0]!.title, 'Edited after backup')
    assert.match(merged.documents[1]!.title, /restored copy/)
    assert.notEqual(merged.documents[0]!.id, merged.documents[1]!.id)
  })

  it('preflights additions, unchanged documents, and changed ID collisions without mutation', () => {
    const unchanged = createStarter()
    const collision = createBlankResume()
    const added = { ...createStarter('healthcare'), id: 'resume-new' }
    const current = parseLibrary({ activeId: unchanged.id, documents: [unchanged, collision] })
    const incoming = parseLibrary({ activeId: unchanged.id, documents: [unchanged, { ...collision, title: 'Changed backup version' }, added] })
    const before = JSON.stringify(current)
    assert.deepEqual(summarizeLibraryMerge(current, incoming), {
      incomingDocuments: 3,
      addedDocuments: 1,
      collisionCopies: 1,
      unchangedDocuments: 1,
      requiredSlots: 2,
      resultingDocuments: 4,
      exceedsLimit: false,
    })
    assert.equal(JSON.stringify(current), before)
  })

  it('reports backup capacity before performing a partial merge', () => {
    const documents = Array.from({ length: 24 }, (_, index) => ({ ...createBlankResume(), id: `resume-${index}` }))
    const current = parseLibrary({ activeId: documents[0]!.id, documents })
    const incomingDocument = { ...createBlankResume(), id: 'resume-over-limit' }
    const incoming = parseLibrary({ activeId: incomingDocument.id, documents: [incomingDocument] })
    const summary = summarizeLibraryMerge(current, incoming)
    assert.equal(summary.exceedsLimit, true)
    assert.equal(summary.resultingDocuments, 25)
    assert.throws(() => mergeLibraries(current, incoming), /needs 1 open slot/)
    assert.equal(current.documents.length, 24)
  })


  it('seeds owner resumes first, activates the first added, and never duplicates them', () => {
    const first = { ...createBlankResume(), id: 'resume-owner-a', title: 'Owner A' }
    const second = { ...createBlankResume(), id: 'resume-owner-b', title: 'Owner B' }
    const empty = loadLibraryResult({ getItem: () => null })
    assert.deepEqual(seedPrimaryResumes(empty, [first, second]).library, { activeId: 'resume-owner-a', documents: [first, second] })
    const existing = { ...empty, status: 'loaded' as const, library: { activeId: second.id, documents: [second, ...empty.library.documents] } }
    const seeded = seedPrimaryResumes(existing, [first, second])
    assert.equal(seeded.library.activeId, 'resume-owner-a')
    assert.deepEqual(seeded.library.documents.map((document) => document.id), ['resume-owner-a', ...existing.library.documents.map((document) => document.id)])
    assert.equal(seedPrimaryResumes(seeded, [first, second]), seeded)
    assert.equal(seedPrimaryResumes(existing, []), existing)
  })
})
