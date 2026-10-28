import type { PageSize } from './resume'

export const MAX_PREVIEW_PAGE_GUIDES = 24

export interface PreviewPageGuide {
  pageNumber: number
  offsetPixels: number
}

export function pageWidthCssPixels(pageSize: PageSize): number {
  return pageSize === 'a4' ? (210 / 25.4) * 96 : 8.5 * 96
}

export function pageHeightCssPixels(pageSize: PageSize): number {
  return pageSize === 'a4' ? (297 / 25.4) * 96 : 11 * 96
}

export interface PrintBlock {
  top: number
  bottom: number
}

/**
 * Simulates print pagination and returns where each page after the first begins, in unzoomed
 * document pixels. Every printed page repeats the document's vertical padding, so a page holds
 * `pageHeight - 2 * padding` of content. `blocks` are the pieces print refuses to split (entries,
 * the header, a section title kept with its first entry), in document order; a block that would
 * cross a boundary moves whole to the next page unless it is taller than a page.
 */
export function printPageBreaks(blocks: readonly PrintBlock[], contentBottom: number, pageSize: PageSize, paddingYCssPixels = 0): number[] {
  const pageHeight = pageHeightCssPixels(pageSize)
  const padding = Number.isFinite(paddingYCssPixels) ? Math.min(Math.max(0, paddingYCssPixels), pageHeight / 4) : 0
  const usable = pageHeight - 2 * padding
  const breaks: number[] = []
  // `shift` is how far pushed blocks have moved content down; `boundary` is the next page's start in shifted coordinates.
  let shift = 0
  let boundary = padding + usable
  const passBoundariesBefore = (position: number) => {
    while (position + shift > boundary) {
      breaks.push(boundary - shift)
      boundary += usable
    }
  }
  const valid = blocks.filter((block) => Number.isFinite(block.top) && Number.isFinite(block.bottom) && block.bottom > block.top)
  for (const block of [...valid].sort((a, b) => a.top - b.top)) {
    passBoundariesBefore(block.top)
    const top = block.top + shift
    if (block.bottom + shift <= boundary || block.bottom - block.top > usable || top <= boundary - usable + 0.5) continue
    breaks.push(block.top)
    shift += boundary - top
    boundary += usable
  }
  if (Number.isFinite(contentBottom)) passBoundariesBefore(contentBottom - 0.5)
  return breaks
}

export function buildPreviewPageGuides(pageBreaks: readonly number[], zoom: number, limit = MAX_PREVIEW_PAGE_GUIDES): PreviewPageGuide[] {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  return pageBreaks.slice(0, Math.max(0, Math.floor(limit))).map((offset, index) => ({ pageNumber: index + 2, offsetPixels: offset * safeZoom }))
}
