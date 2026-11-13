import { extractResumeDates, resumeHeadingBucket } from './resumeTextImport'

/**
 * Reads the text out of an uploaded resume file on the device. PDF text comes from pdf.js,
 * Word text from the .docx archive itself, and both are reduced to ordered lines that
 * `importResumeText` can map onto the schema. The file bytes never leave the browser.
 */

export type ResumeFileKind = 'pdf' | 'docx' | 'text'

export interface ResumeFileText {
  kind: ResumeFileKind
  /** Reading-order lines. An empty string marks a paragraph gap. */
  lines: string[]
  /** Link targets stored outside the visible text. */
  links: string[]
  warnings: string[]
}

export const MAX_RESUME_FILE_BYTES = 10_000_000
const MAX_PDF_PAGES = 15
const MAX_INFLATED_BYTES = 24_000_000

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
export type PdfJsLoader = () => Promise<PdfJs>

const BULLET_START = /^[•●▪■◦‣⁃∙·○◆◇➢➤►▶✓✔*–—-](?:\s|$)/

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value)
}

/** Identifies the file by content first, so a mislabeled extension still routes correctly. */
export function sniffResumeFile(name: string, bytes: Uint8Array): ResumeFileKind | 'json' {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''
  const head = bytes.subarray(0, 1024)
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    if (extension === 'pages') throw new Error('Apple Pages files are not supported. In Pages, choose File › Export To › PDF or Word, then upload that file.')
    if (extension === 'odt') throw new Error('OpenDocument files are not supported. Save the resume as PDF or Word (.docx), then upload that file.')
    return 'docx'
  }
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0])) throw new Error('Older Word .doc files are not supported. Open it in Word, Pages or Google Docs, save it as .docx or PDF, then upload that file.')
  if (startsWith(head, [0x7b, 0x5c, 0x72, 0x74, 0x66])) throw new Error('Rich Text (.rtf) files are not supported. Save the resume as PDF, Word (.docx) or plain text, then upload that file.')
  const zeros = head.reduce((count, value) => count + (value === 0 ? 1 : 0), 0)
  const utf16 = startsWith(head, [0xff, 0xfe]) || startsWith(head, [0xfe, 0xff])
  if (!utf16 && zeros > 0) throw new Error('This file type is not supported. Upload a PDF, a Word .docx file, a plain-text file or resume JSON.')
  const start = new TextDecoder().decode(head).replace(/^﻿/, '').trimStart()
  if (extension === 'json' || start.startsWith('{')) return 'json'
  return 'text'
}

export interface PdfTextItem {
  str: string
  x: number
  /** Baseline position. PDF space grows upward, so a larger value is higher on the page. */
  y: number
  width: number
  height: number
}

interface PdfLine {
  y: number
  height: number
  items: PdfTextItem[]
}

