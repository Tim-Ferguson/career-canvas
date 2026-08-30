import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSection, createStarter } from './resume'
import { buildDesignGuidance } from './designGuidance'

describe('content-aware design guidance', () => {
  it('prioritizes editing before compression on a long general resume', () => {
    const resume = createStarter()
    const guidance = buildDesignGuidance(resume, 3)
    assert.equal(guidance.tone, 'attention')
    assert.equal(guidance.actions[0]!.id, 'edit-content')
    assert.ok(guidance.actions.some((action) => action.id === 'compare-compact'))
  })

  it('recognizes publication-heavy CVs without imposing a one-page target', () => {
    const resume = createStarter('academic')
    const publications = resume.sections.find((section) => section.kind === 'publications')!
    publications.entries.push({ ...publications.entries[0]!, id: 'publication-3', title: 'A third publication' })
    resume.settings.layout = 'modern'
    const guidance = buildDesignGuidance(resume, 4)
    assert.match(guidance.title, /CV structure/)
    assert.match(guidance.detail, /multiple pages can be appropriate/)
    assert.ok(guidance.actions.some((action) => action.id === 'use-academic'))
    assert.equal(guidance.actions.some((action) => action.id === 'compare-compact'), false)
  })

  it('suggests restoring readability when a one-page resume uses tight spacing', () => {
    const resume = createStarter()
    resume.settings.density = 'tight'
    const guidance = buildDesignGuidance(resume, 1)
    assert.deepEqual(guidance.actions[0], { id: 'use-balanced', label: 'Try balanced spacing', settings: { density: 'balanced' } })
  })

  it('ignores hidden publications and never mutates the resume', () => {
    const resume = createStarter()
    const publications = createSection('publications')
    publications.visible = false
    publications.entries = Array.from({ length: 4 }, (_, index) => ({ ...publications.entries[0]!, id: `publication-${index}`, title: `Publication ${index}` }))
    resume.sections.push(publications)
    const before = JSON.stringify(resume)
    assert.equal(buildDesignGuidance(resume, 2).title, 'Make the second page earn its place')
    assert.equal(JSON.stringify(resume), before)
  })
})
