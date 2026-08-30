import assert from 'node:assert/strict'
import { createRef } from 'react'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LibraryManager } from './LibraryManager'
import { createBlankResume, createStarter } from '../lib/resume'

describe('resume library manager', () => {
  it('shows targets, active state, recency, and starter-data risk', () => {
    const sample = createStarter('healthcare')
    const blank = { ...createBlankResume(), title: 'Research target', targetRole: 'Research coordinator', industry: 'Public health' }
    const library = { activeId: blank.id, documents: [sample, blank] }
    const html = renderToStaticMarkup(<LibraryManager library={library} dialogRef={createRef<HTMLElement>()} onActivate={() => undefined} onDuplicate={() => undefined} onDelete={() => undefined} onNew={() => undefined} onBackup={() => undefined} onClose={() => undefined} />)
    assert.ok(html.includes('Manage resume versions'))
    assert.ok(html.includes('Research coordinator · Public health'))
    assert.ok(html.includes('Sample content'))
    assert.ok(html.includes('Active'))
    assert.ok(html.includes('2 of 24 versions'))
  })
})
