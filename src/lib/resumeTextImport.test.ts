import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateResume } from './resume'
import { extractResumeDates, importResumeText, resumeHeadingBucket } from './resumeTextImport'

const resumeText = `JORDAN A. RIVERA
Senior Product Designer
Chicago, IL | jordan.rivera@example.com | (312) 555-0142 | linkedin.com/in/jordanrivera | jordanrivera.design

PROFESSIONAL SUMMARY
Product designer with nine years of experience shipping consumer and B2B software. Known for turning
ambiguous research into shipped work across web and mobile.

WORK EXPERIENCE
Senior Product Designer\tJan 2021 – Present
Northwind Health, Chicago, IL
• Led the redesign of the patient scheduling flow, cutting drop-off by 23% across 40 clinics
  and reducing call-center volume.
• Built a design system used by 6 product teams
Product Designer\tJune 2017 – Dec 2020
Brightline Labs | Remote
Owned onboarding and billing for a payroll product used by 3,000 small businesses in the Midwest.
- Shipped self-serve billing, raising paid conversion from 4% to 7%
- Mentored 3 junior designers

Education
University of Illinois at Urbana-Champaign\t2011 – 2015
B.F.A. Graphic Design
Harold Washington College  2009 - 2011
Associate of Arts

TECHNICAL SKILLS
Design: Figma, Sketch, Prototyping, Design systems
Research: Usability testing, Surveys
HTML, CSS, basic React

Certifications
Google UX Design Certificate, Coursera, 2019
NN/g UX Certification - Nielsen Norman Group (2022)

Languages
English (native), Spanish (professional)

Interests
Letterpress, trail running, community radio
Page 1 of 1`

const sectionOf = (kind: string, text = resumeText) => {
  const section = importResumeText(text.split('\n')).document.sections.find((item) => item.kind === kind)
  assert.ok(section, `expected a ${kind} section`)
  return section
}

