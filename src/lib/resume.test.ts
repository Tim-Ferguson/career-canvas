import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MAX_DOCUMENT_BYTES, STARTERS, analyzeResume, cloneResume, containsStarterSampleContent, createBlankResume, createSection, createStarter, entryHasRenderableContent, formatEntryDateRange, migrateResume, moveInArray, parseResumeJson, renderedPageCount, resumeToText, sectionHasRenderableContent, utf8ByteLength, validateResume } from './resume'

const starterIds = ['universal', 'leadership', 'healthcare', 'education', 'creative', 'trades', 'student', 'public_service', 'career_change', 'academic'] as const

describe('resume document model', () => {
  it('validates every industry starter', () => {
    assert.equal(STARTERS.length, starterIds.length)
    for (const id of starterIds) {
      assert.equal(validateResume(createStarter(id)).schemaVersion, 2)
    }
  })

  it('gives public-service and career-change stories distinct, honest structures', () => {
    const publicService = createStarter('public_service')
    assert.equal(publicService.settings.layout, 'minimal')
    assert.equal(publicService.sections[0]!.title, 'Public service experience')
    assert.ok(publicService.sections.some((section) => section.kind === 'volunteering'))
    const careerChange = createStarter('career_change')
    assert.equal(careerChange.settings.layout, 'minimal')
    assert.equal(careerChange.sections[0]!.kind, 'skills')
    assert.ok(careerChange.sections.some((section) => section.kind === 'experience'))
    assert.ok(careerChange.sections.some((section) => section.kind === 'projects'))
  })

  it('supports drafts while rejecting unsupported fields', () => {
    assert.equal(validateResume(createBlankResume()).profile.name, '')
    const invalid = { ...createBlankResume(), surprise: true }
    assert.throws(() => validateResume(invalid), /unrecognized|unrecognized key/i)
  })

  it('refuses duplicate IDs across sections and entries', () => {
    const resume = createStarter()
    resume.sections.push({ ...createSection('projects'), id: resume.sections[0]!.id })
    assert.throws(() => validateResume(resume), /Section IDs must be unique/)
    const second = cloneResume(createStarter())
    second.sections[1]!.entries[0]!.id = second.sections[0]!.entries[0]!.id
    assert.throws(() => validateResume(second), /Entry IDs must be unique/)
  })

  it('migrates original schema v1 documents without losing core content', () => {
    const migrated = migrateResume({
      schemaVersion: 1,
      layout: 'editorial',
      profile: { name: 'Taylor Kim', headline: 'Teacher', email: 'taylor@example.com', summary: 'Student-centered educator.' },
      sections: [{ id: 'experience', title: 'Teaching', kind: 'experience', entries: [{ id: 'role-1', heading: 'Teacher', subheading: 'Central High', period: '2020 — present', highlights: ['Improved course completion.'] }] }],
    })
    assert.equal(migrated.schemaVersion, 2)
    assert.equal(migrated.profile.name, 'Taylor Kim')
    assert.equal(migrated.settings.layout, 'modern')
    assert.equal(migrated.sections[0]!.entries[0]!.current, true)
    assert.match(migrated.sections[0]!.entries[0]!.highlights[0]!, /completion/)
  })

  it('enforces the UTF-8 document safety limit', () => {
    assert.equal(utf8ByteLength('résumé'), 8)
    const oversized = createStarter()
    oversized.profile.summary = '🧭'.repeat(MAX_DOCUMENT_BYTES / 2)
    assert.throws(() => validateResume(oversized), /2 MB/)
  })

  it('enforces bounded collections used by the visual editor', () => {
    const tooManySections = createBlankResume()
    tooManySections.sections = Array.from({ length: 33 }, () => createSection('custom'))
    assert.throws(() => validateResume(tooManySections), /32/)
    const tooManyHighlights = createBlankResume()
    tooManyHighlights.sections[0]!.entries[0]!.highlights = Array.from({ length: 101 }, () => 'Evidence')
    assert.throws(() => validateResume(tooManyHighlights), /100/)
    const tooManyLinks = createBlankResume()
    tooManyLinks.profile.links = Array.from({ length: 25 }, (_, index) => ({ id: `link-${index}`, label: 'Profile', url: 'example.com' }))
    assert.throws(() => validateResume(tooManyLinks), /24/)
  })

  it('imports valid resume JSON with a Unicode byte-order mark', () => {
    const resume = createStarter()
    assert.deepEqual(parseResumeJson(`\uFEFF${JSON.stringify(resume)}`), resume)
  })

  it('reorders collections immutably and within bounds', () => {
    const source = ['a', 'b', 'c']
    assert.deepEqual(moveInArray(source, 2, -10), ['c', 'a', 'b'])
    assert.deepEqual(moveInArray(source, 0, 99), ['b', 'c', 'a'])
    assert.deepEqual(source, ['a', 'b', 'c'])
  })

  it('reports rendered page overflow at letter and A4 boundaries', () => {
    assert.equal(renderedPageCount(1056, 'letter'), 1)
    assert.equal(renderedPageCount(1057, 'letter'), 2)
    assert.equal(renderedPageCount(1122, 'a4'), 1)
    assert.equal(renderedPageCount(2250, 'a4'), 3)
    assert.equal(renderedPageCount(Number.NaN, 'letter'), 1)
  })

  it('formats one portable current flag with section-aware language', () => {
    const entry = { ...createSection('custom').entries[0]!, startDate: '2024', endDate: 'Stored end date', current: true }
    assert.equal(formatEntryDateRange(entry, 'experience'), '2024 – Present')
    assert.equal(formatEntryDateRange(entry, 'education'), '2024 – In progress')
    assert.equal(formatEntryDateRange(entry, 'certifications'), '2024 – Active')
    assert.equal(formatEntryDateRange(entry, 'publications'), '2024 – Forthcoming')
    assert.equal(entry.endDate, 'Stored end date')
  })
})

