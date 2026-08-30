import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { buildLibraryInsights, sortLibraryInsights } from './libraryInsights'

describe('multi-version library insights', () => {
  it('detects unchanged content copies while ignoring library-only metadata', () => {
    const original = createStarter('healthcare')
    const copy = { ...original, id: 'resume-copy', title: 'Different library label', updatedAt: '2026-08-01T00:00:00.000Z' }
    const library = { activeId: original.id, documents: [original, copy] }
    const before = JSON.stringify(library)
    const insights = buildLibraryInsights(library, Date.parse('2026-08-30T00:00:00.000Z'))
    assert.equal(insights.every((item) => item.sameContent), true)
    assert.equal(JSON.stringify(library), before)
  })

  it('distinguishes stale, recent, and invalid update times', () => {
    const stale = { ...createBlankResume(), id: 'stale', updatedAt: '2025-01-01T00:00:00.000Z' }
    const recent = { ...createBlankResume(), id: 'recent', updatedAt: '2026-08-01T00:00:00.000Z' }
    const unknown = { ...createBlankResume(), id: 'unknown', updatedAt: 'not-a-date' }
    const insights = buildLibraryInsights({ activeId: recent.id, documents: [stale, recent, unknown] }, Date.parse('2026-08-30T00:00:00.000Z'))
    assert.deepEqual(insights.map((item) => item.stale), [true, false, false])
    assert.equal(insights[2]!.updatedTimestamp, null)
  })

  it('sorts incomplete resumes first without changing the source order', () => {
    const strong = createStarter()
    strong.profile = { ...strong.profile, name: 'Taylor Kim', email: 'taylor@example.com', phone: '+1 555 555 0199', website: 'taylorkim.example', links: [] }
    strong.sections.forEach((section) => section.entries.forEach((entry) => { entry.highlights = entry.highlights.map(() => 'Improved a relevant outcome by 18%.') }))
    const incomplete = { ...createBlankResume(), id: 'incomplete', title: 'Needs work' }
    const insights = buildLibraryInsights({ activeId: strong.id, documents: [strong, incomplete] })
    const sorted = sortLibraryInsights(insights, 'attention')
    assert.equal(sorted[0]!.resume.id, incomplete.id)
    assert.equal(insights[0]!.resume.id, strong.id)
  })
})
