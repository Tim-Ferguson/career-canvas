import { useEffect, useState } from 'react'
import { ArchiveRestore, Check, Clipboard, Download, FileJson, FileText, FolderDown, RefreshCw, Upload } from 'lucide-react'
import { MAX_DOCUMENT_BYTES, MAX_RESUMES, containsStarterSampleContent, parseJsonText, parseResumeJson, resumeToText, safeFilename, utf8ByteLength, type ResumeDocument, type ResumeLibrary } from '../lib/resume'
import { createLibraryBackup, parseLibraryBackup } from '../lib/storage'

function downloadFile(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function DataPanel({ resume, library, onChange, onImport, onRestoreLibrary, announce }: {
  resume: ResumeDocument
  library: ResumeLibrary
  onChange: (resume: ResumeDocument) => void
  onImport: (resume: ResumeDocument) => void
  onRestoreLibrary: (library: ResumeLibrary) => void
  announce: (message: string) => void
}) {
  const [draft, setDraft] = useState(() => `${JSON.stringify(resume, null, 2)}\n`)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(`${JSON.stringify(resume, null, 2)}\n`)
    setDirty(false)
    setError('')
  }, [resume.id])

  useEffect(() => {
    if (!dirty) setDraft(`${JSON.stringify(resume, null, 2)}\n`)
  }, [resume, dirty])

  const applyJson = () => {
    try {
      const parsed = parseResumeJson(draft)
      onChange({ ...parsed, id: resume.id, updatedAt: new Date().toISOString() })
      setDirty(false)
      setError('')
      announce('Advanced JSON changes applied.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The JSON could not be applied.')
      announce('JSON needs attention before it can be applied.')
    }
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(`${JSON.stringify(resume, null, 2)}\n`)
      announce('Resume JSON copied to the clipboard.')
    } catch {
      announce('Clipboard access was unavailable. Use the JSON editor to copy manually.')
    }
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File is larger than the 2 MB safety limit.')
      const imported = parseResumeJson(await file.text())
      onImport({ ...imported, id: imported.id === resume.id ? `${imported.id}-copy` : imported.id, updatedAt: new Date().toISOString() })
      announce(`Imported ${file.name} as a new resume.`)
    } catch (caught) {
      announce(caught instanceof Error ? `Import refused: ${caught.message}` : 'Import refused.')
    }
  }

  const restoreLibrary = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_DOCUMENT_BYTES * MAX_RESUMES) throw new Error('Backup is larger than the library safety limit.')
      const backup = parseLibraryBackup(parseJsonText(await file.text()))
      onRestoreLibrary(backup.library)
      announce(`Restored ${backup.library.documents.length} ${backup.library.documents.length === 1 ? 'resume' : 'resumes'} without overwriting newer versions.`)
    } catch (caught) {
      announce(caught instanceof Error ? `Backup restore refused: ${caught.message}` : 'Backup restore refused.')
    }
  }

  const baseName = safeFilename(resume.title || resume.profile.name)
  const downloadPlainText = () => {
    if (containsStarterSampleContent(resume) && !window.confirm('This plain-text resume still contains fictional starter content. Download it anyway?')) {
      announce('Plain-text export canceled. Replace the fictional starter content first.')
      return
    }
    downloadFile(resumeToText(resume), `${baseName}.txt`, 'text/plain')
  }
  return (
    <div className="editor-stack data-panel">
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Portable by design</span><h2>Import & export</h2></div><FileJson size={19} aria-hidden="true" /></div>
        <p className="card-intro">Your v2 JSON keeps content, layout, and ordering together. Version 1 files from the original studio migrate automatically.</p>
        <div className="export-grid">
          <button type="button" className="export-action" onClick={() => downloadFile(`${JSON.stringify(resume, null, 2)}\n`, `${baseName}.json`, 'application/json')}><Download size={18} /><span><strong>Download JSON</strong><small>Portable editable source</small></span></button>
          <button type="button" className="export-action" onClick={copyJson}><Clipboard size={18} /><span><strong>Copy JSON</strong><small>Paste into another tool</small></span></button>
          <button type="button" className="export-action" onClick={downloadPlainText}><FileText size={18} /><span><strong>Plain text</strong><small>Quick ATS sanity check</small></span></button>
          <label className="export-action file-action"><Upload size={18} /><span><strong>Import resume</strong><small>Add JSON as a new version</small></span><input type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label>
          <button type="button" className="export-action" onClick={() => downloadFile(`${JSON.stringify(createLibraryBackup(library), null, 2)}\n`, `career-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}><FolderDown size={18} /><span><strong>Back up library</strong><small>Save all {library.documents.length} versions</small></span></button>
          <label className="export-action file-action"><ArchiveRestore size={18} /><span><strong>Restore backup</strong><small>Merge without overwriting</small></span><input type="file" accept="application/json,.json" onChange={(event) => { void restoreLibrary(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label>
        </div>
      </section>

      <section className="editor-card json-card">
        <div className="card-heading"><div><span className="eyebrow">Advanced</span><h2>Edit JSON directly</h2></div><span className={`draft-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unapplied changes' : <><Check size={13} /> In sync</>}</span></div>
        <p className="card-intro">The visual editor is safer for everyday updates. Invalid JSON here never replaces the last valid resume.</p>
        <label className="json-editor-label" htmlFor="advanced-json">Resume document · strict schema v2</label>
        <textarea id="advanced-json" className="json-editor" spellCheck={false} value={draft} aria-invalid={Boolean(error)} aria-describedby="json-message" onChange={(event) => { setDraft(event.currentTarget.value); setDirty(true); setError('') }} />
        <div id="json-message" className={error ? 'json-message error-message' : 'json-message'}>{error || `${utf8ByteLength(draft).toLocaleString()} of ${MAX_DOCUMENT_BYTES.toLocaleString()} bytes`}</div>
        <div className="json-actions">
          <button className="secondary-button" type="button" disabled={!dirty} onClick={() => { setDraft(`${JSON.stringify(resume, null, 2)}\n`); setDirty(false); setError('') }}><RefreshCw size={15} /> Discard draft</button>
          <button className="primary-button" type="button" disabled={!dirty} onClick={applyJson}>Apply JSON</button>
        </div>
      </section>
    </div>
  )
}
