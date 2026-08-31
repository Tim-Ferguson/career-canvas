import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResumePreview, entryNeedsFlexibleBreak } from './ResumePreview'
import { createSection, createStarter, layouts, pageSizes, sectionKinds } from '../lib/resume'

describe('semantic resume rendering', () => {
  it('renders every layout from one consistent document structure', () => {
    for (const layout of layouts) {
      for (const pageSize of pageSizes) {
        const resume = createStarter()
        resume.settings.layout = layout
        resume.settings.pageSize = pageSize
        const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
        assert.ok(html.includes(`data-layout="${layout}"`))
        assert.ok(html.includes(`data-page-size="${pageSize}"`))
        assert.equal((html.match(/<h1>/g) ?? []).length, 1)
        assert.ok(html.includes('<address class="document-contact">'))
        assert.ok(html.includes('<section class="document-section document-section-experience"'))
        assert.ok(html.indexOf('>Experience</h2>') < html.indexOf('>Capabilities</h2>'))
        assert.equal(html.includes('<img'), false)
      }
    }
  })

  it('supports every cross-industry section kind without changing reading order', () => {
    const resume = createStarter()
    resume.sections = sectionKinds.map((kind) => {
      const section = createSection(kind)
      section.entries[0] = { ...section.entries[0]!, title: `${kind} evidence` }
      return section
    })
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    for (const kind of sectionKinds) assert.ok(html.includes(`document-section-${kind}`))
    const positions = sectionKinds.map((kind) => html.indexOf(`document-section-${kind}`))
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
  })

  it('omits hidden sections and keeps unsafe links visible but never executable', () => {
    const resume = createStarter()
    resume.sections[0]!.visible = false
    resume.profile.website = 'javascript:alert(1)'
    resume.profile.email = 'person@example.com?subject=surprise'
    resume.profile.phone = '++1 555 555 0199'
    resume.sections[1]!.entries[0]!.title = 'Visible evidence title'
    resume.sections[1]!.entries[0]!.url = 'data:text/html,hello'
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    assert.equal(html.includes('document-section-experience'), false)
    assert.equal(html.includes('href="javascript:'), false)
    assert.equal(html.includes('href="data:'), false)
    assert.equal(html.includes('href="mailto:'), false)
    assert.equal(html.includes('href="tel:'), false)
    assert.ok(html.includes('javascript:alert(1)'))
    assert.ok(html.includes('Visible evidence title'))
  })

  it('allows unusually long entries and summaries to flow across print pages safely', () => {
    const resume = createStarter()
    const entry = resume.sections[0]!.entries[0]!
    entry.highlights = Array.from({ length: 9 }, (_, index) => `Evidence point ${index + 1}`)
    resume.profile.summary = 'summary '.repeat(181)
    assert.equal(entryNeedsFlexibleBreak(entry), true)
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    assert.ok(html.includes('document-entry-flow'))
    assert.ok(html.includes('document-header-flow'))
  })

  it('renders ongoing dates with meaning appropriate to each section', () => {
    const resume = createStarter()
    const education = createSection('education')
    const certification = createSection('certifications')
    const publication = createSection('publications')
    education.entries[0] = { ...education.entries[0]!, title: 'Part-time program', startDate: '2025', endDate: 'Previously expected 2027', current: true }
    certification.entries[0] = { ...certification.entries[0]!, title: 'Professional license', startDate: '2024', current: true }
    publication.entries[0] = { ...publication.entries[0]!, title: 'Accepted article', current: true }
    resume.sections = [education, certification, publication]
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    assert.ok(html.includes('2025 – In progress'))
    assert.ok(html.includes('2024 – Active'))
    assert.ok(html.includes('Forthcoming'))
    assert.equal(html.includes('Previously expected 2027'), false)
  })

  it('omits empty draft scaffolding while retaining meaningful orphan metadata', () => {
    const resume = createStarter()
    resume.profile = { name: '', headline: '', email: '', phone: '', location: '', website: '', summary: '', links: [] }
    const empty = createSection('custom')
    empty.title = 'Empty scaffold'
    const project = createSection('projects')
    project.entries = [{ ...project.entries[0]!, summary: 'A useful project description.', location: 'Remote', endDate: '2026' }, createSection('custom').entries[0]!]
    resume.sections = [empty, project]
    const html = renderToStaticMarkup(<ResumePreview resume={resume} />)
    assert.equal(html.includes('document-header'), false)
    assert.equal(html.includes('Empty scaffold'), false)
    assert.ok(html.includes('>Projects</h2>'))
    assert.equal((html.match(/class="document-entry /g) ?? []).length, 1)
    assert.ok(html.includes('document-entry-meta-standalone'))
    assert.ok(html.includes('Remote'))
    assert.ok(html.includes('2026'))
  })
})
