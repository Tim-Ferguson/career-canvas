import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { commitLatest } from './latestState'

describe('latest-state commits', () => {
  it('serializes rapid updates even when the rendered state has not caught up', () => {
    const latest = { current: { count: 0, values: [] as string[] } }
    const scheduled: typeof latest.current[] = []
    commitLatest(latest, (value) => scheduled.push(value), (current) => ({ count: current.count + 1, values: [...current.values, 'first'] }))
    commitLatest(latest, (value) => scheduled.push(value), (current) => ({ count: current.count + 1, values: [...current.values, 'second'] }))
    assert.deepEqual(latest.current, { count: 2, values: ['first', 'second'] })
    assert.equal(scheduled.length, 2)
  })
})
