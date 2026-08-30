import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume } from './resume'
import { advancedDraftIsStale, createAdvancedDraftAnchor } from './draftSafety'

describe('advanced JSON draft safety', () => {
  it('keeps a draft current while its underlying resume is unchanged', () => {
    const resume = createBlankResume()
    const anchor = createAdvancedDraftAnchor(resume)

    assert.equal(advancedDraftIsStale(anchor, resume), false)
    assert.equal(advancedDraftIsStale(anchor, structuredClone(resume)), false)
  })

  it('detects a visual edit even when the update timestamp did not change', () => {
    const resume = createBlankResume()
    const anchor = createAdvancedDraftAnchor(resume)
    const visuallyEdited = { ...resume, targetRole: 'Operations Director' }

    assert.equal(visuallyEdited.updatedAt, resume.updatedAt)
    assert.equal(advancedDraftIsStale(anchor, visuallyEdited), true)
  })

  it('detects when a draft belongs to another resume', () => {
    const resume = createBlankResume()
    const anchor = createAdvancedDraftAnchor(resume)

    assert.equal(advancedDraftIsStale(anchor, { ...resume, id: 'resume_other' }), true)
  })
})
