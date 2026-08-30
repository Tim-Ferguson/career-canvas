import { useEffect, useState } from 'react'
import { ArchiveRestore, Check, Clipboard, Download, FileJson, FileText, FolderDown, RefreshCw, Upload } from 'lucide-react'
import { MAX_DOCUMENT_BYTES, MAX_RESUMES, containsStarterSampleContent, parseJsonText, parseResumeJson, resumeToText, utf8ByteLength, type ResumeDocument, type ResumeLibrary } from '../lib/resume'
import { createLibraryBackup, parseLibraryBackup, summarizeLibraryMerge, type LibraryMergeSummary } from '../lib/storage'
import { buildExportPreflight, exportConfirmationMessage } from '../lib/exportReadiness'
import { ExportReadinessSummary } from './ExportReadinessSummary'

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

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatBackupDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function describeMerge(summary: LibraryMergeSummary) {
  return [
    countLabel(summary.addedDocuments, 'new resume'),
    countLabel(summary.collisionCopies, 'changed ID collision', 'changed ID collisions') + ' preserved as restored copies',
    countLabel(summary.unchangedDocuments, 'identical resume') + ' skipped',
  ].join(', ')
}

export function DataPanel({ resume, library, onChange, onImport, onRestoreLibrary, announce }: {
  resume: ResumeDocument
  library: ResumeLibrary
  onChange: (resume: ResumeDocument) => void
  onImport: (resume: ResumeDocument) => boolean
  onRestoreLibrary: (library: ResumeLibrary) => LibraryMergeSummary
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
      const sameId = library.documents.find((document) => document.id === imported.id)
      if (sameId && JSON.stringify(sameId) === JSON.stringify(imported)) {
        announce(`Import skipped: “${imported.title || 'Untitled resume'}” is already in this library unchanged.`)
        return
      }
      if (library.documents.length >= MAX_RESUMES) throw new Error(`Your device library is full at ${MAX_RESUMES} resumes. Export and remove one before importing.`)
      const details = [
        `Import “${imported.title || 'Untitled resume'}” from ${file.name}?`,
        `Target: ${imported.targetRole || 'not specified'}. Industry: ${imported.industry || 'not specified'}. ${countLabel(imported.sections.length, 'section')}.`,
        sameId ? 'Its internal ID matches an existing version, so Career Canvas will assign a new ID and “copy” title.' : '',
        containsStarterSampleContent(imported) ? 'Warning: this file still contains fictional starter content.' : '',
        'The imported file will become active; every existing version stays unchanged.',
      ].filter(Boolean).join('\n\n')
      if (!window.confirm(details)) {
        announce('Resume import canceled. Your library is unchanged.')
        return
      }
      if (!onImport({ ...imported, updatedAt: new Date().toISOString() })) return
      announce(`Imported “${imported.title || 'Untitled resume'}” from ${file.name} as the active resume. Existing versions are unchanged.`)
    } catch (caught) {
      announce(caught instanceof Error ? `Import refused: ${caught.message}` : 'Import refused.')
    }
  }

  const restoreLibrary = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_DOCUMENT_BYTES * MAX_RESUMES) throw new Error('Backup is larger than the library safety limit.')
      const backup = parseLibraryBackup(parseJsonText(await file.text()))
      const preview = summarizeLibraryMerge(library, backup.library)
      if (preview.exceedsLimit) throw new Error(`This backup needs ${preview.requiredSlots} open ${preview.requiredSlots === 1 ? 'slot' : 'slots'} and would grow the library to ${preview.resultingDocuments}, above the ${MAX_RESUMES}-resume device limit.`)
      if (!preview.requiredSlots) {
        announce(`Backup checked: all ${preview.incomingDocuments} ${preview.incomingDocuments === 1 ? 'resume is' : 'resumes are'} already present and unchanged.`)
        return
      }
      const confirmed = window.confirm([
        `Restore ${file.name}, exported ${formatBackupDate(backup.exportedAt)}?`,
        `The backup contains ${countLabel(preview.incomingDocuments, 'resume')}: ${describeMerge(preview)}.`,
        `The library will grow from ${library.documents.length} to ${preview.resultingDocuments}. Your current active resume stays active, and no existing version is overwritten.`,
      ].join('\n\n'))
      if (!confirmed) {
        announce('Library restore canceled. Your library is unchanged.')
        return
      }
      const restored = onRestoreLibrary(backup.library)
      announce(`Backup restored: ${describeMerge(restored)}. Your previous active resume is still active.`)
    } catch (caught) {
      announce(caught instanceof Error ? `Backup restore refused: ${caught.message}` : 'Backup restore refused.')
    }
  }

  const exportPreflight = buildExportPreflight(resume)
  const baseName = exportPreflight.filenameBase
  const downloadPlainText = () => {
    if (exportPreflight.needsConfirmation && !window.confirm(exportConfirmationMessage(exportPreflight, 'plain-text file'))) {
      announce('Plain-text export canceled. Review the essential sharing checks first.')
      return
    }
    downloadFile(resumeToText(resume), `${baseName}.txt`, 'text/plain')
  }
  return (
    <div className="editor-stack data-panel">
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Portable by design</span><h2>Import & export</h2></div><FileJson size={19} aria-hidden="true" /></div>
        <p className="card-intro">Your v2 JSON keeps content, layout, and ordering together. Version 1 files from the original studio migrate automatically.</p>
        <ExportReadinessSummary preflight={exportPreflight} />
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
