import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_PREVIEW_ZOOM, MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM, clampPreviewZoom, fitPreviewZoom } from './previewZoom'

describe('responsive preview zoom', () => {
  it('fits Letter and A4 pages inside the measured viewport gutter', () => {
    assert.equal(fitPreviewZoom(864, 'letter'), 1)
    assert.equal(fitPreviewZoom(841.700787, 'a4'), 1)
    assert.equal(fitPreviewZoom(456, 'letter'), 0.5)
  })

  it('keeps unusually narrow and wide viewports within usable bounds', () => {
    assert.equal(fitPreviewZoom(100, 'letter'), MIN_PREVIEW_ZOOM)
    assert.equal(fitPreviewZoom(2_000, 'letter'), MAX_PREVIEW_ZOOM)
  })

  it('ignores unmeasurable viewports and sanitizes manual zoom values', () => {
    assert.equal(fitPreviewZoom(0, 'letter'), null)
    assert.equal(fitPreviewZoom(Number.NaN, 'a4'), null)
    assert.equal(clampPreviewZoom(Number.NaN), DEFAULT_PREVIEW_ZOOM)
    assert.equal(clampPreviewZoom(-1), MIN_PREVIEW_ZOOM)
  })
})
