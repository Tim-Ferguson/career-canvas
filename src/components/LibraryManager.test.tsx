import assert from 'node:assert/strict'
import { createRef } from 'react'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LibraryManager } from './LibraryManager'
import { createBlankResume, createStarter } from '../lib/resume'
import { createDeletedResumeRecovery } from '../lib/deletionRecovery'

describe('resume library manager', () => {
  it('shows targets, active state, recency, and starter-data risk', () => {
    const sample = createStarter('healthcare')
    const blank = { ...createBlankResume(), title: 'Research target', targetRole: 'Research coordinator', industry: 'Public health', updatedAt: '2020-01-01T00:00:00.000Z' }
    const copy = { ...blank, id: 'resume-research-copy', title: 'Research target copy', updatedAt: '2026-08-01T00:00:00.000Z' }
    const library = { activeId: blank.id, documents: [sample, blank, copy] }
    const deletedRecovery = createDeletedResumeRecovery({ ...createBlankResume(), title: 'Recently removed target' })
    const html = renderToStaticMarkup(<LibraryManager library={library} dialogRef={createRef<HTMLElement>()} onActivate={() => undefined} onDuplicate={() => undefined} onDelete={() => undefined} onNew={() => undefined} onBackup={() => undefined} deletedRecovery={deletedRecovery} recoveryPersistent onRestoreDeleted={() => undefined} onDiscardDeleted={() => undefined} onClose={() => undefined} />)
    assert.ok(html.includes('Manage resume versions'))
    assert.ok(html.includes('Research coordinator · Public health'))
    assert.ok(html.includes('Sample content'))
    assert.ok(html.includes('Active'))
    assert.ok(html.includes('3 of 24 versions'))
    assert.ok(html.includes('serialized workspace'))
    assert.ok(html.includes('Largest version:'))
    assert.ok(html.includes('Modest'))
    assert.ok(html.includes('Sort resume versions'))
    assert.ok(html.includes('Review '))
    assert.ok(html.includes('Same content'))
    assert.ok(html.includes('6+ months old'))
    assert.ok(html.includes('need essential fixes'))
    assert.ok(html.includes('Recently removed: Recently removed target'))
    assert.ok(html.includes('Discard permanently'))
  })
})
