import { AlertCircle, ArrowRight, CheckCircle2, Lightbulb, Target } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { analyzeResume, type ResumeDocument, type ResumeIssue } from '../lib/resume'

function IssueIcon({ severity }: Pick<ResumeIssue, 'severity'>) {
  if (severity === 'essential') return <AlertCircle size={17} />
  if (severity === 'improvement') return <Target size={17} />
  return <Lightbulb size={17} />
}

export function ReviewPanel({ resume, onEdit }: { resume: ResumeDocument; onEdit: () => void }) {
  const analysis = analyzeResume(resume)
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
        <div><strong>{resume.sections.filter((item) => item.visible).length}</strong><span>visible sections</span></div>
      </div>
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Priority pass</span><h2>What to improve</h2></div><span className="issue-count">{analysis.issues.length}</span></div>
        {analysis.issues.length ? (
          <div className="issue-list">
            {analysis.issues.map((issue) => (
              <button type="button" className={`issue issue-${issue.severity}`} key={issue.id} onClick={onEdit}>
                <IssueIcon severity={issue.severity} />
                <span><strong>{issue.title}</strong><small>{issue.detail}</small></span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : <div className="review-success"><CheckCircle2 size={24} /><div><strong>No structural issues found</strong><p>Do one final proofread against the job description before exporting.</p></div></div>}
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
