import { pageWidthCssPixels } from './pageGuides'
import type { PageSize } from './resume'

export const DEFAULT_PREVIEW_ZOOM = 0.82
export const MIN_PREVIEW_ZOOM = 0.28
export const MAX_PREVIEW_ZOOM = 1.15
export const PREVIEW_HORIZONTAL_GUTTER = 48

export function clampPreviewZoom(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREVIEW_ZOOM
  return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, value))
}

export function fitPreviewZoom(viewportWidth: number, pageSize: PageSize, horizontalGutter = PREVIEW_HORIZONTAL_GUTTER): number | null {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return null
  const safeGutter = Number.isFinite(horizontalGutter) ? Math.max(0, horizontalGutter) : PREVIEW_HORIZONTAL_GUTTER
  const availableWidth = viewportWidth - safeGutter
  if (availableWidth <= 0) return null
  return Math.round(clampPreviewZoom(availableWidth / pageWidthCssPixels(pageSize)) * 1_000) / 1_000
}
