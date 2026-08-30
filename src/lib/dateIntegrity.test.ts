import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseResumeDate, resumeDateIsDefinitelyFuture, resumeDateRangeIsReversed } from './dateIntegrity'

describe('flexible resume date integrity', () => {
  it('understands common year, month, quarter, and season forms without inventing day precision', () => {
    assert.deepEqual(parseResumeDate('2024'), { earliestMonth: 2024 * 12, latestMonth: 2024 * 12 + 11 })
    assert.deepEqual(parseResumeDate('Expected May 2026'), { earliestMonth: 2026 * 12 + 4, latestMonth: 2026 * 12 + 4 })
    assert.deepEqual(parseResumeDate('2026-09'), { earliestMonth: 2026 * 12 + 8, latestMonth: 2026 * 12 + 8 })
    assert.deepEqual(parseResumeDate('Q3 2025'), { earliestMonth: 2025 * 12 + 6, latestMonth: 2025 * 12 + 8 })
    assert.deepEqual(parseResumeDate('Fall 2023'), { earliestMonth: 2023 * 12 + 8, latestMonth: 2023 * 12 + 10 })
  })

  it('leaves statuses and ambiguous multi-year text unparsed', () => {
    assert.equal(parseResumeDate('Present'), null)
    assert.equal(parseResumeDate('Forthcoming'), null)
    assert.equal(parseResumeDate('2024–2025'), null)
  })

  it('flags only definitely reversed ranges when precision differs', () => {
    assert.equal(resumeDateRangeIsReversed('May 2025', '2024'), true)
    assert.equal(resumeDateRangeIsReversed('Dec 2024', '2024'), false)
    assert.equal(resumeDateRangeIsReversed('2024', 'Jan 2024'), false)
    assert.equal(resumeDateRangeIsReversed('2024', 'Active'), false)
  })

  it('recognizes only dates definitely after the supplied current month', () => {
    const today = new Date('2026-08-30T12:00:00Z')
    assert.equal(resumeDateIsDefinitelyFuture('Sep 2026', today), true)
    assert.equal(resumeDateIsDefinitelyFuture('2027', today), true)
    assert.equal(resumeDateIsDefinitelyFuture('2026', today), false)
    assert.equal(resumeDateIsDefinitelyFuture('Expected 2027', today), true)
  })
})
