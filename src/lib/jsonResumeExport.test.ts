import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSection, createStarter, parseResumeImportJson } from './resume'
import { buildJsonResumeExport } from './jsonResumeExport'

describe('JSON Resume export', () => {
  it('exports visible cross-industry content and preserves supported custom fields on re-import', () => {
    const resume = createStarter('public_service')
    resume.profile.links.push({ id: 'link-orcid', label: 'ORCID', url: 'https://orcid.org/0000' })
    const affiliation = createSection('affiliations')
    affiliation.entries[0] = { ...affiliation.entries[0]!, title: 'Board member', organization: 'Regional Coalition', startDate: '2024', current: true }
    const custom = createSection('custom')
    custom.title = 'Clinical placements'
    custom.entries[0] = { ...custom.entries[0]!, title: 'Community rotation', organization: 'County Clinic', highlights: ['Served 80 patients.'] }
    resume.sections.push(affiliation, custom)
    const before = JSON.stringify(resume)
    const exported = buildJsonResumeExport(resume)
    assert.equal(exported.document.$schema, 'https://jsonresume.org/schema')
    assert.ok(Array.isArray(exported.document.work))
    assert.ok(Array.isArray(exported.document.volunteer))
    assert.ok(exported.warnings.some((warning) => /namespaced Timo’s Resume Maker extension/.test(warning)))

    const imported = parseResumeImportJson(JSON.stringify(exported.document)).document
    assert.equal(imported.title, resume.title)
    assert.equal(imported.industry, resume.industry)
    assert.deepEqual(imported.settings, resume.settings)
    assert.ok(imported.sections.some((section) => section.kind === 'affiliations' && section.entries[0]?.title === 'Board member'))
    assert.ok(imported.sections.some((section) => section.kind === 'custom' && section.title === 'Clinical placements'))
    assert.equal(JSON.stringify(resume), before)
  })

  it('omits hidden sections from a sharing copy and reports the omission', () => {
    const resume = createStarter()
    resume.sections[0]!.visible = false
    const exported = buildJsonResumeExport(resume)
    assert.equal('work' in exported.document, false)
    assert.deepEqual(exported.warnings, ['1 hidden section was omitted from this sharing copy.'])
  })

  it('represents ongoing entries with an empty standard end date', () => {
    const resume = createStarter()
    const exported = buildJsonResumeExport(resume)
    const work = exported.document.work as Array<Record<string, unknown>>
    assert.equal(work[0]?.startDate, '2022')
    assert.equal(work[0]?.endDate, '')
  })

  it('keeps credential issue dates separate from expiration or status text', () => {
    const resume = createStarter('healthcare')
    const credential = resume.sections.find((section) => section.kind === 'certifications')!.entries[0]!
    credential.startDate = '2023'
    credential.endDate = 'Active'
    const imported = parseResumeImportJson(JSON.stringify(buildJsonResumeExport(resume).document)).document
    const restored = imported.sections.find((section) => section.kind === 'certifications')!.entries[0]!
    assert.equal(restored.startDate, '2023')
    assert.equal(restored.endDate, 'Active')
    assert.equal(restored.current, false)
  })

  it('normalizes valid links and omits invalid contact targets with warnings', () => {
    const resume = createStarter()
    resume.profile.website = 'portfolio.example/work'
    resume.profile.email = 'person@example.com?subject=unexpected'
    resume.profile.phone = '++1 555 555 0199'
    resume.profile.links = [
      { id: 'safe', label: 'ORCID', url: 'orcid.org/0000' },
      { id: 'unsafe', label: 'Bad', url: 'javascript:alert(1)' },
    ]
    resume.sections[0]!.entries[0]!.url = 'data:text/html,hello'
    const exported = buildJsonResumeExport(resume)
    const basics = exported.document.basics as Record<string, unknown>
    assert.equal(basics.url, 'https://portfolio.example/work')
    assert.equal(basics.email, '')
    assert.equal(basics.phone, '')
    assert.deepEqual(basics.profiles, [{ network: 'ORCID', username: '', url: 'https://orcid.org/0000' }])
    const work = exported.document.work as Array<Record<string, unknown>>
    assert.equal(work[0]?.url, '')
    assert.ok(exported.warnings.some((warning) => /2 invalid or unsafe web links were omitted/.test(warning)))
    assert.ok(exported.warnings.some((warning) => /invalid email/.test(warning)))
    assert.ok(exported.warnings.some((warning) => /invalid phone/.test(warning)))
  })
})
