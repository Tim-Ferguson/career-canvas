import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlankResume, createStarter } from './resume'
import { buildExportPreflight, exportConfirmationMessage, exportFilenameBase } from './exportReadiness'

describe('sharing export preflight', () => {
  it('finds essential draft issues and creates a useful fallback filename', () => {
    const resume = createBlankResume()
    resume.profile.name = 'Taylor Kim'
    resume.targetRole = 'Research Coordinator'
    const preflight = buildExportPreflight(resume)
    assert.equal(preflight.needsConfirmation, true)
    assert.ok(preflight.essentialIssues.some((issue) => issue.id === 'contact'))
    assert.equal(preflight.filenameBase, 'taylor-kim-research-coordinator-resume')
  })

  it('keeps an intentional library title as the portable export filename', () => {
    const resume = createBlankResume()
    resume.title = 'Clinical Operations — Mayo 2026'
    assert.equal(exportFilenameBase(resume), 'clinical-operations-mayo-2026')
  })

  it('discloses fictional evidence and actual three-page pressure without banning specialized CVs', () => {
    const preflight = buildExportPreflight(createStarter('academic'), 2.2)
    const message = exportConfirmationMessage(preflight, 'PDF')
    assert.equal(preflight.renderedPages, 3)
    assert.equal(preflight.pagePressure, true)
    assert.equal(preflight.sampleContent, true)
    assert.match(message, /Fictional starter/)
    assert.match(message, /spans 3 pages/)
    assert.match(message, /academic or specialized CVs/)
  })
})
