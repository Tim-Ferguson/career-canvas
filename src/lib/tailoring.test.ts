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
    resume.profile.summary = 'Leads programs for a regional nonprofit.'
    const result = compareResumeToTarget(resume, 'Program leadership across several programs')
    assert.ok(result.matched.some((item) => item.term.toLocaleLowerCase() === 'programs'))
    assert.equal('score' in result, false)
  })

  it('bounds unusually large pasted descriptions', () => {
    const result = compareResumeToTarget(createBlankResume(), `${'nursing '.repeat(5_000)}${'x'.repeat(MAX_TARGET_TEXT)}`)
    assert.equal(result.truncated, true)
    assert.ok(result.targetWordCount > 0)
    assert.ok(result.terms.length <= 18)
  })
})