describe('resume output and review', () => {
  it('produces readable, ordered plain text', () => {
    const text = resumeToText(createStarter())
    assert.ok(text.includes('Jordan Lee'))
    assert.ok(text.includes('EXPERIENCE'))
    assert.ok(text.includes('• Led a 14-person'))
    assert.ok(text.indexOf('EXPERIENCE') < text.indexOf('CAPABILITIES'))
  })

  it('keeps section-aware ongoing language in ATS-friendly plain text', () => {
    const resume = createBlankResume()
    const credential = createSection('certifications')
    credential.entries[0] = { ...credential.entries[0]!, title: 'State license', startDate: '2024', current: true }
    resume.sections = [credential]
    assert.match(resumeToText(resume), /2024 – Active/)
  })

  it('omits empty draft scaffolding from plain text without mutating it', () => {
    const resume = createBlankResume()
    const empty = createSection('custom')
    empty.title = 'Empty scaffold'
    const project = createSection('projects')
    project.entries = [{ ...project.entries[0]!, summary: 'Useful project context.', location: 'Remote', endDate: '2026' }, createSection('custom').entries[0]!]
    resume.sections = [empty, project]
    const before = JSON.stringify(resume)
    const text = resumeToText(resume)
    assert.equal(entryHasRenderableContent(empty.entries[0]!), false)
    assert.equal(sectionHasRenderableContent(empty), false)
    assert.equal(text.includes('EMPTY SCAFFOLD'), false)
    assert.match(text, /PROJECTS\nRemote \| 2026\nUseful project context\./)
    assert.equal(JSON.stringify(resume), before)
  })

  it('gives a blank draft specific, prioritized guidance', () => {
    const analysis = analyzeResume(createBlankResume())
    assert.ok(analysis.score < 70)
    assert.ok(analysis.issues.some((issue) => issue.id === 'name' && issue.severity === 'essential'))
    assert.ok(analysis.estimatedPages >= 1)
  })

  it('flags contact mistakes, repeated evidence, weak phrasing, and incomplete links', () => {
    const resume = createStarter()
    resume.profile.email = 'not-an-email'
    resume.profile.website = 'not a website'
    resume.sections[0]!.entries[0]!.highlights = ['Responsible for weekly reports', 'Responsible for weekly reports']
    const ids = analyzeResume(resume).issues.map((issue) => issue.id)
    assert.ok(ids.includes('email-format'))
    assert.ok(ids.includes('links'))
    assert.ok(ids.includes('duplicate-bullets'))
    assert.ok(ids.includes('weak-bullets'))
  })

  it('flags every fictional starter until its identity and example results are replaced', () => {
    for (const id of starterIds) {
      const resume = createStarter(id)
      assert.equal(containsStarterSampleContent(resume), true)
      assert.ok(analyzeResume(resume).issues.some((issue) => issue.id === 'sample-content' && issue.severity === 'essential'))
      resume.profile = { ...resume.profile, name: 'Taylor Kim', email: 'taylor@example.com', phone: '+1 555 555 0199', website: '', links: [] }
      assert.equal(containsStarterSampleContent(resume), true, `${id} should retain a sample-evidence fingerprint after identity replacement`)
    }
    assert.equal(containsStarterSampleContent(createBlankResume()), false)
  })

  it('treats a personalized starter as a strong editable foundation', () => {
    const resume = createStarter()
    resume.profile = { ...resume.profile, name: 'Taylor Kim', email: 'taylor@example.com', phone: '+1 555 555 0199', website: 'taylorkim.example', links: [] }
    let result = 10
    for (const section of resume.sections) {
      for (const entry of section.entries) {
        entry.highlights = entry.highlights.map(() => `Improved a relevant outcome by ${result++}%.`)
      }
    }
    assert.equal(containsStarterSampleContent(resume), false)
    assert.ok(analyzeResume(resume).score >= 85)
  })

  it('accepts substantial projects without requiring conventional employment', () => {
    const resume = createBlankResume()
    resume.sections = [createSection('projects')]
    resume.sections[0]!.entries[0] = { ...resume.sections[0]!.entries[0]!, title: 'Community research project', organization: 'Neighborhood coalition', highlights: ['Interviewed 24 residents and presented three service recommendations.'] }
    assert.equal(analyzeResume(resume).issues.some((issue) => issue.id === 'evidence'), false)
  })
})