function groupPdfLines(items: readonly PdfTextItem[]): PdfLine[] {
  const lines: PdfLine[] = []
  for (const item of [...items].filter((entry) => entry.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    const height = item.height || 10
    const line = lines.at(-1)
    if (line && Math.abs(line.y - item.y) <= Math.max(2, 0.45 * Math.min(line.height, height))) {
      line.items.push(item)
      line.height = Math.max(line.height, height)
    } else {
      lines.push({ y: item.y, height, items: [item] })
    }
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return lines
}

function pdfLineText(line: PdfLine): string {
  let text = ''
  let end: number | null = null
  for (const item of line.items) {
    if (end !== null) {
      const gap = item.x - end
      if (gap > Math.max(14, 2.2 * line.height) && !BULLET_START.test(`${text.trim()} `)) text += '\t'
      else if (gap > 0.12 * line.height && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' '
    }
    text += item.str
    end = item.x + item.width
  }
  return text.replace(/[  ]+/g, ' ').trim()
}

function isDateOnly(text: string): boolean {
  const dates = extractResumeDates(text)
  return dates.found && !dates.rest
}

/**
 * Splits a page into a full-width top band and two columns when an empty vertical gutter
 * runs under that band, as in sidebar layouts. A single column with right-aligned or
 * left-aligned dates also has a gutter, so a side made mostly of dates is not a column.
 */
function splitPdfColumns(lines: PdfLine[]): PdfLine[][] {
  if (lines.length < 12) return [lines]
  const items = lines.flatMap((line) => line.items)
  const minX = Math.min(...items.map((item) => item.x))
  const maxX = Math.max(...items.map((item) => item.x + item.width))
  const width = maxX - minX
  if (width < 200) return [lines]
  for (let gutter = minX + width * 0.2; gutter <= minX + width * 0.75; gutter += 2) {
    const crosses = (line: PdfLine) => line.items.some((item) => item.x < gutter + 4 && item.x + item.width > gutter - 4)
    const band = lines.findIndex((line) => !crosses(line))
    if (band < 0 || band > 5 || lines.slice(band).some(crosses)) continue
    const side = (keep: (item: PdfTextItem) => boolean) => lines.slice(band).map((line) => ({ ...line, items: line.items.filter(keep) })).filter((line) => line.items.length)
    const left = side((item) => item.x + item.width <= gutter)
    const right = side((item) => item.x >= gutter)
    if (left.length < 5 || right.length < 5) continue
    const mostlyDates = (column: PdfLine[]) => column.filter((line) => isDateOnly(pdfLineText(line))).length >= column.length * 0.5
    if (mostlyDates(left) || mostlyDates(right)) return [lines]
    const leftIsSidebar = gutter - minX < width * 0.4
    return [lines.slice(0, band), ...(leftIsSidebar ? [right, left] : [left, right])].filter((column) => column.length)
  }
  return [lines]
}

interface PdfRow {
  text: string
  x: number
  right: number
  y: number
  height: number
}

/**
 * Finds the indent that marks list items when the PDF carries no bullet glyphs. Browsers
 * draw list markers as shapes, so the only trace of a list is its deeper left edge.
 */
function unmarkedListIndent(rows: readonly PdfRow[], left: number, right: number): number | null {
  if (rows.some((row) => BULLET_START.test(`${row.text} `))) return null
  const centered = (row: PdfRow) => row.x - left > 20 && Math.abs((row.x + row.right) / 2 - (left + right) / 2) < 4
  const levels: Array<{ x: number; rows: PdfRow[] }> = []
  for (const row of rows.filter((item) => !centered(item)).sort((a, b) => a.x - b.x)) {
    const level = levels.at(-1)
    if (level && row.x - level.x <= 1.5) level.rows.push(row)
    else levels.push({ x: row.x, rows: [row] })
  }
  const shared = levels.filter((level) => level.rows.length >= 2)
  const shallow = shared[0]
  const deepest = shared.at(-1)
  if (!shallow || !deepest || deepest.x - shallow.x < 8) return null
  // With two levels, entry headers must sit at the margin. Otherwise the deeper level is all body text.
  if (shared.length === 2 && shallow.rows.every((row) => resumeHeadingBucket(row.text))) return null
  return deepest.x
}

function pdfColumnToText(lines: readonly PdfLine[]): string[] {
  const rows: PdfRow[] = lines.map((line) => {
    const last = line.items.at(-1)!
    return { text: pdfLineText(line), x: line.items[0]!.x, right: last.x + last.width, y: line.y, height: line.height }
  }).filter((row) => row.text)
  if (!rows.length) return []
  const left = Math.min(...rows.map((row) => row.x))
  const right = Math.max(...rows.map((row) => row.right))
  const listIndent = unmarkedListIndent(rows, left, right)
  const output: string[] = []
  let previous: PdfRow | null = null
  let bullet: { x: number } | null = null
  for (const row of rows) {
    const gap = previous !== null && previous.y - row.y > 1.75 * Math.max(previous.height, row.height)
    if (gap) {
      output.push('')
      bullet = null
    }
    const marked = BULLET_START.test(`${row.text} `)
    const firstWordWidth = (row.text.split(/\s/)[0]!.length + 1) * (row.right - row.x) / row.text.length
    const continues = previous !== null && !gap && !marked && Boolean(output.at(-1))
      && Math.abs(row.height - previous.height) <= previous.height * 0.06
      && !resumeHeadingBucket(row.text) && !resumeHeadingBucket(previous.text)
      // Unmarked list items usually end in a period, so a capital after one starts the next item.
      && !(listIndent !== null && /[.!?]$/.test(previous.text) && /^\p{Lu}/u.test(row.text))
      && (
        // A hanging indent: text that starts to the right of its bullet glyph.
        (bullet !== null && row.x > bullet.x + 2 && !extractResumeDates(row.text).found)
        // A reflowed paragraph: the first word of this line would not have fit on the previous one.
        // The widest line of a column always looks full, so a short one is not treated as prose.
        || (previous.right + firstWordWidth > right - 1 && previous.text.split(/\s+/).length >= 3 && !previous.text.includes('\t') && Math.abs(row.x - previous.x) <= 3)
      )
    if (continues) {
      const last = output.at(-1)!
      output[output.length - 1] = /\p{L}-$/u.test(last) ? `${last}${row.text}` : `${last} ${row.text}`
    } else {
      bullet = marked ? { x: row.x } : null
      output.push(!marked && listIndent !== null && Math.abs(row.x - listIndent) <= 1.5 ? `• ${row.text}` : row.text)
    }
    previous = row
  }
  return output
}

/** Turns the positioned text runs of one PDF page into reading-order lines. */
export function pdfItemsToLines(items: readonly PdfTextItem[]): string[] {
  return splitPdfColumns(groupPdfLines(items)).flatMap((column, index) => [...(index ? [''] : []), ...pdfColumnToText(column)])
}

async function loadBrowserPdfJs(): Promise<PdfJs> {
  // Vite removes this branch's imports from the server bundle, where no file is ever read.
  if (import.meta.env.SSR) throw new Error('PDF resumes are read in the browser.')
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function readPdf(bytes: Uint8Array, loadPdfJs: PdfJsLoader): Promise<Omit<ResumeFileText, 'kind'>> {
  const pdfjs = await loadPdfJs()
  const task = pdfjs.getDocument({ data: bytes.slice(), disableFontFace: true, useSystemFonts: false })
  try {
    const pdf = await task.promise
    const lines: string[] = []
    const links: string[] = []
    const pages = Math.min(pdf.numPages, MAX_PDF_PAGES)
    for (let number = 1; number <= pages; number += 1) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      const items: PdfTextItem[] = []
      for (const item of content.items) {
        if (!('str' in item) || item.dir === 'ttb') continue
        const transform = item.transform as number[]
        items.push({ str: item.str, x: transform[4] ?? 0, y: transform[5] ?? 0, width: item.width, height: item.height || Math.hypot(transform[2] ?? 0, transform[3] ?? 0) })
      }
      lines.push(...pdfItemsToLines(items))
      for (const annotation of await page.getAnnotations()) {
        const target = (annotation as { subtype?: unknown; url?: unknown })
        if (target.subtype === 'Link' && typeof target.url === 'string') links.push(target.url)
      }
    }
    if (lines.join('').length < 40) throw new Error('This PDF has no selectable text, so it is probably a scan or an image export. Upload the original Word file, or a PDF saved from the app that made it.')
    return { lines, links, warnings: pdf.numPages > pages ? [`Only the first ${pages} of ${pdf.numPages} pages were read.`] : [] }
  } catch (caught) {
    const name = caught instanceof Error ? caught.name : ''
    if (name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password, then upload it again.')
    if (name === 'InvalidPDFException' || name === 'FormatError') throw new Error('This file could not be read as a PDF. Export it again from the app that made it.')
    throw caught
  } finally {
    await task.destroy()
  }
}

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  offset: number
}

function readZipDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) { end = index; break }
  }
  if (end < 0) throw new Error('missing zip directory')
  const count = view.getUint16(end + 10, true)
  let position = view.getUint32(end + 16, true)
  const entries: ZipEntry[] = []
  const decoder = new TextDecoder()
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(position, true) !== 0x02014b50) throw new Error('damaged zip directory')
    const nameLength = view.getUint16(position + 28, true)
    entries.push({
      name: decoder.decode(bytes.subarray(position + 46, position + 46 + nameLength)),
      method: view.getUint16(position + 10, true),
      compressedSize: view.getUint32(position + 20, true),
      offset: view.getUint32(position + 42, true),
    })
    position += 46 + nameLength + view.getUint16(position + 30, true) + view.getUint16(position + 32, true)
  }
  return entries
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error('damaged zip entry')
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
  const data = bytes.slice(start, start + entry.compressedSize)
  if (entry.method === 0) return new TextDecoder().decode(data)
  if (entry.method !== 8) throw new Error('unsupported zip compression')
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const decoder = new TextDecoder()
  let text = ''
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_INFLATED_BYTES) {
      await reader.cancel()
      throw new Error('zip entry is too large')
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

function decodeXml(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, code: string) => {
    const key = code.toLowerCase()
    if (key === 'amp') return '&'
    if (key === 'lt') return '<'
    if (key === 'gt') return '>'
    if (key === 'quot') return '"'
    if (key === 'apos') return '\''
    const point = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10)
    return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match
  })
}

