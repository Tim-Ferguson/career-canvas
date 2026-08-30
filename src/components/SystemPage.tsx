import type { ErrorComponentProps } from '@tanstack/react-router'
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react'

export function NotFoundPage() {
  return (
    <main className="system-page">
      <span className="system-mark"><span>C/</span></span>
      <span className="eyebrow">404 · Page not found</span>
      <h1>That page is not on this canvas.</h1>
      <p>The link may be outdated, but your device-local resume library has not been changed.</p>
      <a className="primary-button" href="/"><ArrowLeft size={16} /> Return to the studio</a>
    </main>
  )
}

export function RootErrorPage({ reset }: ErrorComponentProps) {
  return (
    <main className="system-page" role="alert">
      <span className="system-mark"><ShieldCheck size={24} /></span>
      <span className="eyebrow">Recoverable interruption</span>
      <h1>Career Canvas hit a snag.</h1>
      <p>No error details or resume content are shown here. Your saved library should remain on this device, and a retry is safe.</p>
      <div className="system-actions">
        <button className="primary-button" type="button" onClick={reset}><RefreshCw size={16} /> Try again</button>
        <a className="secondary-button" href="/">Reload the studio</a>
      </div>
    </main>
  )
}
