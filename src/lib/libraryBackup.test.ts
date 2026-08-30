import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDeletedResumeRecovery } from './deletionRecovery'
import { createLibraryBackup, parseLibraryBackup, restoreLibraryBackup, summarizeLibraryBackupRestore } from './libraryBackup'
import { createBlankResume, createStarter } from './resume'
import { createDefaultLibrary, parseLibrary } from './storage'

describe('portable whole-library backups', () => {
  it('round trips schema v2 with the current deleted-resume recovery', () => {
    const library = createDefaultLibrary()
    const recovery = createDeletedResumeRecovery(createBlankResume(), '2026-08-30T12:00:00.000Z')
    const backup = createLibraryBackup(library, recovery, '2026-08-30T13:00:00.000Z')
    const parsed = parseLibraryBackup(JSON.parse(JSON.stringify(backup)) as unknown)
    assert.equal(parsed.schemaVersion, 2)
    assert.equal(parsed.sourceSchemaVersion, 2)
    assert.deepEqual(parsed.library, library)
    assert.deepEqual(parsed.deletedRecovery, recovery)
  })

  it('migrates schema v1 backups without inventing a deleted recovery', () => {
    const library = createDefaultLibrary()
    const parsed = parseLibraryBackup({ format: 'career-canvas-library', schemaVersion: 1, exportedAt: '2026-08-30T13:00:00.000Z', library })
    assert.equal(parsed.schemaVersion, 2)
    assert.equal(parsed.sourceSchemaVersion, 1)
    assert.equal(parsed.deletedRecovery, null)
    assert.equal(summarizeLibraryBackupRestore(library, parsed).recoveryDisposition, 'not-included')
  })

  it('previews and restores library collisions plus recovery without changing the active resume', () => {
    const original = createStarter()
    const currentVersion = { ...original, title: 'Current edited version' }
    const current = parseLibrary({ activeId: currentVersion.id, documents: [currentVersion] })
    const recovery = createDeletedResumeRecovery(createBlankResume(), '2026-08-30T12:00:00.000Z')
    const backup = parseLibraryBackup(createLibraryBackup({ activeId: original.id, documents: [original] }, recovery))
    const preview = summarizeLibraryBackupRestore(current, backup)
    assert.equal(preview.library.collisionCopies, 1)
    assert.equal(preview.recoveryDisposition, 'restore')
    assert.equal(preview.requiredSlots, 2)
    assert.equal(preview.resultingDocuments, 3)

    const restored = restoreLibraryBackup(current, backup)
    assert.equal(restored.library.activeId, current.activeId)
    assert.equal(restored.library.documents.length, 3)
    assert.equal(restored.library.documents[0]!.title, 'Current edited version')
    assert.match(restored.library.documents[1]!.title, /restored copy/)
    assert.equal(restored.library.documents[2]!.id, recovery.document.id)
  })

  it('deduplicates recovery content and reports changed ID collisions as copies', () => {
    const current = createDefaultLibrary()
    const identical = createDeletedResumeRecovery(current.documents[0]!)
    const identicalBackup = parseLibraryBackup(createLibraryBackup(current, identical))
    assert.equal(summarizeLibraryBackupRestore(current, identicalBackup).recoveryDisposition, 'already-present')

    const collision = createDeletedResumeRecovery({ ...current.documents[0]!, title: 'Different deleted content' })
    const collisionBackup = parseLibraryBackup(createLibraryBackup(current, collision))
    const result = restoreLibraryBackup(current, collisionBackup)
    assert.equal(result.summary.recoveryDisposition, 'restore-copy')
    assert.equal(result.library.documents.length, 2)
    assert.notEqual(result.library.documents[1]!.id, collision.document.id)
    assert.match(result.library.documents[1]!.title, /recovered copy/)
  })

  it('preflights recovery capacity and refuses malformed formats', () => {
    const documents = Array.from({ length: 24 }, (_, index) => ({ ...createBlankResume(), id: `resume-${index}` }))
    const full = parseLibrary({ activeId: documents[0]!.id, documents })
    const backup = parseLibraryBackup(createLibraryBackup(createDefaultLibrary(), createDeletedResumeRecovery({ ...createBlankResume(), id: 'resume-recovery' })))
    const preview = summarizeLibraryBackupRestore(full, backup)
    assert.equal(preview.exceedsLimit, true)
    assert.throws(() => restoreLibraryBackup(full, backup), /would exceed/)
    assert.throws(() => parseLibraryBackup({ format: 'something-else', schemaVersion: 2 }), /not a supported/)
    assert.throws(() => parseLibraryBackup({ format: 'career-canvas-library', schemaVersion: 2, exportedAt: '2026-08-30T12:00:00.000Z', library: createDefaultLibrary() }), /missing its deleted-recovery field/)
    assert.throws(() => parseLibraryBackup({ format: 'career-canvas-library', schemaVersion: 1, exportedAt: 'not-a-date', library: createDefaultLibrary() }), /invalid export date/)
  })
})
