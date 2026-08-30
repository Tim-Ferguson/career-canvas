import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyDeviceStorageFailure, runDeviceStorageOperation } from './deviceStorage'

describe('safe browser storage operations', () => {
  it('covers both acquiring storage and using it in one guarded operation', () => {
    const blocked = runDeviceStorageOperation(
      () => { throw new DOMException('Denied', 'SecurityError') },
      () => 'unreachable',
    )
    assert.deepEqual(blocked, { ok: false, reason: 'blocked' })

    const failedWrite = runDeviceStorageOperation(
      () => ({ setItem: () => { throw new DOMException('Full', 'QuotaExceededError') } }),
      (storage) => storage.setItem(),
    )
    assert.deepEqual(failedWrite, { ok: false, reason: 'full' })
  })

  it('returns operation values without leaking thrown error details', () => {
    assert.deepEqual(runDeviceStorageOperation(() => ({ value: 7 }), (storage) => storage.value * 2), { ok: true, value: 14 })
    assert.deepEqual(runDeviceStorageOperation(() => ({ getItem: () => { throw new Error('private browser detail') } }), (storage) => storage.getItem()), { ok: false, reason: 'unavailable' })
  })

  it('recognizes interoperable quota and permission error shapes', () => {
    assert.equal(classifyDeviceStorageFailure({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }), 'full')
    assert.equal(classifyDeviceStorageFailure({ code: 22 }), 'full')
    assert.equal(classifyDeviceStorageFailure({ name: 'NotAllowedError' }), 'blocked')
    assert.equal(classifyDeviceStorageFailure('unknown'), 'unavailable')
  })
})

