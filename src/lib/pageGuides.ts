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

// Each printed page repeats the document's vertical padding, so page N+1 begins where page N's
// usable height (page height minus padding top and bottom) runs out.
export function buildPreviewPageGuides(pageSize: PageSize, renderedPages: number, zoom: number, limit = MAX_PREVIEW_PAGE_GUIDES, paddingYCssPixels = 0): PreviewPageGuide[] {
  const pages = Number.isFinite(renderedPages) ? Math.max(1, Math.ceil(renderedPages)) : 1
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const count = Math.min(Math.max(0, pages - 1), Math.max(0, Math.floor(limit)))
  const pageHeight = pageHeightCssPixels(pageSize)
  const padding = Number.isFinite(paddingYCssPixels) ? Math.min(Math.max(0, paddingYCssPixels), pageHeight / 4) : 0
  const usable = pageHeight - 2 * padding
  return Array.from({ length: count }, (_, index) => ({ pageNumber: index + 2, offsetPixels: (padding + usable * (index + 1)) * safeZoom }))
}
