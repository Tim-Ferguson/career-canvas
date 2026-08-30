import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeResume, createBlankResume, createStarter, type ResumeDocument, type ResumeIssue } from './resume'
import { reviewDestination } from './reviewNavigation'

function issue(resume: ResumeDocument, id: string): ResumeIssue {
  const found = analyzeResume(resume).issues.find((item) => item.id === id)
  assert.ok(found, `Expected issue ${id}`)
  return found
}

describe('review-to-editor navigation', () => {
  it('maps profile and target findings to exact controls', () => {
    const resume = createBlankResume()
    assert.equal(reviewDestination(issue(resume, 'name'), resume).id, 'profile-name')
    assert.equal(reviewDestination(issue(resume, 'contact'), resume).id, 'profile-email')
    assert.equal(reviewDestination(issue(resume, 'target'), resume).id, 'resume-target-role')
    assert.equal(reviewDestination(issue(resume, 'summary-short'), resume).id, 'profile-summary')
  })

  it('finds the exact repeated bullet and incomplete link', () => {
    const resume = createStarter()
    const entry = resume.sections[0]!.entries[0]!
    entry.highlights = ['Led a useful program.', 'Led a useful program.']
    entry.url = 'not a website'
    assert.equal(reviewDestination(issue(resume, 'duplicate-bullets'), resume).id, `entry-highlight-${entry.id}-1`)
    assert.equal(reviewDestination(issue(resume, 'links'), resume).id, `entry-url-${entry.id}`)
  })

  it('opens the add-section control when substantive evidence is absent', () => {
    const resume = createBlankResume()
    resume.sections = resume.sections.filter((section) => section.kind === 'skills')
    assert.equal(reviewDestination(issue(resume, 'evidence'), resume).id, 'add-section-control')
  })

  it('focuses the exact incomplete or contradictory date field', () => {
    const resume = createStarter()
    const nextYear = new Date().getUTCFullYear() + 1
    const entries = resume.sections.find((section) => section.kind === 'experience')!.entries
    entries[0] = { ...entries[0]!, startDate: String(nextYear), current: true }
    entries[1] = { ...entries[1]!, startDate: 'May 2025', endDate: '2024', current: false }
    entries.push({ ...entries[1]!, id: 'experience-undated', startDate: '', endDate: '' })

    assert.equal(reviewDestination(issue(resume, 'experience-dates'), resume).id, 'entry-start-experience-undated')
    assert.equal(reviewDestination(issue(resume, 'reversed-date-range'), resume).id, `entry-end-${entries[1]!.id}`)
    assert.equal(reviewDestination(issue(resume, 'future-current-entry'), resume).id, `entry-start-${entries[0]!.id}`)
  })
})