/** Converts WordprocessingML into lines: one per paragraph, with list items bulleted and table rows tab-joined. */
export function docxXmlToLines(xml: string): string[] {
  const output: string[] = []
  const cells: string[][] = []
  const rows: string[][][] = []
  const tag = /<(\/?)([\w:.-]+)([^>]*?)(\/?)>|([^<]+)/g
  let paragraph: string | null = null
  let list = false
  let inText = false
  let inTabStops = false
  let skip = 0
  const emit = (line: string) => (cells.at(-1) ?? output).push(line)
  for (let match = tag.exec(xml); match; match = tag.exec(xml)) {
    const [, closing, name, attributes, selfClosing, text] = match
    if (text !== undefined) {
      if (inText && paragraph !== null && !skip) paragraph += decodeXml(text)
      continue
    }
    if (name === 'mc:Fallback') { if (!selfClosing) skip += closing ? -1 : 1; continue }
    if (skip) continue
    if (name === 'w:p') {
      if (!closing && !selfClosing) { paragraph = ''; list = false }
      else { emit(`${list && paragraph?.trim() ? '• ' : ''}${paragraph ?? ''}`.replace(/[  ]+$/, '')); paragraph = null }
    } else if (name === 'w:t') inText = !closing && !selfClosing
    else if (name === 'w:tabs') inTabStops = !closing && !selfClosing
    else if (name === 'w:numPr' || (name === 'w:pStyle' && /w:val="List(?:Bullet|Number)/.test(attributes ?? ''))) list = true
    else if (paragraph !== null && name === 'w:tab' && !inTabStops) paragraph += '\t'
    else if (paragraph !== null && (name === 'w:br' || name === 'w:cr')) paragraph += '\n'
    else if (name === 'w:tr' && !selfClosing) {
      if (!closing) { rows.push([]); continue }
      const row = rows.pop() ?? []
      const filled = row.map((cell) => cell.filter((line) => line.trim()))
      if (filled.every((cell) => cell.length <= 1)) emit(filled.map((cell) => cell[0] ?? '').filter(Boolean).join('\t'))
      else row.forEach((cell, index) => { if (index) emit(''); cell.forEach(emit) })
    } else if (name === 'w:tc' && !selfClosing) {
      if (!closing) cells.push([])
      else rows.at(-1)?.push(cells.pop() ?? [])
    }
  }
  return output
}

async function readDocx(bytes: Uint8Array): Promise<Omit<ResumeFileText, 'kind'>> {
  let entries: ZipEntry[]
  try {
    entries = readZipDirectory(bytes)
  } catch {
    throw new Error('This file could not be opened as a Word document. Save it again as .docx or PDF, then upload that file.')
  }
  const body = entries.find((entry) => entry.name === 'word/document.xml')
  if (!body) throw new Error('This file is not a Word .docx document. Upload a PDF, a Word .docx file, a plain-text file or resume JSON.')
  try {
    const lines = docxXmlToLines(await readZipEntry(bytes, body))
    const seen = new Set(lines.map((line) => line.trim()))
    const headerLines: string[] = []
    for (const entry of entries.filter((item) => /^word\/header\d*\.xml$/.test(item.name)).sort((a, b) => a.name.localeCompare(b.name))) {
      for (const line of docxXmlToLines(await readZipEntry(bytes, entry))) {
        if (line.trim() && !seen.has(line.trim())) { seen.add(line.trim()); headerLines.push(line) }
      }
    }
    const links: string[] = []
    const relationships = entries.find((entry) => entry.name === 'word/_rels/document.xml.rels')
    if (relationships) {
      for (const [relationship] of (await readZipEntry(bytes, relationships)).matchAll(/<Relationship\b[^>]*>/g)) {
        const target = /\bTarget="([^"]*)"/.exec(relationship)?.[1]
        if (target && /\bType="[^"]*\/hyperlink"/.test(relationship)) links.push(decodeXml(target))
      }
    }
    return { lines: [...headerLines, ...lines], links, warnings: [] }
  } catch {
    throw new Error('This Word document is damaged or uses an unsupported archive format. Save it again as .docx or PDF, then upload that file.')
  }
}

