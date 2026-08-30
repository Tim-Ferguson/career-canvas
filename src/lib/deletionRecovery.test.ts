import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { createDeletedResumeRecovery, loadDeletedResumeRecovery, loadDeletedResumeRecoveryFromProvider, parseDeletedResumeRecovery, recoveryAlreadyPresent, restoreDeletedResume, saveDeletedResumeRecovery, DELETION_RECOVERY_STORAGE_KEY } from './deletionRecovery'

describe('recoverable resume removal', () => {
  it('round trips one validated recovery copy through device storage', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => { values.delete(key) } }
    const recovery = createDeletedResumeRecovery(createStarter(), '2026-08-30T12:00:00.000Z')
    saveDeletedResumeRecovery(storage, recovery)
    assert.deepEqual(loadDeletedResumeRecovery(storage), recovery)
    saveDeletedResumeRecovery(storage, null)
    assert.equal(values.has(DELETION_RECOVERY_STORAGE_KEY), false)
  })

  it('refuses malformed recovery records and treats unreadable storage as empty', () => {
    assert.throws(() => parseDeletedResumeRecovery({ deletedAt: 'not-a-date', document: {} }), /invalid date/)
    assert.equal(loadDeletedResumeRecovery({ getItem: () => '{bad json' }), null)
    assert.equal(loadDeletedResumeRecovery({ getItem: () => { throw new Error('blocked') } }), null)
    assert.equal(loadDeletedResumeRecoveryFromProvider(() => { throw new DOMException('Denied', 'SecurityError') }), null)
  })

  it('restores the original ID or creates a safe copy on a changed collision', () => {
    const first = createStarter()
    const removed = createBlankResume()
    const recovery = createDeletedResumeRecovery(removed)
    const restored = restoreDeletedResume({ activeId: first.id, documents: [first] }, recovery)
    assert.equal(restored.library.activeId, removed.id)
    assert.equal(restored.library.documents.at(-1)?.id, removed.id)
    assert.equal(restored.restoredAsCopy, false)

    const collision = { ...removed, title: 'A newer version with the same ID' }
    const copy = restoreDeletedResume({ activeId: first.id, documents: [first, collision] }, recovery)
    assert.equal(copy.restoredAsCopy, true)
    assert.notEqual(copy.library.documents.at(-1)?.id, removed.id)
    assert.match(copy.library.documents.at(-1)?.title ?? '', /recovered copy/)
  })

  it('recognizes an already-restored document and enforces library capacity', () => {
    const document = createBlankResume()
    const recovery = createDeletedResumeRecovery(document)
    const existing = { activeId: document.id, documents: [document] }
    assert.equal(recoveryAlreadyPresent(existing, recovery), true)
    assert.equal(restoreDeletedResume(existing, recovery).alreadyPresent, true)
    const full = Array.from({ length: 24 }, (_, index) => ({ ...createBlankResume(), id: `resume-${index}` }))
    assert.throws(() => restoreDeletedResume({ activeId: full[0]!.id, documents: full }, recovery), /library is full/)
  })
})
