import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDeletedResumeRecovery, DELETION_RECOVERY_STORAGE_KEY } from './deletionRecovery'
import { createBlankResume, createStarter, utf8ByteLength } from './resume'
import { LIBRARY_STORAGE_KEY } from './storage'
import { WORKSPACE_HIGH_BYTES, WORKSPACE_WATCH_BYTES, buildWorkspaceFootprint, classifyWorkspacePressure, formatWorkspaceBytes } from './workspaceFootprint'

describe('serialized workspace footprint', () => {
  it('counts UTF-8 library and recovery keys and values exactly', () => {
    const resume = { ...createStarter(), title: 'Café 🚀' }
    const library = { activeId: resume.id, documents: [resume] }
    const recovery = createDeletedResumeRecovery({ ...createBlankResume(), title: '研究 copy' })
    const footprint = buildWorkspaceFootprint(library, recovery)
    const expectedLibrary = utf8ByteLength(LIBRARY_STORAGE_KEY) + utf8ByteLength(JSON.stringify(library))
    const expectedRecovery = utf8ByteLength(DELETION_RECOVERY_STORAGE_KEY) + utf8ByteLength(JSON.stringify(recovery))
    assert.equal(footprint.libraryBytes, expectedLibrary)
    assert.equal(footprint.recoveryBytes, expectedRecovery)
    assert.equal(footprint.totalBytes, expectedLibrary + expectedRecovery)
    assert.equal(footprint.recoveryIncluded, true)
  })

  it('does not count a recovery value that persistence removes as already present', () => {
    const recovered = createBlankResume()
    const library = { activeId: recovered.id, documents: [recovered] }
    const footprint = buildWorkspaceFootprint(library, createDeletedResumeRecovery(recovered))
    assert.equal(footprint.recoveryIncluded, false)
    assert.equal(footprint.recoveryBytes, 0)
  })

  it('uses conservative bands without presenting them as browser quota', () => {
    assert.equal(classifyWorkspacePressure(WORKSPACE_WATCH_BYTES - 1), 'normal')
    assert.equal(classifyWorkspacePressure(WORKSPACE_WATCH_BYTES), 'watch')
    assert.equal(classifyWorkspacePressure(WORKSPACE_HIGH_BYTES), 'high')
    assert.equal(classifyWorkspacePressure(Number.NaN), 'normal')
    assert.equal(formatWorkspaceBytes(0), '0 B')
    assert.equal(formatWorkspaceBytes(1536), '1.5 KB')
    assert.equal(formatWorkspaceBytes(2.5 * 1024 * 1024), '2.5 MB')
  })
})
