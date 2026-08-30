import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStarter } from '../lib/resume'
import { DesignPanel } from './DesignPanel'

describe('content-aware design controls', () => {
  it('explains layout traits and renders fit actions for the real page count', () => {
    const html = renderToStaticMarkup(<DesignPanel resume={createStarter()} renderedPages={3} onChange={() => undefined} onPrint={() => undefined} onEditContent={() => undefined} />)
    assert.ok(html.includes('Content-aware fit'))
    assert.ok(html.includes('Review this 3-page draft before compressing it'))
    assert.ok(html.includes('Prioritize content'))
    assert.ok(html.includes('Compare compact'))
    assert.ok(html.includes('dashed guides in the live preview'))
    for (const trait of ['Balanced spacing', 'Centered header', 'Side labels', 'Smaller type', 'Open spacing', 'CV-friendly']) assert.ok(html.includes(trait))
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length >= 3, true)
  })
})
