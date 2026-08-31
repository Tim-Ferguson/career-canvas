import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContentEditor } from './ContentEditor'
import { createBlankResume, createSection, createStarter } from '../lib/resume'

describe('bounded cross-industry content editor', () => {
  it('bounds text inputs and exposes optional details and keywords', () => {
    const html = renderToStaticMarkup(<ContentEditor resume={createStarter('healthcare')} onChange={() => undefined} />)
    assert.ok(html.includes('maxLength="20000"'))
    assert.ok(html.includes('type="email" autoComplete="email"'))
    assert.ok(html.includes('type="tel" autoComplete="tel"'))
    assert.equal((html.match(/type="url"/g) ?? []).length >= 3, true)
    assert.ok(html.includes('id="profile-link-label-link-linkedin"'))
    assert.ok(html.includes('Add supporting detail'))
    assert.ok(html.includes('Add optional keywords'))
  })

  it('uses section-aware timeline language and keeps optional metadata reachable', () => {
    const resume = createBlankResume()
    resume.sections = [createSection('experience'), createSection('education'), createSection('certifications'), createSection('publications'), createSection('languages'), createSection('skills')]
    resume.sections[2]!.entries[0] = { ...resume.sections[2]!.entries[0]!, endDate: 'May 2028', current: true }
    const html = renderToStaticMarkup(<ContentEditor resume={resume} onChange={() => undefined} />)
    for (const label of ['Current role or position', 'Completed or expected', 'Active with no listed end date', 'Forthcoming or in press', 'Region or dialect (optional)', 'First used']) {
      assert.ok(html.includes(label), `expected timeline label: ${label}`)
    }
    assert.equal((html.match(/Optional location and dates/g) ?? []).length, 2)
    assert.ok(html.includes('Details (optional)'))
    assert.ok(html.includes('Your previous end value is preserved'))
  })

  it('disables bounded add actions when document limits are reached', () => {
    const resume = createBlankResume()
    resume.profile.links = Array.from({ length: 24 }, (_, index) => ({ id: `link-${index}`, label: `Profile ${index + 1}`, url: 'example.com' }))
    resume.sections = Array.from({ length: 32 }, () => createSection('custom'))
    const html = renderToStaticMarkup(<ContentEditor resume={resume} onChange={() => undefined} />)
    assert.ok(html.includes('Profile link limit reached'))
    assert.ok(html.includes('The 32-section document limit is reached.'))
    assert.ok(html.includes('disabled=""'))
  })

  it('provides an exact, keyboard-accessible outline for long resumes', () => {
    const resume = createBlankResume()
    resume.sections[1]!.visible = false
    resume.sections[2]!.title = 'Technical toolkit'
    const html = renderToStaticMarkup(<ContentEditor resume={resume} onChange={() => undefined} />)
    assert.ok(html.includes('Resume outline'))
    assert.ok(html.includes('3 sections · 2 shown'))
    assert.ok(html.includes('aria-label="Resume sections"'))
    assert.ok(html.includes('Expand all editors'))
    assert.ok(html.includes('Collapse all editors'))
    assert.ok(html.includes('Education · 1 entry · Hidden'))
    assert.ok(html.includes('Technical toolkit'))
  })
})
