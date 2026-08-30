import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, Copy, FileCheck2, FileText, LayoutTemplate, MoreHorizontal, Plus, Printer, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { ContentEditor } from './ContentEditor'
import { DataPanel } from './DataPanel'
import { DesignPanel } from './DesignPanel'
import { ResumePreview } from './ResumePreview'
import { ReviewPanel } from './ReviewPanel'
import { MAX_RESUMES, STARTERS, cloneResume, createBlankResume, createId, createStarter, renderedPageCount, touchResume, type ResumeDocument, type ResumeLibrary, type StarterId } from '../lib/resume'
import { createDefaultLibrary, loadLibrary, mergeLibraries, removeDocument, saveLibrary, upsertDocument } from '../lib/storage'

type StudioTab = 'content' | 'design' | 'review' | 'data'

const tabs: Array<{ id: StudioTab; label: string; icon: typeof FileText }> = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'design', label: 'Design', icon: LayoutTemplate },
  { id: 'review', label: 'Review', icon: FileCheck2 },
  { id: 'data', label: 'Data', icon: ShieldCheck },
]

function formatSavedTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved locally'
  return `Saved ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)}`
}

export function Studio() {
  const [library, setLibrary] = useState<ResumeLibrary>(() => createDefaultLibrary())
  const [hydrated, setHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<StudioTab>('content')
  const [showNew, setShowNew] = useState(false)
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const [status, setStatus] = useState('Your resume stays on this device.')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'limited'>('saved')
  const [zoom, setZoom] = useState(0.82)
  const [renderedPages, setRenderedPages] = useState(1)
  const newResumeButtonRef = useRef<HTMLButtonElement>(null)
  const newResumeDialogRef = useRef<HTMLElement>(null)
  const activeResume = useMemo(() => library.documents.find((document) => document.id === library.activeId) ?? library.documents[0]!, [library])

  useEffect(() => {
    setLibrary(loadLibrary(window.localStorage))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        saveLibrary(window.localStorage, library)
        setSaveState('saved')
      } catch {
        setSaveState('limited')
        setStatus('This browser could not save locally. Download JSON before closing.')
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [hydrated, library])

  useEffect(() => {
    if (!showNew) return
    const dialog = newResumeDialogRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : newResumeButtonRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [])
    focusable()[0]?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowNew(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]!
      const last = items.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [showNew])

  useEffect(() => {
    const documentElement = document.querySelector<HTMLElement>('#resume-document')
    if (!documentElement) return
    const measure = () => {
      setRenderedPages(renderedPageCount(documentElement.scrollHeight, activeResume.settings.pageSize))
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(documentElement)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeResume.id, activeResume.settings.pageSize])

  const changeResume = (document: ResumeDocument) => {
    setLibrary((current) => upsertDocument(current, touchResume(document)))
  }

  const addResume = (document: ResumeDocument) => {
    if (library.documents.length >= MAX_RESUMES) {
      setStatus(`Your device library is full at ${MAX_RESUMES} resumes. Export and remove one before adding another.`)
      return
    }
    setLibrary((current) => {
      const ids = new Set(current.documents.map((item) => item.id))
      const unique = ids.has(document.id) ? { ...document, id: createId('resume'), title: `${document.title || 'Imported resume'} copy` } : document
      return upsertDocument(current, unique)
    })
    setActiveTab('content')
    setShowNew(false)
  }

  const createNew = (starter: StarterId | 'blank') => {
    if (library.documents.length >= MAX_RESUMES) {
      setStatus(`Your device library is full at ${MAX_RESUMES} resumes. Export and remove one before adding another.`)
      setShowNew(false)
      return
    }
    addResume(starter === 'blank' ? createBlankResume() : createStarter(starter))
    setStatus('New resume added. Your other versions are unchanged.')
  }

  const duplicateActive = () => {
    const copy = cloneResume(activeResume)
    addResume({ ...copy, id: createId('resume'), title: `${copy.title || 'Resume'} copy`, updatedAt: new Date().toISOString() })
    setShowLibraryMenu(false)
    setStatus('Resume duplicated. Tailor this version without changing the original.')
  }

  const deleteActive = () => {
    if (library.documents.length <= 1) {
      setStatus('Keep at least one resume in your library.')
      return
    }
    if (!window.confirm(`Delete “${activeResume.title || 'Untitled resume'}” from this device? Download it first if you may need it later.`)) return
    setLibrary((current) => removeDocument(current, activeResume.id))
    setShowLibraryMenu(false)
    setStatus('Resume removed from this device.')
  }

  const restoreLibrary = (incoming: ResumeLibrary) => {
    try {
      setLibrary(mergeLibraries(library, incoming))
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'The library backup could not be restored.')
      throw caught
    }
  }

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'limited' ? 'Not saved' : formatSavedTime(activeResume.updatedAt)
  return (
    <div className="studio-shell">
      <header className="app-header no-print">
        <Link className="app-brand" to="/" aria-label="Career Canvas home">
          <span className="brand-mark">C<span>/</span></span>
          <span><strong>Career Canvas</strong><small>Resume studio</small></span>
        </Link>
        <div className="resume-switcher">
          <label htmlFor="resume-select">Resume</label>
          <div className="select-wrap">
            <select id="resume-select" value={activeResume.id} onChange={(event) => setLibrary((current) => ({ ...current, activeId: event.currentTarget.value }))}>
              {library.documents.map((document) => <option value={document.id} key={document.id}>{document.title || 'Untitled resume'}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <button ref={newResumeButtonRef} className="header-icon-button" type="button" aria-label="Create a new resume" title="New resume" onClick={() => setShowNew(true)}><Plus size={18} /></button>
          <div className="library-menu-wrap">
            <button className="header-icon-button" type="button" aria-label="Resume actions" aria-expanded={showLibraryMenu} onClick={() => setShowLibraryMenu((value) => !value)}><MoreHorizontal size={19} /></button>
            {showLibraryMenu ? <div className="library-menu"><button type="button" onClick={duplicateActive}><Copy size={15} /> Duplicate version</button><button type="button" className="danger" onClick={deleteActive}><Trash2 size={15} /> Delete from device</button></div> : null}
          </div>
        </div>
        <div className="header-right">
          <div className={`save-indicator ${saveState}`}><Check size={13} /><span>{saveLabel}</span></div>
          <Link className="guide-link" to="/guide">Resume guide</Link>
          <button className="print-button" type="button" onClick={() => window.print()}><Printer size={16} /> Save PDF</button>
        </div>
      </header>

      <main className="studio-workspace">
        <aside className="studio-editor no-print" aria-label="Resume editor">
          <nav className="studio-tabs" aria-label="Editor sections">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}><Icon size={16} /><span>{tab.label}</span></button>
            })}
          </nav>
          <div className="editor-scroll">
            <div className="editor-intro">
              <span className="eyebrow">{activeTab === 'content' ? 'Build the story' : activeTab === 'design' ? 'Shape the page' : activeTab === 'review' ? 'Make it stronger' : 'Own your data'}</span>
              <h1>{activeTab === 'content' ? 'Edit your resume' : activeTab === 'design' ? 'Choose your presentation' : activeTab === 'review' ? 'Review before you send' : 'Portable resume data'}</h1>
            </div>
            <div hidden={activeTab !== 'content'}><ContentEditor resume={activeResume} onChange={changeResume} /></div>
            <div hidden={activeTab !== 'design'}><DesignPanel resume={activeResume} onChange={changeResume} /></div>
            <div hidden={activeTab !== 'review'}><ReviewPanel resume={activeResume} onEdit={() => setActiveTab('content')} /></div>
            <div hidden={activeTab !== 'data'}><DataPanel resume={activeResume} library={library} onChange={changeResume} onImport={addResume} onRestoreLibrary={restoreLibrary} announce={setStatus} /></div>
          </div>
          <div className="editor-status" role="status" aria-live="polite"><ShieldCheck size={14} /><span>{status}</span></div>
        </aside>

        <section className="preview-workspace" aria-label="Live resume preview">
          <div className="preview-toolbar no-print">
            <div><span className="preview-live-dot" /> Live preview <small>{activeResume.settings.pageSize === 'a4' ? 'A4' : 'US Letter'} · {activeResume.settings.layout} · <span className={renderedPages > 1 ? 'page-warning' : ''}>{renderedPages} {renderedPages === 1 ? 'page' : 'pages'}</span></small></div>
            <div className="zoom-control" aria-label="Preview zoom"><button type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.08))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.15, value + 0.08))} aria-label="Zoom in">+</button></div>
          </div>
          <div className="preview-scroll">
            <div className="preview-scale" style={{ '--preview-zoom': zoom, '--paper-width': activeResume.settings.pageSize === 'a4' ? '210mm' : '8.5in', '--paper-height': activeResume.settings.pageSize === 'a4' ? '297mm' : '11in' } as React.CSSProperties}><ResumePreview resume={activeResume} /></div>
          </div>
        </section>
      </main>

      {showNew ? (
        <div className="modal-backdrop no-print" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false) }}>
          <section ref={newResumeDialogRef} className="new-resume-dialog" role="dialog" aria-modal="true" aria-labelledby="new-resume-title" aria-describedby="new-resume-description">
            <button className="dialog-close" type="button" aria-label="Close" onClick={() => setShowNew(false)}><X size={19} /></button>
            <div className="dialog-heading"><span className="dialog-icon"><Sparkles size={20} /></span><span className="eyebrow">A strong starting order</span><h2 id="new-resume-title">What kind of story are you telling?</h2><p id="new-resume-description">These are editorial starting points, not rigid industry boxes. Everything remains editable.</p><p className="sample-warning">Sample names, organizations, and results are fictional. Replace every claim with your own accurate experience.</p></div>
            <div className="starter-grid">
              {STARTERS.map((starter) => <button type="button" key={starter.id} onClick={() => createNew(starter.id)}><span>{starter.eyebrow}</span><strong>{starter.label}</strong><small>{starter.description}</small></button>)}
              <button type="button" onClick={() => createNew('blank')}><span>Clean slate</span><strong>Blank resume</strong><small>Keep only the essentials and build your own section order.</small></button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
