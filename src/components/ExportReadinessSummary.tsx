import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ExportPreflight } from '../lib/exportReadiness'

export function ExportReadinessSummary({ preflight }: { preflight: ExportPreflight }) {
  const needsReview = preflight.essentialIssues.length > 0 || preflight.pagePressure
  const facts = [
    `Editorial review ${preflight.analysis.score}/100`,
    `${preflight.analysis.issues.length} ${preflight.analysis.issues.length === 1 ? 'check' : 'checks'}`,
    preflight.essentialIssues.length ? `${preflight.essentialIssues.length} essential` : 'no essential items',
    preflight.renderedPages !== null ? `${preflight.renderedPages} rendered ${preflight.renderedPages === 1 ? 'page' : 'pages'}` : '',
  ].filter(Boolean)
  return (
    <div className={`export-readiness-summary ${needsReview ? 'warning' : 'ready'}`}>
      {needsReview ? <AlertTriangle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
      <div><strong>{needsReview ? 'Review before sharing' : 'No essential checklist items'}</strong><span>{facts.join(' · ')}. This is an editorial check, not an applicant-tracking score.</span></div>
    </div>
  )
}
