import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Check, ChevronDown, Copy, Eye, FileCheck2, FileText, FolderOpen, LayoutTemplate, MoreHorizontal, Plus, Printer, Redo2, RotateCcw, ShieldCheck, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import { ContentEditor } from './ContentEditor'
import { DataPanel } from './DataPanel'
import { DesignPanel } from './DesignPanel'
import { ResumePreview } from './ResumePreview'
import { ReviewPanel } from './ReviewPanel'
import { LibraryManager } from './LibraryManager'
import { MAX_RESUMES, STARTERS, cloneResume, containsStarterSampleContent, createBlankResume, createId, createStarter, renderedPageCount, touchResume, type ResumeDocument, type ResumeIssue, type ResumeLibrary, type StarterId } from '../lib/resume'
import { createDefaultLibrary, loadLibraryFromProvider, mergeLibraries, removeDocument, saveLibrary, summarizeLibraryMerge, upsertDocument, type LibraryMergeSummary } from '../lib/storage'
import { createResumeHistory, recordResumeChange, redoResumeChange, undoResumeChange, type ResumeHistory } from '../lib/history'
import { reviewDestination } from '../lib/reviewNavigation'
import { commitLatest } from '../lib/latestState'
import { buildExportPreflight, exportConfirmationMessage } from '../lib/exportReadiness'
import { createDeletedResumeRecovery, loadDeletedResumeRecovery, recoveryAlreadyPresent, restoreDeletedResume, saveDeletedResumeRecovery, type DeletedResumeRecovery } from '../lib/deletionRecovery'
import { buildPreviewPageGuides, MAX_PREVIEW_PAGE_GUIDES } from '../lib/pageGuides'

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
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const [showNew, setShowNew] = useState(false)
  const [showLibraryManager, setShowLibraryManager] = useState(false)
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const [status, setStatus] = useState('Your resume stays on this device.')
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'limited'>('saved')
  const [zoom, setZoom] = useState(0.82)
  const [renderedPages, setRenderedPages] = useState(1)
  const [advancedDraftDirty, setAdvancedDraftDirty] = useState(false)
  const [deletedRecovery, setDeletedRecovery] = useState<DeletedResumeRecovery | null>(null)
  const [recoveryPersistent, setRecoveryPersistent] = useState(false)
  const [, setHistoryRevision] = useState(0)
  const newResumeButtonRef = useRef<HTMLButtonElement>(null)
  const newResumeDialogRef = useRef<HTMLElement>(null)
  const libraryDialogRef = useRef<HTMLElement>(null)
  const libraryMenuButtonRef = useRef<HTMLButtonElement>(null)
  const libraryMenuRef = useRef<HTMLDivElement>(null)
  const historiesRef = useRef(new Map<string, ResumeHistory>())
  const storageLimitedRef = useRef(false)
  const libraryRef = useRef(library)
  libraryRef.current = library
  const activeResume = useMemo(() => library.documents.find((document) => document.id === library.activeId) ?? library.documents[0]!, [library])
  const updateLibrary = (update: (current: ResumeLibrary) => ResumeLibrary) => commitLatest(libraryRef, setLibrary, update)

  useEffect(() => {
    const loaded = loadLibraryFromProvider(() => window.localStorage)
    libraryRef.current = loaded.library
    setLibrary(loaded.library)
    const recovery = loadDeletedResumeRecovery(window.localStorage)
    if (recovery && !recoveryAlreadyPresent(loaded.library, recovery)) {
      setDeletedRecovery(recovery)
      setRecoveryPersistent(true)
    } else if (recovery) {
      try { saveDeletedResumeRecovery(window.localStorage, null) } catch { /* A redundant recovery record is harmless and will be ignored again. */ }
    }
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

  useEffect(() => {
    if (!advancedDraftDirty) return
    const protectAdvancedDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', protectAdvancedDraft)
    return () => window.removeEventListener('beforeunload', protectAdvancedDraft)
  }, [advancedDraftDirty])

  const retrySave = () => {
    setSaveState('saving')
    try {
      saveLibrary(window.localStorage, libraryRef.current)
      if (deletedRecovery) {
        saveDeletedResumeRecovery(window.localStorage, deletedRecovery)
        setRecoveryPersistent(true)
      }
      storageLimitedRef.current = false
      setSaveState('saved')
      setRecoveryNotice('')
      setStatus(deletedRecovery ? 'Library and deleted-resume recovery saved to this device successfully.' : 'Saved to this device successfully.')
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
    if (!showLibraryManager) return
    const dialog = libraryDialogRef.current
    const previous = libraryMenuButtonRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [])
    focusable()[0]?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowLibraryManager(false)
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
  }, [showLibraryManager])

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
    const currentResume = libraryRef.current.documents.find((item) => item.id === document.id)
    if (!currentResume) return
    const history = historiesRef.current.get(document.id) ?? createResumeHistory()
    const nextHistory = recordResumeChange(history, currentResume, document)
    historiesRef.current.set(document.id, nextHistory)
    if (nextHistory !== history) setHistoryRevision((value) => value + 1)
    updateLibrary((current) => upsertDocument(current, touchResume(document)))
  }

  const undo = () => {
    const current = libraryRef.current
    const currentResume = current.documents.find((item) => item.id === current.activeId) ?? current.documents[0]!
    const history = historiesRef.current.get(currentResume.id) ?? createResumeHistory()
    const result = undoResumeChange(history, currentResume)
    if (!result.document) {
      setStatus('Nothing to undo for this resume.')
      return
    }
    historiesRef.current.set(currentResume.id, result.history)
    updateLibrary((latest) => upsertDocument(latest, touchResume(result.document!)))
    setHistoryRevision((value) => value + 1)
    setStatus('Undid the most recent studio change.')
  }

  const redo = () => {
    const current = libraryRef.current
    const currentResume = current.documents.find((item) => item.id === current.activeId) ?? current.documents[0]!
    const history = historiesRef.current.get(currentResume.id) ?? createResumeHistory()
    const result = redoResumeChange(history, currentResume)
    if (!result.document) {
      setStatus('Nothing to redo for this resume.')
      return
    }
    historiesRef.current.set(currentResume.id, result.history)
    updateLibrary((latest) => upsertDocument(latest, touchResume(result.document!)))
    setHistoryRevision((value) => value + 1)
    setStatus('Redid the most recent studio change.')
  }

  const confirmDiscardAdvancedDraft = () => {
    if (!advancedDraftDirty) return true
    const confirmed = window.confirm('You have unapplied advanced JSON changes. Switching resumes or leaving the studio will discard that session-only draft. Continue?')
    if (!confirmed) {
      setStatus('Action canceled. Your advanced JSON draft is still open in Data.')
      setActiveTab('data')
    }
    return confirmed
  }

  const addResume = (document: ResumeDocument): boolean => {
    if (libraryRef.current.documents.length >= MAX_RESUMES) {
      setStatus(`Your device library is full at ${MAX_RESUMES} resumes. Export and remove one before adding another.`)
      return false
    }
    if (!confirmDiscardAdvancedDraft()) return false
    updateLibrary((current) => {
      const ids = new Set(current.documents.map((item) => item.id))
      const unique = ids.has(document.id) ? { ...document, id: createId('resume'), title: `${document.title || 'Imported resume'} copy` } : document
      return upsertDocument(current, unique)
    })
    setActiveTab('content')
    setShowNew(false)
    return true
  }

  const createNew = (starter: StarterId | 'blank') => {
    if (!addResume(starter === 'blank' ? createBlankResume() : createStarter(starter))) {
      setShowNew(false)
      return
    }
    setStatus('New resume added. Your other versions are unchanged.')
  }

  const duplicateResume = (resumeId: string): boolean => {
    const current = libraryRef.current
    const source = current.documents.find((item) => item.id === resumeId)
    if (!source) return false
    const copy = cloneResume(source)
    if (!addResume({ ...copy, id: createId('resume'), title: `${copy.title || 'Resume'} copy`, updatedAt: new Date().toISOString() })) return false
    setStatus('Resume duplicated. Tailor this version without changing the original.')
    return true
  }

  const duplicateActive = () => {
    if (!duplicateResume(libraryRef.current.activeId)) return
    setShowLibraryMenu(false)
    window.requestAnimationFrame(() => libraryMenuButtonRef.current?.focus())
  }

  const deleteResume = (resumeId: string): boolean => {
    const current = libraryRef.current
    const currentResume = current.documents.find((item) => item.id === resumeId)
    if (!currentResume) return false
    if (current.documents.length <= 1) {
      setStatus('Keep at least one resume in your library.')
      return false
    }
    const recoveryReplacement = deletedRecovery ? ` This permanently replaces the existing recovery copy of “${deletedRecovery.document.title || 'Untitled resume'}”.` : ''
    if (!window.confirm(`Remove “${currentResume.title || 'Untitled resume'}” from the library? Career Canvas will keep one recovery copy on this device until another resume is removed.${recoveryReplacement}`)) return false
    if (current.activeId === resumeId && !confirmDiscardAdvancedDraft()) return false
    const nextLibrary = removeDocument(current, currentResume.id)
    const recovery = createDeletedResumeRecovery(currentResume)
    let librarySaved = false
    let recoverySaved = false
    try {
      saveLibrary(window.localStorage, nextLibrary)
      librarySaved = true
      saveDeletedResumeRecovery(window.localStorage, recovery)
      recoverySaved = true
    } catch {
      // React state still preserves an in-session undo even when browser storage is unavailable or full.
    }
    updateLibrary(() => nextLibrary)
    setDeletedRecovery(recovery)
    setRecoveryPersistent(recoverySaved)
    if (!librarySaved) {
      storageLimitedRef.current = true
      setSaveState('limited')
    }
    historiesRef.current.delete(currentResume.id)
    setHistoryRevision((value) => value + 1)
    setStatus(recoverySaved ? 'Resume removed. A recovery copy is saved on this device.' : 'Resume removed. Undo is available only while this page remains open.')
    return true
  }

  const restoreDeleted = () => {
    if (!deletedRecovery || !confirmDiscardAdvancedDraft()) return
    try {
      const result = restoreDeletedResume(libraryRef.current, deletedRecovery)
      updateLibrary(() => result.library)
      historiesRef.current.delete(result.library.activeId)
      setHistoryRevision((value) => value + 1)
      try {
        saveLibrary(window.localStorage, result.library)
        saveDeletedResumeRecovery(window.localStorage, null)
      } catch {
        storageLimitedRef.current = true
        setSaveState('limited')
      }
      setDeletedRecovery(null)
      setRecoveryPersistent(false)
      setShowLibraryManager(false)
      setStatus(result.alreadyPresent ? 'That resume was already present and is active again.' : result.restoredAsCopy ? 'Deleted resume restored as a copy because its original ID is now in use.' : 'Deleted resume restored and opened.')
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'The deleted resume could not be restored.')
    }
  }

  const discardDeleted = () => {
    if (!deletedRecovery || !window.confirm(`Permanently discard the recovery copy of “${deletedRecovery.document.title || 'Untitled resume'}”? This cannot be undone.`)) return
    try { saveDeletedResumeRecovery(window.localStorage, null) } catch { /* Clear in-memory state even when device storage is unavailable. */ }
    setDeletedRecovery(null)
    setRecoveryPersistent(false)
    setStatus('Deleted resume recovery was permanently discarded.')
  }

  const deleteActive = () => {
    if (!deleteResume(libraryRef.current.activeId)) return
    setShowLibraryMenu(false)
    window.requestAnimationFrame(() => libraryMenuButtonRef.current?.focus())
  }

  const activateResume = (resumeId: string) => {
    if (!libraryRef.current.documents.some((item) => item.id === resumeId)) return
    if (libraryRef.current.activeId === resumeId) {
      setShowLibraryManager(false)
      return
    }
    if (!confirmDiscardAdvancedDraft()) return
    updateLibrary((current) => ({ ...current, activeId: resumeId }))
    setShowLibraryManager(false)
    setStatus('Resume version opened.')
  }

  const restoreLibrary = (incoming: ResumeLibrary): LibraryMergeSummary => {
    try {
      const current = libraryRef.current
      const summary = summarizeLibraryMerge(current, incoming)
      if (summary.exceedsLimit) {
        throw new Error(`Restoring this backup needs ${summary.requiredSlots} open ${summary.requiredSlots === 1 ? 'slot' : 'slots'} and would exceed the ${MAX_RESUMES}-resume device limit.`)
      }
      if (!summary.requiredSlots) return summary
      const merged = mergeLibraries(current, incoming)
      updateLibrary(() => merged)
      historiesRef.current.clear()
      setHistoryRevision((value) => value + 1)
      return summary
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'The library backup could not be restored.')
      throw caught
    }
  }

  const editReviewIssue = (issue?: ResumeIssue) => {
    setMobileView('editor')
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

  const showWorkspace = (view: 'editor' | 'preview', targetId: string) => {
    setMobileView(view)
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      target?.focus({ preventScroll: true })
    })
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
  const previewPageGuides = buildPreviewPageGuides(activeResume.settings.pageSize, renderedPages, zoom)
  const printResume = () => {
    if (advancedDraftDirty && !window.confirm('The PDF will use the last valid resume; unapplied advanced JSON changes are not included. Open the print dialog anyway?')) {
      setStatus('PDF export canceled. Apply or discard the advanced JSON draft first.')
      setMobileView('editor')
      setActiveTab('data')
      return
    }
    const preflight = buildExportPreflight(activeResume, renderedPages)
    if (preflight.needsConfirmation && !window.confirm(exportConfirmationMessage(preflight, 'PDF'))) {
      setStatus('PDF export canceled. Resolve the sharing checks or verify that the exception is intentional.')
      setMobileView('editor')
      setActiveTab(preflight.essentialIssues.length ? 'review' : 'design')
      return
    }
    setStatus(`Opening the print dialog for ${activeResume.settings.pageSize === 'a4' ? 'A4' : 'US Letter'}. Suggested filename: ${preflight.filenameBase}.pdf. Turn off browser headers and footers.`)
    const previousTitle = document.title
    document.title = preflight.filenameBase
    try {
      window.print()
    } finally {
      document.title = previousTitle
    }
  }
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#studio-editor-content" onClick={(event) => { event.preventDefault(); showWorkspace('editor', 'studio-editor-content') }}>Skip to resume editor</a>
      <a className="skip-link" href="#resume-preview" onClick={(event) => { event.preventDefault(); showWorkspace('preview', 'resume-preview') }}>Skip to live preview</a>
      <header className="app-header no-print">
        <Link className="app-brand" to="/" aria-label="Career Canvas home">
          <span className="brand-mark">C<span>/</span></span>
          <span><strong>Career Canvas</strong><small>Resume studio</small></span>
        </Link>
        <div className="resume-switcher">
          <label htmlFor="resume-select">Resume</label>
          <div className="select-wrap">
            <select id="resume-select" value={activeResume.id} onChange={(event) => activateResume(event.currentTarget.value)}>
              {library.documents.map((document) => <option value={document.id} key={document.id}>{document.title || 'Untitled resume'}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <button ref={newResumeButtonRef} className="header-icon-button" type="button" aria-label="Create a new resume" title="New resume" onClick={() => setShowNew(true)}><Plus size={18} /></button>
          <div className="library-menu-wrap" ref={libraryMenuRef}>
            <button ref={libraryMenuButtonRef} className="header-icon-button" type="button" aria-label="Resume actions" aria-haspopup="menu" aria-controls="library-menu" aria-expanded={showLibraryMenu} onClick={() => setShowLibraryMenu((value) => !value)}><MoreHorizontal size={19} /></button>
            {showLibraryMenu ? <div className="library-menu" id="library-menu" role="menu" aria-label="Resume actions"><button type="button" role="menuitem" onClick={() => { setShowLibraryMenu(false); setShowLibraryManager(true) }}><FolderOpen size={15} /> Manage all versions</button><button type="button" role="menuitem" onClick={duplicateActive}><Copy size={15} /> Duplicate version</button><button type="button" role="menuitem" className="danger" onClick={deleteActive}><Trash2 size={15} /> Delete from device</button></div> : null}
          </div>
        </div>
        <div className="header-right">
          <div className={`save-indicator ${saveState}`}><Check size={13} /><span>{saveLabel}</span></div>
          <Link className="guide-link" to="/guide" onClick={(event) => { if (!confirmDiscardAdvancedDraft()) event.preventDefault() }}>Resume guide</Link>
          <button className="print-button" type="button" onClick={printResume}><Printer size={16} /> Save PDF</button>
        </div>
      </header>

      <main className="studio-workspace" data-mobile-view={mobileView}>
        <div className="mobile-view-switcher no-print" role="group" aria-label="Mobile workspace view"><button type="button" className={mobileView === 'editor' ? 'active' : ''} aria-pressed={mobileView === 'editor'} aria-controls="studio-editor" onClick={() => showWorkspace('editor', 'studio-editor-content')}><FileText size={15} /> Editor</button><button type="button" className={mobileView === 'preview' ? 'active' : ''} aria-pressed={mobileView === 'preview'} aria-controls="resume-preview" onClick={() => showWorkspace('preview', 'resume-preview')}><Eye size={15} /> Preview</button></div>
        <aside className="studio-editor no-print" id="studio-editor" aria-label="Resume editor">
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
            {deletedRecovery ? <div className="deletion-recovery-alert" role="status"><RotateCcw size={18} /><div><strong>Recently removed: {deletedRecovery.document.title || 'Untitled resume'}</strong><span>{recoveryPersistent ? 'A recovery copy is saved on this device until another resume is removed.' : 'Recovery is available only while this page remains open.'}</span></div><button type="button" onClick={restoreDeleted}>Restore</button><button type="button" aria-label="Permanently discard deleted resume recovery" onClick={discardDeleted}><X size={15} /></button></div> : null}
            {sampleContentPresent ? <div className="sample-content-alert" role="alert"><AlertTriangle size={18} /><div><strong>Fictional starter content is still present</strong><span>Replace every sample identity, organization, and result with your own accurate evidence before exporting.</span></div><button type="button" onClick={() => setActiveTab('review')}>Review it</button></div> : null}
            <div id="studio-panel-content" role="tabpanel" aria-labelledby="studio-tab-content" tabIndex={0} hidden={activeTab !== 'content'}><ContentEditor resume={activeResume} onChange={changeResume} /></div>
            <div id="studio-panel-design" role="tabpanel" aria-labelledby="studio-tab-design" tabIndex={0} hidden={activeTab !== 'design'}><DesignPanel resume={activeResume} renderedPages={renderedPages} onChange={changeResume} onPrint={printResume} onEditContent={() => { setMobileView('editor'); setActiveTab('content'); setStatus('Content workspace opened. Prioritize the evidence that earns space on the page.') }} /></div>
            <div id="studio-panel-review" role="tabpanel" aria-labelledby="studio-tab-review" tabIndex={0} hidden={activeTab !== 'review'}><ReviewPanel resume={activeResume} onEdit={editReviewIssue} /></div>
            <div id="studio-panel-data" role="tabpanel" aria-labelledby="studio-tab-data" tabIndex={0} hidden={activeTab !== 'data'}><DataPanel resume={activeResume} library={library} onChange={changeResume} onImport={addResume} onRestoreLibrary={restoreLibrary} onDraftStateChange={setAdvancedDraftDirty} announce={setStatus} /></div>
          </div>
          <div className="editor-status" role="status" aria-live="polite"><ShieldCheck size={14} /><span>{status}</span></div>
        </aside>

        <section className="preview-workspace" id="resume-preview" tabIndex={-1} aria-label="Live resume preview">
          <div className="preview-toolbar no-print">
            <div><span className="preview-live-dot" /> Live preview <small>{activeResume.settings.pageSize === 'a4' ? 'A4' : 'US Letter'} · {activeResume.settings.layout} · <span className={renderedPages > 1 ? 'page-warning' : ''}>{renderedPages} {renderedPages === 1 ? 'page' : 'pages'}</span></small></div>
            <div className="zoom-control" aria-label="Preview zoom"><button type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.08))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.15, value + 0.08))} aria-label="Zoom in">+</button></div>
          </div>
          <div className="preview-scroll">
            <div className="preview-scale" style={{ '--preview-zoom': zoom, '--paper-width': activeResume.settings.pageSize === 'a4' ? '210mm' : '8.5in', '--paper-height': activeResume.settings.pageSize === 'a4' ? '297mm' : '11in' } as React.CSSProperties}>
              <ResumePreview resume={activeResume} />
              {previewPageGuides.length ? (
                <div className="page-break-guides no-print" aria-hidden="true">
                  {previewPageGuides.map((guide) => <span className="page-break-guide" style={{ top: `${guide.offsetPixels}px` }} data-label={`PDF page ${guide.pageNumber} starts`} key={guide.pageNumber} />)}
                  {renderedPages > MAX_PREVIEW_PAGE_GUIDES + 1 ? <small>Showing the first {MAX_PREVIEW_PAGE_GUIDES} of {renderedPages - 1} page boundaries</small> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {showLibraryManager ? (
        <div className="modal-backdrop no-print" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLibraryManager(false) }}>
          <LibraryManager
            library={library}
            dialogRef={libraryDialogRef}
            onActivate={activateResume}
            onDuplicate={duplicateResume}
            onDelete={deleteResume}
            onNew={() => { setShowLibraryManager(false); setShowNew(true) }}
            onBackup={() => { setShowLibraryManager(false); setActiveTab('data'); setStatus('Data workspace opened. Choose Back up library to download every version.') }}
            deletedRecovery={deletedRecovery}
            recoveryPersistent={recoveryPersistent}
            onRestoreDeleted={restoreDeleted}
            onDiscardDeleted={discardDeleted}
            onClose={() => setShowLibraryManager(false)}
          />
        </div>
      ) : null}

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
