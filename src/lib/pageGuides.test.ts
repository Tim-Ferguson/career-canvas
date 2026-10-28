import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPreviewPageGuides, MAX_PREVIEW_PAGE_GUIDES, pageHeightCssPixels, pageWidthCssPixels, printPageBreaks } from './pageGuides'

describe('preview page boundaries', () => {
  it('uses physical Letter and A4 dimensions at CSS print resolution', () => {
    assert.equal(pageWidthCssPixels('letter'), 816)
    assert.ok(Math.abs(pageWidthCssPixels('a4') - 793.700787) < 0.001)
    assert.equal(pageHeightCssPixels('letter'), 1056)
    assert.ok(Math.abs(pageHeightCssPixels('a4') - 1122.519685) < 0.001)
  })

  it('positions guides at each page break at the active preview zoom', () => {
    assert.deepEqual(buildPreviewPageGuides([1000, 1900], 0.5), [
      { pageNumber: 2, offsetPixels: 500 },
      { pageNumber: 3, offsetPixels: 950 },
    ])
    assert.equal(buildPreviewPageGuides(Array.from({ length: 10_000 }, (_, index) => index), 0.82).length, MAX_PREVIEW_PAGE_GUIDES)
    assert.deepEqual(buildPreviewPageGuides([100], Number.NaN), [{ pageNumber: 2, offsetPixels: 100 }])
  })
})

describe('print pagination', () => {
  // Letter page 1056px with 50px padding repeated on every page: 956px of content per page.
  it('counts pages from content height when nothing needs to stay together', () => {
    assert.deepEqual(printPageBreaks([], 1006, 'letter', 50), [])
    assert.deepEqual(printPageBreaks([], 1010, 'letter', 50), [1006])
    assert.deepEqual(printPageBreaks([], 2000, 'letter', 50), [1006, 1962])
    assert.deepEqual(printPageBreaks([], Number.NaN, 'letter'), [])
  })

  it('moves a block that would cross a page boundary to the next page', () => {
    const blocks = [{ top: 50, bottom: 600 }, { top: 620, bottom: 1100 }, { top: 1110, bottom: 1300 }]
    // The second block starts page 2; everything after it shifts down by 1006 - 620 = 386px.
    assert.deepEqual(printPageBreaks(blocks, 1300, 'letter', 50), [620])
    // 1300 + 386 = 1686 still fits page 2 (ends at 1962); a little more content needs page 3.
    assert.deepEqual(printPageBreaks(blocks, 1600, 'letter', 50), [620, 1962 - 386])
  })

  it('lets a block taller than a page split instead of pushing it forever', () => {
    assert.deepEqual(printPageBreaks([{ top: 50, bottom: 1500 }], 1500, 'letter', 50), [1006])
  })

  it('pushes side-by-side blocks that share a row together', () => {
    const row = [{ top: 900, bottom: 1100 }, { top: 900, bottom: 1080 }]
    assert.deepEqual(printPageBreaks(row, 1100, 'letter', 50), [900])
  })
})