function readText(bytes: Uint8Array): Omit<ResumeFileText, 'kind'> {
  const encoding = startsWith(bytes, [0xff, 0xfe]) ? 'utf-16le' : startsWith(bytes, [0xfe, 0xff]) ? 'utf-16be' : 'utf-8'
  const text = new TextDecoder(encoding).decode(bytes).replace(/^﻿/, '')
  const links: string[] = []
  const lines = text.split(/\r\n?|\n/).map((line) => line
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) => { links.push(url); return label })
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s*(?:[-*_]\s*){3,}$/, ''))
  return { lines, links, warnings: [] }
}

/** Extracts reading-order text from a PDF, Word .docx or plain-text resume. */
export async function extractResumeFileText(name: string, bytes: Uint8Array, loadPdfJs: PdfJsLoader = loadBrowserPdfJs): Promise<ResumeFileText> {
  if (bytes.byteLength > MAX_RESUME_FILE_BYTES) throw new Error('File is larger than the 10 MB limit for PDF, Word and text resumes.')
  const kind = sniffResumeFile(name, bytes)
  if (kind === 'json') throw new Error('Resume JSON is read by the JSON importer.')
  const result = kind === 'pdf' ? await readPdf(bytes, loadPdfJs) : kind === 'docx' ? await readDocx(bytes) : readText(bytes)
  if (!result.lines.some((line) => line.trim())) throw new Error('No readable text was found in this file.')
  return { kind, ...result }
}
