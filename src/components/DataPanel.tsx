import { useEffect, useState } from 'react'
import { Check, Clipboard, Download, FileJson, FileText, RefreshCw, Upload } from 'lucide-react'
import { MAX_DOCUMENT_BYTES, migrateResume, resumeToText, safeFilename, utf8ByteLength, type ResumeDocument } from '../lib/resume'

function downloadFile(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function DataPanel({ resume, onChange, onImport, announce }: {
  resume: ResumeDocument
  onChange: (resume: ResumeDocument) => void
  onImport: (resume: ResumeDocument) => void
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
      if (utf8ByteLength(draft) > MAX_DOCUMENT_BYTES) throw new Error('Resume JSON is larger than the 2 MB safety limit.')
      const parsed = migrateResume(JSON.parse(draft) as unknown)
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
      const imported = migrateResume(JSON.parse(await file.text()) as unknown)
      onImport({ ...imported, id: imported.id === resume.id ? `${imported.id}-copy` : imported.id, updatedAt: new Date().toISOString() })
      announce(`Imported ${file.name} as a new resume.`)
    } catch (caught) {
      announce(caught instanceof Error ? `Import refused: ${caught.message}` : 'Import refused.')
    }
  }

  const baseName = safeFilename(resume.title || resume.profile.name)
  return (
    <div className="editor-stack data-panel">
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Portable by design</span><h2>Import & export</h2></div><FileJson size={19} aria-hidden="true" /></div>
        <p className="card-intro">Your v2 JSON keeps content, layout, and ordering together. Version 1 files from the original studio migrate automatically.</p>
        <div className="export-grid">
          <button type="button" className="export-action" onClick={() => downloadFile(`${JSON.stringify(resume, null, 2)}\n`, `${baseName}.json`, 'application/json')}><Download size={18} /><span><strong>Download JSON</strong><small>Portable editable source</small></span></button>
          <button type="button" className="export-action" onClick={copyJson}><Clipboard size={18} /><span><strong>Copy JSON</strong><small>Paste into another tool</small></span></button>
          <button type="button" className="export-action" onClick={() => downloadFile(resumeToText(resume), `${baseName}.txt`, 'text/plain')}><FileText size={18} /><span><strong>Plain text</strong><small>Quick ATS sanity check</small></span></button>
          <label className="export-action file-action"><Upload size={18} /><span><strong>Import resume</strong><small>Add JSON as a new version</small></span><input type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label>
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
