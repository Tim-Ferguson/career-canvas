import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const styles = readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8')

describe('print pagination stylesheet', () => {
  it('keeps normal semantic blocks together while allowing pathological content to flow', () => {
    for (const rule of [
      '@page career-letter { size: letter; margin: 0; }',
      '@page career-a4 { size: A4; margin: 0; }',
      '.document-header-flow, .document-entry-flow { break-inside: auto; }',
      '.document-entry li.document-highlight-flow { break-inside: auto; }',
      '.document-contact-flow, .document-keyword-list-flow { display: block; }',
      '.document-contact-flow > span, .document-keyword-list-flow > span { display: inline; margin-right: 10px; }',
      '.document-summary, .document-entry-summary, .document-entry li { orphans: 2; widows: 2; }',
    ]) assert.ok(styles.includes(rule), rule)
  })
})
