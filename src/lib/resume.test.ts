import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MAX_DOCUMENT_BYTES, analyzeResume, cloneResume, createBlankResume, createSection, createStarter, migrateResume, moveInArray, parseResumeJson, renderedPageCount, resumeToText, utf8ByteLength, validateResume } from './resume'

describe('resume document model', () => {
  it('validates every industry starter', () => {
    for (const id of ['universal', 'leadership', 'healthcare', 'education', 'creative', 'trades', 'student', 'academic'] as const) {
      assert.equal(validateResume(createStarter(id)).schemaVersion, 2)
    }
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
})

describe('resume output and review', () => {
  it('produces readable, ordered plain text', () => {
    const text = resumeToText(createStarter())
    assert.ok(text.includes('Jordan Lee'))
    assert.ok(text.includes('EXPERIENCE'))
    assert.ok(text.includes('• Led a 14-person'))
    assert.ok(text.indexOf('EXPERIENCE') < text.indexOf('CAPABILITIES'))
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

  it('treats the universal starter as a strong editable foundation', () => {
    assert.ok(analyzeResume(createStarter()).score >= 85)
  })
})
