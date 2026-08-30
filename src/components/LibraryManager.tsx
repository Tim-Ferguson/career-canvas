import { useMemo, useState, type RefObject } from 'react'
import { ArrowRight, Clock3, Copy, FilePlus2, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { containsStarterSampleContent, MAX_RESUMES, type ResumeLibrary } from '../lib/resume'

interface LibraryManagerProps {
  library: ResumeLibrary
  dialogRef: RefObject<HTMLElement | null>
  onActivate: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onBackup: () => void
  onClose: () => void
}

function updatedLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Update time unavailable'
  return `Updated ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`
}

export function LibraryManager({ library, dialogRef, onActivate, onDuplicate, onDelete, onNew, onBackup, onClose }: LibraryManagerProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return library.documents
    return library.documents.filter((resume) => [resume.title, resume.targetRole, resume.industry].some((value) => value.toLocaleLowerCase().includes(normalized)))
  }, [library.documents, query])
  return (
    <section ref={dialogRef} className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title" aria-describedby="library-description">
      <button className="dialog-close" type="button" aria-label="Close resume library" onClick={onClose}><X size={19} /></button>
      <div className="library-dialog-heading">
        <span className="eyebrow">Your device library</span>
        <h2 id="library-title">Manage resume versions</h2>
        <p id="library-description">Keep one source of truth, then duplicate it for each audience. Search uses only the titles, targets, and fields already stored on this device.</p>
      </div>
      <div className="library-tools">
        <label><Search size={16} aria-hidden="true" /><span className="sr-only">Search resume versions</span><input type="search" value={query} placeholder="Search title, target, or industry" onChange={(event) => setQuery(event.currentTarget.value)} /></label>
        <span>{library.documents.length} of {MAX_RESUMES} versions</span>
      </div>
      <div className="library-list" aria-live="polite">
        {filtered.length ? filtered.map((resume) => {
          const active = resume.id === library.activeId
          return (
            <article className={`library-resume-card ${active ? 'active' : ''}`} key={resume.id}>
              <div className="library-resume-copy">
                <div className="library-resume-badges">{active ? <span className="active-badge">Active</span> : null}{containsStarterSampleContent(resume) ? <span className="sample-badge">Sample content</span> : null}</div>
                <h3>{resume.title || 'Untitled resume'}</h3>
                <p>{[resume.targetRole, resume.industry].filter(Boolean).join(' · ') || 'No target added yet'}</p>
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
