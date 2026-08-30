import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResumePreview } from './ResumePreview'
import { createSection, createStarter, layouts, sectionKinds } from '../lib/resume'

describe('semantic resume rendering', () => {
  it('renders every layout from one consistent document structure', () => {
    for (const layout of layouts) {
      const resume = createStarter()
      resume.settings.layout = layout
      const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
      assert.ok(html.includes(`data-layout="${layout}"`))
      assert.equal((html.match(/<h1>/g) ?? []).length, 1)
      assert.ok(html.includes('<address class="document-contact">'))
      assert.ok(html.includes('<section class="document-section document-section-experience"'))
      assert.ok(html.indexOf('>Experience</h2>') < html.indexOf('>Capabilities</h2>'))
      assert.equal(html.includes('<img'), false)
    }
  })

  it('supports every cross-industry section kind without changing reading order', () => {
    const resume = createStarter()
    resume.sections = sectionKinds.map((kind) => createSection(kind))
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    for (const kind of sectionKinds) assert.ok(html.includes(`document-section-${kind}`))
    const positions = sectionKinds.map((kind) => html.indexOf(`document-section-${kind}`))
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
  })

  it('omits hidden sections and never emits executable user-supplied URL schemes', () => {
    const resume = createStarter()
    resume.sections[0]!.visible = false
    resume.profile.website = 'javascript:alert(1)'
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    assert.equal(html.includes('document-section-experience'), false)
    assert.equal(html.includes('href="javascript:'), false)
    assert.ok(html.includes('href="https://javascript:alert(1)"'))
  })
})
