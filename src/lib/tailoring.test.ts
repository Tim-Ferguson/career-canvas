import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { MAX_TARGET_TEXT, compareResumeToTarget } from './tailoring'

describe('honest opportunity comparison', () => {
  it('finds repeated cross-industry terms and compares only visible resume language', () => {
    const resume = createBlankResume()
    resume.profile.headline = 'Registered nurse'
    resume.profile.summary = 'Patient-centered clinician providing acute patient care and discharge coordination.'
    const result = compareResumeToTarget(resume, 'Registered nurse. Patient care is essential. Coordinate patient care and HIPAA compliance. HIPAA practices protect trust.')
    assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === 'patient care'))
    assert.ok(result.missing.some((item) => item.term.toLocaleLowerCase() === 'hipaa'))
  })

  it('does not treat hidden content or workspace metadata as resume evidence', () => {
    const resume = createStarter()
    resume.targetRole = 'Forensic Accountant'
    resume.sections[0]!.visible = false
    resume.sections[0]!.entries[0]!.highlights = ['Performed forensic accounting investigations.']
    const result = compareResumeToTarget(resume, 'Forensic accounting forensic accounting investigations investigations')
    assert.ok(result.missing.some((item) => item.term.toLocaleLowerCase().includes('forensic')))
  })

  it('normalizes simple plurals without claiming an ATS score', () => {
    const resume = createBlankResume()
    resume.profile.summary = 'Leads programs and improves one process for a regional nonprofit.'
    const result = compareResumeToTarget(resume, 'Program leadership across several programs and repeatable processes processes')
    assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === 'programs'))
    assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === 'processes'))
    assert.equal('score' in result, false)
  })

  it('keeps short uppercase acronyms and matches hyphenated or slash-separated phrases', () => {
    const resume = createBlankResume()
    resume.profile.summary = 'RN leader using AI for quality assurance, IT operations, supply chain planning, and CI CD delivery practices.'
    const result = compareResumeToTarget(resume, 'RN license. AI fluency and AI governance. IT operations; It is preferred. IT governance. Supply-chain planning and supply-chain resilience. CI/CD delivery and CI/CD automation.')
    for (const term of ['rn', 'ai', 'it', 'supply chain', 'ci cd']) {
      assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === term), `${term} should match`)
    }
    assert.equal(result.terms.find((item) => item.term.toLocaleLowerCase() === 'it')?.term, 'IT')
  })

  it('does not repeat both words when a repeated phrase already represents them', () => {
    const resume = createBlankResume()
    const result = compareResumeToTarget(resume, 'Patient care improves outcomes. Patient care requires judgment.')
    assert.ok(result.terms.some((item) => item.term.toLocaleLowerCase() === 'patient care'))
    assert.equal(result.terms.some((item) => item.term.toLocaleLowerCase() === 'patient'), false)
    assert.equal(result.terms.some((item) => item.term.toLocaleLowerCase() === 'care'), false)
  })

  it('normalizes decomposed accents and retains combining marks in non-Latin scripts', () => {
    const resume = createBlankResume()
    resume.profile.summary = 'Gestión de proyectos y परियोजना प्रबंधन.'
    const result = compareResumeToTarget(resume, 'GESTIO\u0301N gestión. परियोजना प्रबंधन; परियोजना प्रबंधन.')
    assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === 'gestión'))
    assert.ok(result.matched.some((item) => item.term === 'परियोजना प्रबंधन'))
  })

  it('bounds unusually large pasted descriptions', () => {
    const result = compareResumeToTarget(createBlankResume(), `${'nursing '.repeat(5_000)}${'x'.repeat(MAX_TARGET_TEXT)}`)
    assert.equal(result.truncated, true)
    assert.ok(result.targetWordCount > 0)
    assert.ok(result.terms.length <= 18)
  })
})
