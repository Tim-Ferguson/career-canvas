import type { PrintBlock } from '../lib/pageGuides'

/**
 * Reads the blocks print keeps on one page from the rendered preview, mirroring the print CSS:
 * the header and each entry stay whole unless marked `-flow`, in which case their headings and
 * bullets stay whole instead; a section title and an entry heading stay with what follows them.
 * Positions are unzoomed document pixels measured from the document's top edge.
 */
export function measurePrintLayout(documentElement: HTMLElement): { blocks: PrintBlock[]; contentBottom: number } {
  const documentRect = documentElement.getBoundingClientRect()
  // The preview applies CSS zoom; offsetHeight is unzoomed, so the ratio converts rects back.
  const scale = documentElement.offsetHeight > 0 ? documentRect.height / documentElement.offsetHeight : 1
  const measure = (element: Element): PrintBlock => {
    const rect = element.getBoundingClientRect()
    return { top: (rect.top - documentRect.top) / scale, bottom: (rect.bottom - documentRect.top) / scale }
  }
  const join = (first: PrintBlock, second: PrintBlock | undefined): PrintBlock => second ? { top: first.top, bottom: Math.max(first.bottom, second.bottom) } : first

  const unitsOf = (element: Element, flowClass: string, partsSelector: string, keepFirstTwo: boolean): PrintBlock[] => {
    if (!element.classList.contains(flowClass)) return [measure(element)]
    const parts = Array.from(element.querySelectorAll(partsSelector)).filter((part) => !/-flow\b/.test(part.className)).map(measure)
    return keepFirstTwo && parts.length > 1 ? [join(parts[0]!, parts[1]), ...parts.slice(2)] : parts
  }

  const blocks: PrintBlock[] = []
  const header = documentElement.querySelector('.document-header')
  if (header) blocks.push(...unitsOf(header, 'document-header-flow', '.document-identity, .document-contact', false))
  for (const section of Array.from(documentElement.querySelectorAll('.document-section'))) {
    const entries = Array.from(section.querySelectorAll(':scope .document-section-content > .document-entry'))
    const units = entries.flatMap((entry) => unitsOf(entry, 'document-entry-flow', '.document-entry-heading, li, .document-keywords, .document-tags', true))
    const title = section.querySelector(':scope > h2')
    if (title && units.length) units[0] = join(measure(title), units[0])
    else if (title) units.push(measure(title))
    blocks.push(...units)
  }

  const contentBottom = Array.from(documentElement.children).reduce((bottom, child) => Math.max(bottom, measure(child).bottom), 0)
  return { blocks, contentBottom }
}
