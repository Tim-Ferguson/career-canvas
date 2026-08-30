import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { createDefaultLibrary, createLibraryBackup, loadLibrary, mergeLibraries, parseLibrary, parseLibraryBackup, removeDocument, saveLibrary, upsertDocument } from './storage'

describe('local resume library', () => {
  it('round trips validated documents through a storage boundary', () => {
    let stored: string | null = null
    const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value } }
    const first = createDefaultLibrary()
    saveLibrary(storage, first)
    assert.deepEqual(loadLibrary(storage), first)
  })

  it('falls back safely when persisted data is malformed', () => {
    const library = loadLibrary({ getItem: () => '{bad json' })
    assert.equal(library.documents.length, 1)
    assert.equal(library.activeId, library.documents[0]!.id)
  })

  it('salvages healthy resumes when one saved record is corrupt', () => {
    const healthy = createStarter()
    const storage = { getItem: () => JSON.stringify({ activeId: 'broken', documents: [{ schemaVersion: 2, id: 'broken' }, healthy] }) }
    const recovered = loadLibrary(storage)
    assert.equal(recovered.documents.length, 1)
    assert.equal(recovered.documents[0]!.profile.name, healthy.profile.name)
    assert.equal(recovered.activeId, healthy.id)
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

  it('round trips a whole-library backup and restores changed collisions as copies', () => {
    const original = createDefaultLibrary()
    const backup = parseLibraryBackup(JSON.parse(JSON.stringify(createLibraryBackup(original))) as unknown)
    assert.deepEqual(backup.library, original)
    const edited = { ...original.documents[0]!, title: 'Edited after backup' }
    const current = { activeId: edited.id, documents: [edited] }
    const merged = mergeLibraries(current, backup.library)
    assert.equal(merged.documents.length, 2)
    assert.equal(merged.documents[0]!.title, 'Edited after backup')
    assert.match(merged.documents[1]!.title, /restored copy/)
    assert.notEqual(merged.documents[0]!.id, merged.documents[1]!.id)
  })

  it('refuses unsupported or structurally invalid library backups', () => {
    assert.throws(() => parseLibraryBackup({ format: 'something-else', schemaVersion: 1 }), /not a supported/)
    assert.throws(() => parseLibraryBackup({ format: 'career-canvas-library', schemaVersion: 1, exportedAt: 'today', library: { documents: [] } }), /at least one/)
  })
})
