import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDeletedResumeRecovery, DELETION_RECOVERY_STORAGE_KEY } from './deletionRecovery'
import { createBlankResume } from './resume'
import { createDefaultLibrary, LIBRARY_STORAGE_KEY } from './storage'
import { saveWorkspace } from './workspacePersistence'

describe('unified workspace persistence boundary', () => {
  it('writes the validated library and current recovery together', () => {
    const values = new Map<string, string>()
    const storage = { setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => { values.delete(key) } }
    const library = createDefaultLibrary()
    const recovery = createDeletedResumeRecovery(createBlankResume(), '2026-08-30T12:00:00.000Z')
    saveWorkspace(storage, library, recovery)
    assert.deepEqual(JSON.parse(values.get(LIBRARY_STORAGE_KEY) ?? ''), library)
    assert.deepEqual(JSON.parse(values.get(DELETION_RECOVERY_STORAGE_KEY) ?? ''), recovery)
    saveWorkspace(storage, library, null)
    assert.equal(values.has(DELETION_RECOVERY_STORAGE_KEY), false)
  })

  it('writes deletion recovery before removing a resume from the saved library', () => {
    const written: string[] = []
    const storage = {
      setItem: (key: string) => {
        written.push(key)
        if (key === LIBRARY_STORAGE_KEY) throw new DOMException('Full', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    assert.throws(() => saveWorkspace(storage, createDefaultLibrary(), createDeletedResumeRecovery(createBlankResume())), /Full/)
    assert.deepEqual(written, [DELETION_RECOVERY_STORAGE_KEY, LIBRARY_STORAGE_KEY])
  })

  it('writes a restored library before clearing its fallback recovery', () => {
    const operations: string[] = []
    const storage = {
      setItem: (key: string) => { operations.push(`set:${key}`) },
      removeItem: (key: string) => {
        operations.push(`remove:${key}`)
        throw new DOMException('Blocked', 'SecurityError')
      },
    }
    assert.throws(() => saveWorkspace(storage, createDefaultLibrary(), null), /Blocked/)
    assert.deepEqual(operations, [`set:${LIBRARY_STORAGE_KEY}`, `remove:${DELETION_RECOVERY_STORAGE_KEY}`])
  })
})
