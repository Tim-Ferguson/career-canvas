import { useMemo, useState, type RefObject } from 'react'
import { ArrowRight, Clock3, Copy, FileCheck2, FilePlus2, HardDrive, RotateCcw, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { containsStarterSampleContent, MAX_RESUMES, type ResumeLibrary } from '../lib/resume'
import { buildLibraryInsights, sortLibraryInsights, type LibrarySort } from '../lib/libraryInsights'
import type { DeletedResumeRecovery } from '../lib/deletionRecovery'
import { buildWorkspaceFootprint, formatWorkspaceBytes } from '../lib/workspaceFootprint'

interface LibraryManagerProps {
  library: ResumeLibrary
  dialogRef: RefObject<HTMLElement | null>
  onActivate: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onBackup: () => void
  deletedRecovery: DeletedResumeRecovery | null
  recoveryPersistent: boolean
  onRestoreDeleted: () => void
  onDiscardDeleted: () => void
  onClose: () => void
}

function updatedLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Update time unavailable'
  return `Updated ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`
}

export function LibraryManager({ library, dialogRef, onActivate, onDuplicate, onDelete, onNew, onBackup, deletedRecovery, recoveryPersistent, onRestoreDeleted, onDiscardDeleted, onClose }: LibraryManagerProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LibrarySort>('updated')
  const insights = useMemo(() => buildLibraryInsights(library), [library])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const matches = normalized ? insights.filter(({ resume }) => [resume.title, resume.targetRole, resume.industry].some((value) => value.toLocaleLowerCase().includes(normalized))) : insights
    return sortLibraryInsights(matches, sort)
  }, [insights, query, sort])
  const essentialVersions = insights.filter((item) => item.essentialIssues).length
  const sampleVersions = insights.filter((item) => containsStarterSampleContent(item.resume)).length
  const staleVersions = insights.filter((item) => item.stale).length
  const footprint = useMemo(() => buildWorkspaceFootprint(library, deletedRecovery), [library, deletedRecovery])
  const footprintDetail = footprint.pressure === 'high'
    ? 'Back up now, then remove unused or unusually large versions before relying on more local edits.'
    : footprint.pressure === 'watch'
      ? 'Back up before adding more large versions. Browser storage capacity varies by device and mode.'
      : `Largest version: ${formatWorkspaceBytes(footprint.largestDocumentBytes)}. Browser storage capacity varies by device and mode.`
  return (
    <section ref={dialogRef} className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title" aria-describedby="library-description">
      <button className="dialog-close" type="button" aria-label="Close resume library" onClick={onClose}><X size={19} /></button>
      <div className="library-dialog-heading">
        <span className="eyebrow">Your device library</span>
        <h2 id="library-title">Manage resume versions</h2>
        <p id="library-description">Keep one source of truth, then duplicate it for each audience. Search, sorting, and snapshots use only resume data already stored on this device. Review scores are editorial checklists—not applicant-tracking scores.</p>
      </div>
      <div className="library-tools">
        <div className="library-tool-inputs">
          <label className="library-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search resume versions</span><input type="search" value={query} placeholder="Search title, target, or industry" onChange={(event) => setQuery(event.currentTarget.value)} /></label>
          <label className="library-sort"><span>Sort</span><select aria-label="Sort resume versions" value={sort} onChange={(event) => setSort(event.currentTarget.value as LibrarySort)}><option value="updated">Recently updated</option><option value="attention">Needs attention</option><option value="title">Resume name</option><option value="target">Target role</option></select></label>
        </div>
        <span>{query.trim() ? `${filtered.length} shown · ` : ''}{library.documents.length} of {MAX_RESUMES} versions</span>
      </div>
      <div className="library-overview" aria-label="Library maintenance snapshot">
        <span><strong>{essentialVersions}</strong> need essential fixes</span>
        <span><strong>{sampleVersions}</strong> contain sample content</span>
        <span><strong>{staleVersions}</strong> not updated in 6+ months</span>
      </div>
      <section className={`library-footprint ${footprint.pressure}`} aria-label={`Timo’s Resume Maker serialized workspace: ${formatWorkspaceBytes(footprint.totalBytes)}`}>
        <HardDrive size={18} aria-hidden="true" />
        <div><strong>{formatWorkspaceBytes(footprint.totalBytes)} serialized workspace</strong><span>{footprintDetail}</span></div>
        {footprint.pressure === 'normal' ? <span className="footprint-state">Modest</span> : <button className="secondary-button" type="button" onClick={onBackup}>Open backup tools</button>}
      </section>
      {deletedRecovery ? <section className="library-recovery" aria-label="Recently removed resume"><RotateCcw size={18} aria-hidden="true" /><div><strong>Recently removed: {deletedRecovery.document.title || 'Untitled resume'}</strong><span>{recoveryPersistent ? 'Saved as one recovery copy on this device until another version is removed.' : 'Recovery is available only while this page remains open because device storage is unavailable.'}</span></div><button className="secondary-button" type="button" onClick={onRestoreDeleted}>Restore</button><button className="text-button danger" type="button" onClick={onDiscardDeleted}>Discard permanently</button></section> : null}
      <div className="library-list" aria-live="polite">
        {filtered.length ? filtered.map(({ resume, analysis, essentialIssues, sameContent, stale }) => {
          const active = resume.id === library.activeId
          return (
            <article className={`library-resume-card ${active ? 'active' : ''}`} key={resume.id}>
              <div className="library-resume-copy">
                <div className="library-resume-badges">
                  {active ? <span className="active-badge">Active</span> : null}
                  {essentialIssues ? <span className="attention-badge">{essentialIssues} essential {essentialIssues === 1 ? 'fix' : 'fixes'}</span> : null}
                  {containsStarterSampleContent(resume) ? <span className="sample-badge">Sample content</span> : null}
                  {sameContent ? <span className="same-badge">Same content</span> : null}
                  {stale ? <span className="stale-badge">6+ months old</span> : null}
                </div>
                <h3>{resume.title || 'Untitled resume'}</h3>
                <p>{[resume.targetRole, resume.industry].filter(Boolean).join(' · ') || 'No target added yet'}</p>
                <div className="library-resume-metrics" aria-label={`Editorial review ${analysis.score} out of 100, ${analysis.issues.length} checks, approximately ${analysis.estimatedPages} pages`} title="Editorial review—not an applicant-tracking score">
                  <span><FileCheck2 size={12} /> Review {analysis.score}/100</span><span>{analysis.issues.length} {analysis.issues.length === 1 ? 'check' : 'checks'}</span><span>~{analysis.estimatedPages} {analysis.estimatedPages === 1 ? 'page' : 'pages'}</span>
                </div>
                <small><Clock3 size={12} /> {updatedLabel(resume.updatedAt)}</small>
              </div>
              <div className="library-resume-actions">
                <button type="button" className="secondary-button" disabled={active} onClick={() => onActivate(resume.id)}>{active ? 'Current version' : <>Open <ArrowRight size={14} /></>}</button>
                <button type="button" className="icon-button" aria-label={`Duplicate ${resume.title || 'untitled resume'}`} title="Duplicate" disabled={library.documents.length >= MAX_RESUMES} onClick={() => onDuplicate(resume.id)}><Copy size={15} /></button>
                <button type="button" className="icon-button danger" aria-label={`Delete ${resume.title || 'untitled resume'}`} title="Delete" disabled={library.documents.length <= 1} onClick={() => onDelete(resume.id)}><Trash2 size={15} /></button>
              </div>
            </article>
          )
        }) : <div className="library-empty"><Search size={22} /><strong>No matching resume</strong><span>Try a title, role, or industry from another version.</span></div>}
      </div>
      <footer className="library-footer">
        <button className="secondary-button" type="button" onClick={onBackup}><ShieldCheck size={15} /> Back up library</button>
        <button className="primary-button" type="button" disabled={library.documents.length >= MAX_RESUMES} onClick={onNew}><FilePlus2 size={15} /> New resume</button>
      </footer>
    </section>
  )
}
