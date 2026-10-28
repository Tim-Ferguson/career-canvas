import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Lightbulb, SearchCheck, Target, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { analyzeResume, sectionHasRenderableContent, type ResumeDocument, type ResumeIssue } from '../lib/resume'
import { MAX_TARGET_TEXT, compareResumeToTarget } from '../lib/tailoring'
import type { TargetTerm } from '../lib/tailoring'

function IssueIcon({ severity }: Pick<ResumeIssue, 'severity'>) {
  if (severity === 'essential') return <AlertCircle size={17} />
  if (severity === 'improvement') return <Target size={17} />
  return <Lightbulb size={17} />
}

function TargetTermChip({ item, matched }: { item: TargetTerm; matched: boolean }) {
  const occurrenceLabel = `${item.occurrences} ${item.occurrences === 1 ? 'mention' : 'mentions'} in the target`
  return <span className={`term ${matched ? 'term-match' : 'term-missing'}`} aria-label={`${item.term}, ${occurrenceLabel}`} title={occurrenceLabel}><span>{item.term}</span>{item.occurrences > 1 ? <small aria-hidden="true">{item.occurrences}×</small> : null}</span>
}

export function ReviewPanel({ resume, onEdit }: { resume: ResumeDocument; onEdit: (issue?: ResumeIssue) => void }) {
  const [targetTexts, setTargetTexts] = useState<Record<string, string>>({})
  const targetText = targetTexts[resume.id] ?? ''
  const analysis = analyzeResume(resume)
  const comparison = useMemo(() => compareResumeToTarget(resume, targetText), [resume, targetText])
  const scoreLabel = analysis.score >= 90 ? 'Strong and focused' : analysis.score >= 75 ? 'Solid foundation' : analysis.score >= 55 ? 'Needs a focused pass' : 'Important details missing'
  return (
    <div className="editor-stack review-panel">
      <section className="score-card">
        <div className="score-ring" style={{ '--score': `${analysis.score * 3.6}deg` } as React.CSSProperties}><span>{analysis.score}</span><small>/ 100</small></div>
        <div><span className="eyebrow">Readiness review</span><h2>{scoreLabel}</h2><p>This is an editorial checklist, not an applicant-tracking score. It looks for clarity, evidence, focus, and scanability.</p></div>
      </section>
      <div className="stat-grid" aria-label="Resume statistics">
        <div><strong>{analysis.words}</strong><span>words</span></div>
        <div><strong>{analysis.bullets}</strong><span>evidence bullets</span></div>
        <div><strong>~{analysis.estimatedPages}</strong><span>estimated pages</span></div>
        <div><strong>{resume.sections.filter((item) => item.visible && sectionHasRenderableContent(item)).length}</strong><span>rendered sections</span></div>
      </div>
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Priority pass</span><h2>What to improve</h2></div><span className="issue-count">{analysis.issues.length}</span></div>
        {analysis.issues.length ? (
          <div className="issue-list">
            {analysis.issues.map((issue) => (
              <button type="button" className={`issue issue-${issue.severity}`} key={issue.id} onClick={() => onEdit(issue)}>
                <IssueIcon severity={issue.severity} />
                <span><strong>{issue.title}</strong><small>{issue.detail}</small></span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : <div className="review-success"><CheckCircle2 size={24} /><div><strong>No structural issues found</strong><p>Do one final proofread against the job description before exporting.</p></div></div>}
      </section>
      <section className="editor-card targeting-card">
        <div className="card-heading"><div><span className="eyebrow">Opportunity comparison</span><h2>Use the reader’s vocabulary</h2></div><SearchCheck size={19} aria-hidden="true" /></div>
        <p className="targeting-intro">Paste a job description, project brief, program call, or role posting. Timo’s Resume Maker compares its recurring and distinctive language with the words visible on this resume—it does not predict screening results.</p>
        <label className="targeting-field" htmlFor="target-description">
          <span>Target description</span>
          <textarea id="target-description" rows={7} maxLength={MAX_TARGET_TEXT} value={targetText} placeholder="Paste the opportunity text here…" aria-describedby="target-privacy" onChange={(event) => setTargetTexts((current) => ({ ...current, [resume.id]: event.currentTarget.value }))} />
        </label>
        <div className="targeting-meta" id="target-privacy">
          <span>Kept only in this page session—not saved, exported, backed up, or printed.</span>
          {targetText ? <button type="button" onClick={() => setTargetTexts((current) => { const next = { ...current }; delete next[resume.id]; return next })}><X size={13} /> Clear</button> : null}
        </div>
        {comparison.terms.length ? (
          <div className="targeting-results" aria-live="polite">
            <div className="targeting-summary"><strong>{comparison.matched.length} of {comparison.terms.length}</strong><span>prominent terms already appear in the visible resume</span></div>
            <div className="targeting-group"><h3>Already reflected</h3><div className="term-list">{comparison.matched.length ? comparison.matched.map((item) => <TargetTermChip item={item} matched key={`match-${item.term}`} />) : <small>No prominent overlap yet.</small>}</div></div>
            <div className="targeting-group"><h3>Verify before adding</h3><div className="term-list">{comparison.missing.length ? comparison.missing.map((item) => <TargetTermChip item={item} matched={false} key={`missing-${item.term}`} />) : <small>Every surfaced term appears somewhere in the visible resume.</small>}</div></div>
            <p className="targeting-caution">Only add a missing term when it truthfully describes your work, credential, method, or outcome. Show evidence in context; do not paste a keyword list.</p>
            <button className="text-button targeting-edit" type="button" onClick={() => onEdit()}>Edit resume evidence <ArrowRight size={14} /></button>
          </div>
        ) : targetText ? <p className="targeting-empty">Add more of the opportunity text so the comparison can identify meaningful terms.</p> : null}
      </section>
      <section className="editor-card review-principles">
        <div className="card-heading"><div><span className="eyebrow">Works in every field</span><h2>Final human checks</h2></div></div>
        <ol>
          <li><strong>Relevance first.</strong><span>Put the evidence most useful to this reader near the top—even if it is not your newest work.</span></li>
          <li><strong>Use honest specifics.</strong><span>Scope can be people, volume, speed, quality, safety, complexity, trust, or dollars.</span></li>
          <li><strong>Translate field language.</strong><span>Keep required credentials and keywords, but expand acronyms a broad reader may not know.</span></li>
          <li><strong>Proof the PDF.</strong><span>Check links, page breaks, dates, spelling, and that nothing important is stranded on a page.</span></li>
        </ol>
        <Link className="review-guide-link" to="/guide">Open the cross-industry resume guide <ArrowRight size={14} /></Link>
      </section>
    </div>
  )
}