describe('resume text import', () => {
  it('maps the contact block into the profile', () => {
    const { document, warnings } = importResumeText(resumeText.split('\n'), { sourceLabel: 'PDF' })
    assert.deepEqual(warnings, [])
    assert.equal(document.title, 'Jordan A. Rivera — from PDF')
    assert.equal(document.targetRole, 'Senior Product Designer')
    assert.deepEqual({ ...document.profile, links: document.profile.links.map(({ label, url }) => ({ label, url })) }, {
      name: 'Jordan A. Rivera',
      headline: 'Senior Product Designer',
      email: 'jordan.rivera@example.com',
      phone: '(312) 555-0142',
      location: 'Chicago, IL',
      website: 'jordanrivera.design',
      summary: 'Product designer with nine years of experience shipping consumer and B2B software. Known for turning ambiguous research into shipped work across web and mobile.',
      links: [{ label: 'LinkedIn', url: 'linkedin.com/in/jordanrivera' }],
    })
    assert.doesNotThrow(() => validateResume(document))
  })

  it('splits experience into roles with dates, places, descriptions and rejoined bullets', () => {
    const [current, earlier, ...rest] = sectionOf('experience').entries
    assert.equal(rest.length, 0)
    assert.deepEqual([current!.title, current!.organization, current!.location, current!.startDate, current!.endDate, current!.current], ['Senior Product Designer', 'Northwind Health', 'Chicago, IL', 'Jan 2021', '', true])
    assert.deepEqual(current!.highlights, ['Led the redesign of the patient scheduling flow, cutting drop-off by 23% across 40 clinics and reducing call-center volume.', 'Built a design system used by 6 product teams'])
    assert.deepEqual([earlier!.title, earlier!.organization, earlier!.location, earlier!.startDate, earlier!.endDate, earlier!.current], ['Product Designer', 'Brightline Labs', 'Remote', 'June 2017', 'Dec 2020', false])
    assert.equal(earlier!.summary, 'Owned onboarding and billing for a payroll product used by 3,000 small businesses in the Midwest.')
    assert.deepEqual(earlier!.highlights, ['Shipped self-serve billing, raising paid conversion from 4% to 7%', 'Mentored 3 junior designers'])
  })

  it('keeps the source heading as the section title and separates back-to-back education entries', () => {
    const education = sectionOf('education')
    assert.equal(sectionOf('experience').title, 'Work Experience')
    assert.deepEqual(education.entries.map((entry) => [entry.title, entry.organization, entry.startDate, entry.endDate]), [
      ['B.F.A. Graphic Design', 'University of Illinois at Urbana-Champaign', '2011', '2015'],
      ['Associate of Arts', 'Harold Washington College', '2009', '2011'],
    ])
  })

  it('separates education entries whose date closes each block', () => {
    const education = sectionOf('education', 'Sam Lee\n\nEducation\nM.S. Data Science\nGeorgia Institute of Technology\n2019 – 2021\nB.A. Mathematics\nSpelman College\n2015 – 2019')
    assert.deepEqual(education.entries.map((entry) => [entry.title, entry.organization, entry.startDate, entry.endDate]), [
      ['M.S. Data Science', 'Georgia Institute of Technology', '2019', '2021'],
      ['B.A. Mathematics', 'Spelman College', '2015', '2019'],
    ])
  })

  it('groups skills by label and turns list sections into entries', () => {
    assert.deepEqual(sectionOf('skills').entries.map((entry) => [entry.title, entry.keywords]), [
      ['Design', ['Figma', 'Sketch', 'Prototyping', 'Design systems']],
      ['Research', ['Usability testing', 'Surveys']],
      ['Technical Skills', ['HTML', 'CSS', 'basic React']],
    ])
    assert.deepEqual(sectionOf('certifications').entries.map((entry) => [entry.title, entry.organization, entry.startDate]), [
      ['Google UX Design Certificate', 'Coursera', '2019'],
      ['NN/g UX Certification', 'Nielsen Norman Group', '2022'],
    ])
    assert.deepEqual(sectionOf('languages').entries.map((entry) => [entry.title, entry.organization]), [['English', 'native'], ['Spanish', 'professional']])
    assert.deepEqual(sectionOf('interests').entries[0]!.keywords, ['Letterpress', 'trail running', 'community radio'])
  })

  it('puts the organization first when the source lists the employer above the role', () => {
    const [role] = sectionOf('experience', 'Ana Ortiz\n\nExperience\nHarbor Identity, Inc.\tPortland, OR\nSenior Software Engineer\tAug 2015 – Feb 2020\n• Built the token service.').entries
    assert.deepEqual([role!.title, role!.organization, role!.location], ['Senior Software Engineer', 'Harbor Identity, Inc.', 'Portland, OR'])
  })

  it('recognizes headings without mistaking job titles or sentences for them', () => {
    assert.equal(resumeHeadingBucket('PROFESSIONAL EXPERIENCE'), 'experience')
    assert.equal(resumeHeadingBucket('Clinical Experience:'), 'experience')
    assert.equal(resumeHeadingBucket('E D U C A T I O N'), 'education')
    assert.equal(resumeHeadingBucket('Licenses & Certifications'), 'certifications')
    assert.equal(resumeHeadingBucket('Volunteer Experience'), 'volunteering')
    assert.equal(resumeHeadingBucket('Director of Education'), null)
    assert.equal(resumeHeadingBucket('Skills trainer'), null)
    assert.equal(resumeHeadingBucket('Led projects.'), null)
  })

  it('reads date ranges and leaves ordinary numbers alone', () => {
    assert.deepEqual(extractResumeDates('Acme Corp, Sept. 2019 - Present'), { startDate: 'Sept. 2019', endDate: '', current: true, rest: 'Acme Corp', found: true })
    assert.deepEqual(extractResumeDates('03/2018 to 11/2020'), { startDate: '03/2018', endDate: '11/2020', current: false, rest: '', found: true })
    assert.equal(extractResumeDates('Graduated (2016)').endDate, '2016')
    assert.equal(extractResumeDates('Served 2,019 customers and raised $2020').found, false)
  })

  it('keeps the body of a resume with no familiar headings instead of dropping it', () => {
    const { document, warnings } = importResumeText(['Dana Whitfield', 'dana@example.com', '', 'Line cook, The Copper Pot, 2019 – 2023', '• Ran the grill station for 180 covers a night'])
    assert.equal(document.profile.name, 'Dana Whitfield')
    assert.equal(document.profile.email, 'dana@example.com')
    assert.equal(document.sections[0]!.title, 'Imported content')
    assert.deepEqual(document.sections[0]!.entries[0]!.highlights, ['Ran the grill station for 180 covers a night'])
    assert.match(warnings.join(' '), /No familiar section headings/)
  })

  it('uses link targets the file carried outside its visible text', () => {
    const { document } = importResumeText(['Priya Natarajan', 'Seattle, WA · LinkedIn · GitHub', '', 'Experience', 'Engineer, Lumen Pay, 2020 – Present'], { links: ['mailto:priya@example.com', 'https://www.linkedin.com/in/priyan', 'https://github.com/priyan', 'https://lumenpay.example/about'] })
    assert.equal(document.profile.email, 'priya@example.com')
    assert.deepEqual(document.profile.links.map((link) => link.label), ['LinkedIn', 'GitHub'])
    assert.equal(document.profile.website, '')
  })

  it('refuses a file with no text', () => {
    assert.throws(() => importResumeText(['', '  ']), /No readable text/)
  })
})
