import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, GraduationCap, HeartPulse, Lightbulb, ShieldCheck, Wrench } from 'lucide-react'

export const Route = createFileRoute('/guide')({
  head: () => ({ meta: [{ title: 'Resume Guide — Career Canvas' }, { name: 'description', content: 'Practical, cross-industry guidance for writing a clear, credible, targeted resume.' }] }),
  component: GuidePage,
})

const fieldNotes = [
  { icon: BriefcaseBusiness, title: 'Leadership & business', text: 'Show decision scope, operating scale, change leadership, team growth, and business outcomes. Replace executive clichés with evidence.' },
  { icon: HeartPulse, title: 'Healthcare & service', text: 'Make active licenses, settings, populations, specialized practice, safety, quality, and patient or client outcomes easy to find.' },
  { icon: GraduationCap, title: 'Education & research', text: 'Balance subject expertise with learner, research, curriculum, publication, grant, and community impact. Use the length your institution expects.' },
  { icon: Wrench, title: 'Trades & technical work', text: 'Lead with required credentials, systems and equipment, project complexity, safety record, diagnostics, uptime, quality, and dependable delivery.' },
]

function GuidePage() {
  return (
    <main className="guide-page">
      <header className="guide-nav"><Link to="/"><ArrowLeft size={16} /> Back to studio</Link><span className="app-brand"><span className="brand-mark">C<span>/</span></span><span><strong>Career Canvas</strong><small>Resume guide</small></span></span></header>
      <article>
        <section className="guide-hero"><span className="eyebrow">A resume is a decision document</span><h1>Make the right evidence easy to find.</h1><p>There is no single perfect format for every career. The durable principles are focus, clear structure, credible specifics, and respect for the reader’s time.</p><Link className="primary-button" to="/">Open your resume <ArrowRight size={16} /></Link></section>
        <section className="guide-principles">
          <div><span>01</span><h2>Choose one target</h2><p>A strong resume answers “why this person for this work?” Name the role, audience, or opportunity before deciding what to keep.</p></div>
          <div><span>02</span><h2>Lead with relevant proof</h2><p>Recency matters, but relevance wins. Reorder sections and bullets so the strongest matching evidence appears first.</p></div>
          <div><span>03</span><h2>Give claims a shape</h2><p>Describe the action, context, and result. Honest scale can mean people, volume, risk, speed, quality, safety, trust, or money.</p></div>
        </section>
        <section className="guide-section"><span className="eyebrow">Across industries</span><h2>Different fields reward different proof.</h2><div className="field-notes">{fieldNotes.map(({ icon: Icon, title, text }) => <div key={title}><Icon size={21} /><h3>{title}</h3><p>{text}</p></div>)}</div></section>
        <section className="guide-section guide-two-column">
          <div><span className="eyebrow">Screening-system friendly</span><h2>Keep the structure boring. Make the writing excellent.</h2><ul className="check-list"><li><CheckCircle2 /> Use recognizable headings when they fit.</li><li><CheckCircle2 /> Keep dates and organization names in plain text.</li><li><CheckCircle2 /> Use links with descriptive visible labels.</li><li><CheckCircle2 /> Export a real text PDF, never a screenshot.</li><li><CheckCircle2 /> Test the plain-text export for reading order.</li></ul></div>
          <aside><ShieldCheck size={25} /><h3>What Career Canvas protects</h3><p>The layouts share one semantic document structure. Visual style changes without hiding content in images or rearranging the underlying reading order.</p></aside>
        </section>
        <section className="guide-section"><span className="eyebrow">Before sending</span><h2>A five-minute final pass</h2><ol className="final-pass"><li><strong>Match</strong><span>Compare the top half with the opportunity’s actual priorities.</span></li><li><strong>Trim</strong><span>Remove low-value repetition and bullets that only list duties.</span></li><li><strong>Verify</strong><span>Check names, credentials, dates, numbers, contact details, and every link.</span></li><li><strong>Print</strong><span>Inspect page breaks and confirm the PDF text can be selected.</span></li><li><strong>Name</strong><span>Use a clear file name such as Firstname-Lastname-Role.pdf.</span></li></ol></section>
        <section className="guide-cta"><Lightbulb size={22} /><div><h2>Ready to make the next version sharper?</h2><p>Use the Review tab as a prompt, then trust the needs of your field and the truth of your experience.</p></div><Link className="primary-button" to="/">Return to studio <ArrowRight size={16} /></Link></section>
      </article>
    </main>
  )
}
