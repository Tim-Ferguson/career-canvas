import { Check, FileText, Palette, Type } from 'lucide-react'
import { densities, fontPairs, layouts, pageSizes, type Density, type FontPair, type Layout, type PageSize, type ResumeDocument } from '../lib/resume'

interface DesignPanelProps {
  resume: ResumeDocument
  onChange: (resume: ResumeDocument) => void
}

const layoutDetails: Record<Layout, { name: string; note: string }> = {
  modern: { name: 'Modern', note: 'Clear hierarchy with a crisp, flexible feel' },
  classic: { name: 'Classic', note: 'Centered and traditional for conservative fields' },
  executive: { name: 'Executive', note: 'Confident framing for leadership and strategy' },
  compact: { name: 'Compact', note: 'Space-efficient without sacrificing readability' },
  academic: { name: 'Academic', note: 'Publication-friendly structure for CVs and research' },
}

const colors = ['#315f58', '#263a51', '#17656b', '#6a4938', '#9c3f52', '#9a541c', '#415ca4', '#3e4d75', '#242424']

export function DesignPanel({ resume, onChange }: DesignPanelProps) {
  const patch = (updates: Partial<ResumeDocument['settings']>) => onChange({ ...resume, settings: { ...resume.settings, ...updates } })
  return (
    <div className="editor-stack design-panel">
      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Structure</span><h2>Layout</h2></div><p>Every option keeps a single semantic reading order for screening systems.</p></div>
        <div className="layout-grid">
          {layouts.map((layout) => (
            <button key={layout} type="button" className={`layout-choice ${resume.settings.layout === layout ? 'selected' : ''}`} onClick={() => patch({ layout })} aria-pressed={resume.settings.layout === layout}>
              <span className={`layout-thumbnail layout-thumbnail-${layout}`}><i /><i /><i /><i /></span>
              <span><strong>{layoutDetails[layout].name}</strong><small>{layoutDetails[layout].note}</small></span>
              {resume.settings.layout === layout ? <Check className="choice-check" size={16} /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Personality</span><h2>Color</h2></div><Palette size={18} aria-hidden="true" /></div>
        <div className="color-row">
          {colors.map((color) => <button key={color} type="button" className={resume.settings.accent === color ? 'selected' : ''} style={{ backgroundColor: color }} aria-label={`Use accent color ${color}`} aria-pressed={resume.settings.accent === color} onClick={() => patch({ accent: color })}>{resume.settings.accent === color ? <Check size={15} /> : null}</button>)}
          <label className="custom-color"><input type="color" value={resume.settings.accent} onChange={(event) => patch({ accent: event.currentTarget.value })} /><span>Custom</span></label>
        </div>
      </section>

      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Typography</span><h2>Type</h2></div><Type size={18} aria-hidden="true" /></div>
        <div className="segmented-control" aria-label="Font style">
          {fontPairs.map((font) => <button key={font} type="button" className={resume.settings.fontPair === font ? 'selected' : ''} onClick={() => patch({ fontPair: font as FontPair })} aria-pressed={resume.settings.fontPair === font}>{font === 'sans' ? 'Clean sans' : font === 'serif' ? 'Traditional serif' : 'Editorial mix'}</button>)}
        </div>
      </section>

      <section className="editor-card">
        <div className="card-heading"><div><span className="eyebrow">Fit</span><h2>Page setup</h2></div><FileText size={18} aria-hidden="true" /></div>
        <div className="setting-row">
          <label><span>Page size</span><select value={resume.settings.pageSize} onChange={(event) => patch({ pageSize: event.currentTarget.value as PageSize })}>{pageSizes.map((size) => <option value={size} key={size}>{size === 'a4' ? 'A4' : 'US Letter'}</option>)}</select></label>
          <label><span>Spacing</span><select value={resume.settings.density} onChange={(event) => patch({ density: event.currentTarget.value as Density })}>{densities.map((density) => <option value={density} key={density}>{density[0]!.toUpperCase() + density.slice(1)}</option>)}</select></label>
        </div>
        <p className="card-note">Choose tight spacing only after editing for relevance. Smaller type is never used to hide an overlong document.</p>
      </section>
    </div>
  )
}
