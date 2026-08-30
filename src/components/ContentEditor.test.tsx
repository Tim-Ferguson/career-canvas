import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContentEditor } from './ContentEditor'
import { createBlankResume, createSection, createStarter } from '../lib/resume'

describe('bounded cross-industry content editor', () => {
  it('bounds text inputs and exposes optional details and keywords', () => {
    const html = renderToStaticMarkup(<ContentEditor resume={createStarter('healthcare')} onChange={() => undefined} />)
    assert.ok(html.includes('maxLength="20000"'))
    assert.ok(html.includes('Add supporting detail'))
    assert.ok(html.includes('Add optional keywords'))
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
})
