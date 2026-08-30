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
})
