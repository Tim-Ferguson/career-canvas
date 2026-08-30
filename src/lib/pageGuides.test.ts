import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPreviewPageGuides, MAX_PREVIEW_PAGE_GUIDES, pageHeightCssPixels } from './pageGuides'

describe('preview page boundaries', () => {
  it('uses physical Letter and A4 page heights at CSS print resolution', () => {
    assert.equal(pageHeightCssPixels('letter'), 1056)
    assert.ok(Math.abs(pageHeightCssPixels('a4') - 1122.519685) < 0.001)
  })

  it('positions each next-page boundary at the active preview zoom', () => {
    assert.deepEqual(buildPreviewPageGuides('letter', 3, 0.5), [
      { pageNumber: 2, offsetPixels: 528 },
      { pageNumber: 3, offsetPixels: 1056 },
    ])
  })

  it('bounds guide DOM for extreme resumes and sanitizes invalid measurements', () => {
    const guides = buildPreviewPageGuides('letter', 10_000, 0.82)
    assert.equal(guides.length, MAX_PREVIEW_PAGE_GUIDES)
    assert.equal(guides.at(-1)?.pageNumber, MAX_PREVIEW_PAGE_GUIDES + 1)
    assert.deepEqual(buildPreviewPageGuides('a4', Number.NaN, Number.NaN), [])
  })
})
