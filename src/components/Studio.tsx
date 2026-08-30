import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Check, ChevronDown, Copy, FileCheck2, FileText, LayoutTemplate, MoreHorizontal, Plus, Printer, Redo2, ShieldCheck, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import { ContentEditor } from './ContentEditor'
import { DataPanel } from './DataPanel'
import { DesignPanel } from './DesignPanel'
import { ResumePreview } from './ResumePreview'
import { ReviewPanel } from './ReviewPanel'
import { MAX_RESUMES, STARTERS, cloneResume, containsStarterSampleContent, createBlankResume, createId, createStarter, renderedPageCount, touchResume, type ResumeDocument, type ResumeIssue, type ResumeLibrary, type StarterId } from '../lib/resume'
import { createDefaultLibrary, loadLibraryFromProvider, mergeLibraries, removeDocument, saveLibrary, upsertDocument } from '../lib/storage'
import { createResumeHistory, recordResumeChange, redoResumeChange, undoResumeChange, type ResumeHistory } from '../lib/history'
import { reviewDestination } from '../lib/reviewNavigation'

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

function isNativeEditingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
}

export function Studio() {
  const [library, setLibrary] = useState<ResumeLibrary>(() => createDefaultLibrary())
  const [hydrated, setHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<StudioTab>('content')
  const [showNew, setShowNew] = useState(false)
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const [status, setStatus] = useState('Your resume stays on this device.')
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'limited'>('saved')
  const [zoom, setZoom] = useState(0.82)
  const [renderedPages, setRenderedPages] = useState(1)
  const [, setHistoryRevision] = useState(0)
  const newResumeButtonRef = useRef<HTMLButtonElement>(null)
  const newResumeDialogRef = useRef<HTMLElement>(null)
  const libraryMenuButtonRef = useRef<HTMLButtonElement>(null)
  const libraryMenuRef = useRef<HTMLDivElement>(null)
  const historiesRef = useRef(new Map<string, ResumeHistory>())
  const storageLimitedRef = useRef(false)
  const libraryRef = useRef(library)
  libraryRef.current = library
  const activeResume = useMemo(() => library.documents.find((document) => document.id === library.activeId) ?? library.documents[0]!, [library])

  useEffect(() => {
    const loaded = loadLibraryFromProvider(() => window.localStorage)
    setLibrary(loaded.library)
    if (loaded.status === 'recovered') {
      const details = [loaded.discardedDocuments ? `${loaded.discardedDocuments} damaged ${loaded.discardedDocuments === 1 ? 'resume was' : 'resumes were'} skipped` : '', loaded.repairedDocuments ? `${loaded.repairedDocuments} duplicate ${loaded.repairedDocuments === 1 ? 'ID was' : 'IDs were'} repaired` : '', loaded.activeIdRecovered ? 'the active resume was reset' : ''].filter(Boolean).join('; ')
      setRecoveryNotice(`Your saved library needed repair: ${details}. The healthy resumes are ready; make a fresh library backup when convenient.`)
    } else if (loaded.status === 'reset') {
      setRecoveryNotice('The saved library was unreadable, so Career Canvas opened a safe starter. Restore a library backup from Data if you have one.')
    } else if (loaded.status === 'unavailable') {
      storageLimitedRef.current = true
      setSaveState('limited')
      setStatus('This browser is blocking device storage. Download JSON or a library backup before closing.')
    }
    historiesRef.current.clear()
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (storageLimitedRef.current) {
      setSaveState('limited')
      return
    }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        saveLibrary(window.localStorage, library)
        setSaveState('saved')
      } catch {
        storageLimitedRef.current = true
        setSaveState('limited')
        setStatus('This browser could not save locally. Download JSON before closing.')
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [hydrated, library])

  useEffect(() => {
    if (!hydrated) return
    const flushLatestLibrary = () => {
      try {
        saveLibrary(window.localStorage, libraryRef.current)
      } catch {
        // The persistent warning is set by normal autosave; lifecycle handlers cannot safely recover a blocked store.
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushLatestLibrary()
    }
    window.addEventListener('pagehide', flushLatestLibrary)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushLatestLibrary)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hydrated])

  const retrySave = () => {
    setSaveState('saving')
    try {
      saveLibrary(window.localStorage, libraryRef.current)
      storageLimitedRef.current = false
      setSaveState('saved')
      setRecoveryNotice('')
      setStatus('Saved to this device successfully.')
    } catch {
      storageLimitedRef.current = true
      setSaveState('limited')
      setStatus('Device storage is still unavailable. Download JSON before closing.')
    }
  }

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
    if (!showLibraryMenu) return
    const menu = libraryMenuRef.current
    const buttons = () => Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    buttons()[0]?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu?.contains(event.target) && event.target !== libraryMenuButtonRef.current) setShowLibraryMenu(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const items = buttons()
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowLibraryMenu(false)
        libraryMenuButtonRef.current?.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const current = items.indexOf(document.activeElement as HTMLButtonElement)
        const offset = event.key === 'ArrowDown' ? 1 : -1
        items[(current + offset + items.length) % items.length]?.focus()
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showLibraryMenu])

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
    const history = historiesRef.current.get(document.id) ?? createResumeHistory()
    const nextHistory = recordResumeChange(history, activeResume, document)
    historiesRef.current.set(document.id, nextHistory)
    if (nextHistory !== history) setHistoryRevision((value) => value + 1)
    setLibrary((current) => upsertDocument(current, touchResume(document)))
  }

  const undo = () => {
    const history = historiesRef.current.get(activeResume.id) ?? createResumeHistory()
    const result = undoResumeChange(history, activeResume)
    if (!result.document) {
      setStatus('Nothing to undo for this resume.')
      return
    }
    historiesRef.current.set(activeResume.id, result.history)
    setLibrary((current) => upsertDocument(current, touchResume(result.document!)))
    setHistoryRevision((value) => value + 1)
    setStatus('Undid the most recent studio change.')
  }

  const redo = () => {
    const history = historiesRef.current.get(activeResume.id) ?? createResumeHistory()
    const result = redoResumeChange(history, activeResume)
    if (!result.document) {
      setStatus('Nothing to redo for this resume.')
      return
    }
    historiesRef.current.set(activeResume.id, result.history)
    setLibrary((current) => upsertDocument(current, touchResume(result.document!)))
    setHistoryRevision((value) => value + 1)
    setStatus('Redid the most recent studio change.')
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
    window.requestAnimationFrame(() => libraryMenuButtonRef.current?.focus())
    setStatus('Resume duplicated. Tailor this version without changing the original.')
  }

  const deleteActive = () => {
    if (library.documents.length <= 1) {
      setStatus('Keep at least one resume in your library.')
      return
    }
    if (!window.confirm(`Delete “${activeResume.title || 'Untitled resume'}” from this device? Download it first if you may need it later.`)) return
    setLibrary((current) => removeDocument(current, activeResume.id))
    historiesRef.current.delete(activeResume.id)
    setHistoryRevision((value) => value + 1)
    setShowLibraryMenu(false)
    window.requestAnimationFrame(() => libraryMenuButtonRef.current?.focus())
    setStatus('Resume removed from this device.')
  }

  const restoreLibrary = (incoming: ResumeLibrary) => {
    try {
      setLibrary(mergeLibraries(library, incoming))
      historiesRef.current.clear()
      setHistoryRevision((value) => value + 1)
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'The library backup could not be restored.')
      throw caught
    }
  }

  const editReviewIssue = (issue?: ResumeIssue) => {
    setActiveTab('content')
    const destination = issue ? reviewDestination(issue, activeResume) : { id: 'content-sections', label: 'Resume evidence' }
    setStatus(`Opening ${destination.label.toLocaleLowerCase()} in the editor.`)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const element = document.getElementById(destination.id)
      if (!element) {
        setStatus('The Content workspace is open. Choose the most relevant evidence to edit.')
        return
      }
      const details = element instanceof HTMLDetailsElement ? element : element.closest('details')
      if (details) details.open = true
      const focusTarget = element.matches('input, textarea, select, button, summary') ? element : element.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), summary')
      element.scrollIntoView({ block: 'center', behavior: 'smooth' })
      focusTarget?.focus({ preventScroll: true })
      setStatus(`${destination.label}. The relevant editor control is now focused.`)
    }))
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const items = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
    const current = items.indexOf(event.currentTarget)
    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % items.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    const id = items[next]?.dataset.tabId as StudioTab | undefined
    if (id) setActiveTab(id)
    items[next]?.focus()
  }

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || isNativeEditingTarget(event.target)) return
      if (event.key.toLocaleLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (event.ctrlKey && event.key.toLocaleLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', handleHistoryShortcut)
    return () => document.removeEventListener('keydown', handleHistoryShortcut)
  })

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'limited' ? 'Not saved' : formatSavedTime(activeResume.updatedAt)
  const activeHistory = historiesRef.current.get(activeResume.id) ?? createResumeHistory()
  const sampleContentPresent = containsStarterSampleContent(activeResume)
  const printResume = () => {
    if (sampleContentPresent && !window.confirm('This resume still contains fictional starter content. Replace every sample identity and claim before sending it. Open the print dialog anyway?')) {
      setStatus('Print canceled. Replace the fictional starter content in the Review workspace first.')
      setActiveTab('review')
      return
    }
    setStatus(`Opening the print dialog for ${activeResume.settings.pageSize === 'a4' ? 'A4' : 'US Letter'}. Turn off browser headers and footers before saving.`)
    window.print()
  }
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#studio-editor-content">Skip to resume editor</a>
      <a className="skip-link" href="#resume-preview">Skip to live preview</a>
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
          <div className="library-menu-wrap" ref={libraryMenuRef}>
            <button ref={libraryMenuButtonRef} className="header-icon-button" type="button" aria-label="Resume actions" aria-haspopup="menu" aria-controls="library-menu" aria-expanded={showLibraryMenu} onClick={() => setShowLibraryMenu((value) => !value)}><MoreHorizontal size={19} /></button>
            {showLibraryMenu ? <div className="library-menu" id="library-menu" role="menu" aria-label="Resume actions"><button type="button" role="menuitem" onClick={duplicateActive}><Copy size={15} /> Duplicate version</button><button type="button" role="menuitem" className="danger" onClick={deleteActive}><Trash2 size={15} /> Delete from device</button></div> : null}
          </div>
        </div>
        <div className="header-right">
          <div className={`save-indicator ${saveState}`}><Check size={13} /><span>{saveLabel}</span></div>
          <Link className="guide-link" to="/guide">Resume guide</Link>
          <button className="print-button" type="button" onClick={printResume}><Printer size={16} /> Save PDF</button>
        </div>
      </header>

      <main className="studio-workspace">
        <aside className="studio-editor no-print" aria-label="Resume editor">
          <nav className="studio-tabs" role="tablist" aria-label="Resume workspaces">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return <button key={tab.id} id={`studio-tab-${tab.id}`} data-tab-id={tab.id} role="tab" type="button" className={activeTab === tab.id ? 'active' : ''} aria-selected={activeTab === tab.id} aria-controls={`studio-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => setActiveTab(tab.id)}><Icon size={16} /><span>{tab.label}</span></button>
            })}
          </nav>
          <div className="editor-scroll" id="studio-editor-content" tabIndex={-1}>
            <div className="editor-intro">
              <div><span className="eyebrow">{activeTab === 'content' ? 'Build the story' : activeTab === 'design' ? 'Shape the page' : activeTab === 'review' ? 'Make it stronger' : 'Own your data'}</span>
              <h1>{activeTab === 'content' ? 'Edit your resume' : activeTab === 'design' ? 'Choose your presentation' : activeTab === 'review' ? 'Review before you send' : 'Portable resume data'}</h1></div>
              <div className="history-controls" aria-label="Revision history">
                <button type="button" onClick={undo} disabled={!activeHistory.past.length} aria-label="Undo recent studio change" title="Undo recent studio change"><Undo2 size={16} /></button>
                <button type="button" onClick={redo} disabled={!activeHistory.future.length} aria-label="Redo recent studio change" title="Redo recent studio change"><Redo2 size={16} /></button>
              </div>
            </div>
            {saveState === 'limited' ? <div className="storage-alert" role="alert"><AlertTriangle size={18} /><div><strong>Changes are not saved on this device</strong><span>Keep editing, then download JSON or a library backup before closing this page.</span></div><div><button type="button" onClick={retrySave}>Retry save</button><button type="button" onClick={() => setActiveTab('data')}>Open Data</button></div></div> : null}
            {recoveryNotice && saveState !== 'limited' ? <div className="recovery-alert" role="status"><ShieldCheck size={18} /><span>{recoveryNotice}</span><button type="button" aria-label="Dismiss recovery notice" onClick={() => setRecoveryNotice('')}><X size={15} /></button></div> : null}
            {sampleContentPresent ? <div className="sample-content-alert" role="alert"><AlertTriangle size={18} /><div><strong>Fictional starter content is still present</strong><span>Replace every sample identity, organization, and result with your own accurate evidence before exporting.</span></div><button type="button" onClick={() => setActiveTab('review')}>Review it</button></div> : null}
            <div id="studio-panel-content" role="tabpanel" aria-labelledby="studio-tab-content" tabIndex={0} hidden={activeTab !== 'content'}><ContentEditor resume={activeResume} onChange={changeResume} /></div>
            <div id="studio-panel-design" role="tabpanel" aria-labelledby="studio-tab-design" tabIndex={0} hidden={activeTab !== 'design'}><DesignPanel resume={activeResume} renderedPages={renderedPages} onChange={changeResume} onPrint={printResume} /></div>
            <div id="studio-panel-review" role="tabpanel" aria-labelledby="studio-tab-review" tabIndex={0} hidden={activeTab !== 'review'}><ReviewPanel resume={activeResume} onEdit={editReviewIssue} /></div>
            <div id="studio-panel-data" role="tabpanel" aria-labelledby="studio-tab-data" tabIndex={0} hidden={activeTab !== 'data'}><DataPanel resume={activeResume} library={library} onChange={changeResume} onImport={addResume} onRestoreLibrary={restoreLibrary} announce={setStatus} /></div>
          </div>
          <div className="editor-status" role="status" aria-live="polite"><ShieldCheck size={14} /><span>{status}</span></div>
        </aside>

        <section className="preview-workspace" id="resume-preview" tabIndex={-1} aria-label="Live resume preview">
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
