import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { createDefaultLibrary, loadLibrary, parseLibrary, removeDocument, saveLibrary, upsertDocument } from './storage'

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
})
