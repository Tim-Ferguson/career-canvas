import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseResumeImportJson, parseResumeJson } from './resume'

const jsonResumeFixture = {
  $schema: 'https://jsonresume.org/schema',
  basics: {
    name: 'Taylor Kim', label: 'Community Health Researcher', image: 'https://example.com/photo.jpg', email: 'taylor@example.com', phone: '+1 555 0100', url: 'https://taylorkim.example', summary: 'Researcher translating evidence into accessible public programs.',
    location: { address: '100 Main St', postalCode: '85001', city: 'Phoenix', region: 'AZ', countryCode: 'US' },
    profiles: [{ network: 'ORCID', username: '0000-0000', url: 'https://orcid.org/0000-0000' }],
  },
  work: [{ name: 'Public Health Lab', position: 'Research Lead', location: 'Phoenix, AZ', description: 'Community-engaged research group.', startDate: '2022-01', endDate: '', url: 'https://example.com/lab', summary: 'Lead mixed-methods studies.', highlights: ['Improved enrollment by 24%.'], keywords: ['Implementation science'] }],
  volunteer: [{ organization: 'Mutual Aid Network', position: 'Data volunteer', startDate: '2020', endDate: '2021', summary: 'Built reporting tools.', highlights: ['Trained 12 volunteers.'] }],
  education: [{ institution: 'State University', url: 'https://example.edu', area: 'Public Health', studyType: 'MPH', startDate: '2018', endDate: '2020', score: '3.9/4.0', courses: ['Epidemiology'] }],
  awards: [{ title: 'Community Research Award', date: '2024', awarder: 'Regional Foundation', summary: 'Recognized participatory research.' }],
  certificates: [{ name: 'Certified in Public Health', date: '2021', issuer: 'NBPHE', url: 'https://example.com/certificate' }],
  publications: [{ name: 'Access and trust', publisher: 'Public Health Journal', releaseDate: '2025', url: 'https://example.com/article', summary: 'A mixed-methods study.' }],
  skills: [{ name: 'Research methods', level: 'Advanced', keywords: ['Interviews', 'R', 'Survey design'] }],
  languages: [{ language: 'Spanish', fluency: 'Professional working proficiency' }],
  interests: [{ name: 'Community archives', keywords: ['Oral history'] }],
  references: [{ name: 'Dr. Morgan Lee', reference: 'Taylor leads rigorous, trusted partnerships.' }],
  projects: [{ name: 'Access dashboard', entity: 'County coalition', type: 'Civic technology', roles: ['Research lead'], startDate: '2023', endDate: '2024', description: 'Mapped service access.', highlights: ['Combined five public datasets.'], keywords: ['Data visualization'], url: 'https://example.com/dashboard' }],
  meta: { canonical: 'https://registry.jsonresume.org/taylor', lastModified: '2026-08-01T12:00:00.000Z' },
  xCustomPortfolio: { featured: true },
}

describe('JSON Resume interoperability', () => {
  it('migrates every official content section into one strict editable document', () => {
    const before = JSON.stringify(jsonResumeFixture)
    const result = parseResumeImportJson(JSON.stringify(jsonResumeFixture))
    const resume = result.document
    assert.equal(result.format, 'json-resume')
    assert.equal(resume.schemaVersion, 2)
    assert.equal(resume.profile.name, 'Taylor Kim')
    assert.equal(resume.profile.location, '100 Main St, 85001, Phoenix, AZ, US')
    assert.equal(resume.profile.links[0]?.label, 'ORCID')
    assert.equal(resume.updatedAt, '2026-08-01T12:00:00.000Z')
    assert.equal(resume.sections.length, 11)
    assert.deepEqual(resume.sections.map((section) => section.kind), ['experience', 'volunteering', 'education', 'projects', 'certifications', 'awards', 'publications', 'skills', 'languages', 'interests', 'custom'])
    const work = resume.sections[0]!.entries[0]!
    assert.equal(work.current, true)
    assert.match(work.summary, /Community-engaged research group[\s\S]*Lead mixed-methods/)
    assert.deepEqual(work.keywords, ['Implementation science'])
    const education = resume.sections[2]!.entries[0]!
    assert.equal(education.title, 'MPH, Public Health')
    assert.deepEqual(education.highlights, ['Score: 3.9/4.0', 'Course: Epidemiology'])
    assert.equal(resume.sections.at(-1)?.title, 'References')
    assert.equal(JSON.stringify(jsonResumeFixture), before)
  })

  it('discloses presentation and extension data that is intentionally not migrated', () => {
    const result = parseResumeImportJson(JSON.stringify(jsonResumeFixture))
    assert.equal(result.warnings.length, 3)
    assert.ok(result.warnings.some((warning) => /profile image/.test(warning)))
    assert.ok(result.warnings.some((warning) => /registry metadata is not rendered/.test(warning)))
    assert.ok(result.warnings.some((warning) => /extension fields/.test(warning)))
  })

  it('also accepts JSON Resume through the general parser and refuses malformed arrays', () => {
    assert.equal(parseResumeJson(JSON.stringify(jsonResumeFixture)).profile.name, 'Taylor Kim')
    assert.throws(() => parseResumeImportJson(JSON.stringify({ basics: {}, work: 'not a list' })), /work must be a list/)
    assert.throws(() => parseResumeImportJson(JSON.stringify({ basics: {}, skills: [{ name: 'Methods', keywords: [42] }] })), /keywords\[0\] must be text/)
    assert.throws(() => parseResumeImportJson(JSON.stringify({ unexpected: true })), /Unsupported resume schema/)
  })
})
