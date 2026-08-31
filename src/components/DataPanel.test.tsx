import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDeletedResumeRecovery } from '../lib/deletionRecovery'
import { createBlankResume, createStarter } from '../lib/resume'
import { DataPanel } from './DataPanel'

describe('portable data workspace', () => {
  it('discloses that whole-library backups include the current recovery copy', () => {
    const resume = createStarter()
    const library = { activeId: resume.id, documents: [resume] }
    const recovery = createDeletedResumeRecovery(createBlankResume(), '2026-08-30T12:00:00.000Z')
    const html = renderToStaticMarkup(<DataPanel
      resume={resume}
      library={library}
      deletedRecovery={recovery}
      onChange={() => undefined}
      onImport={() => true}
      onRestoreBackup={() => { throw new Error('Not invoked while rendering.') }}
      onDraftStateChange={() => undefined}
      announce={() => undefined}
    />)
    assert.ok(html.includes('Back up library'))
    assert.ok(html.includes('Save all 1 versions + recovery'))
    assert.ok(html.includes('serialized workspace'))
    assert.ok(html.includes('Browser storage capacity varies'))
    assert.ok(html.includes('Restore backup'))
    assert.ok(html.includes('Merge without overwriting'))
  })
})
