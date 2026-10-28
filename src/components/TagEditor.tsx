import { useRef, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { MAX_LIST_ITEMS, MAX_TEXT, moveInArray } from '../lib/resume'
import { usePointerReorder } from './usePointerReorder'

interface TagEditorProps {
  idPrefix: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}

function splitTags(text: string): string[] {
  return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}

export function TagEditor({ idPrefix, label, values, onChange, placeholder }: TagEditorProps) {
  const tags = values.filter((item) => item.trim())
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const lowerLabel = label.toLocaleLowerCase()
  const atLimit = tags.length >= MAX_LIST_ITEMS

  const focusTag = (index: number) => window.requestAnimationFrame(() => document.getElementById(`${idPrefix}-tag-${index}`)?.focus())

  const addTags = (text: string) => {
    const existing = new Set(tags.map((item) => item.toLocaleLowerCase()))
    const additions = splitTags(text).filter((item) => {
      const key = item.toLocaleLowerCase()
      if (existing.has(key)) return false
      existing.add(key)
      return true
    })
    if (additions.length) onChange([...tags, ...additions].slice(0, MAX_LIST_ITEMS))
    setDraft('')
  }

  const removeTag = (index: number) => onChange(tags.filter((_, itemIndex) => itemIndex !== index))

  const moveTag = (from: number, to: number) => {
    if (to < 0 || to >= tags.length || from === to) return
    onChange(moveInArray(tags, from, to))
    focusTag(to)
  }

  const commitEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    onChange(text ? tags.map((item, index) => index === editing.index ? text : item) : tags.filter((_, index) => index !== editing.index))
    setEditing(null)
    focusTag(editing.index)
  }

  const tagIndexAt = (x: number, y: number): number | null => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-tag-index]') ?? [])
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return Number(item.dataset.tagIndex)
    }
    return null
  }


  const { order, draggingIndex, handlers } = usePointerReorder(tags.length, tagIndexAt, moveTag)

  return (
    <fieldset className="list-field tag-field">
      <legend>{label}</legend>
      <div className="tag-box" onClick={(event) => { if (event.target === event.currentTarget) document.getElementById(`${idPrefix}-input`)?.focus() }}>
        {tags.length ? (
          <ul className="tag-list" ref={listRef} aria-label={`${label}, drag or press Alt and an arrow key to reorder`}>
            {order.map((index, position) => {
              const tag = tags[index]!
              if (editing?.index === index) {
                return (
                  <li key={index} className="tag-chip editing" data-tag-index={position}>
                    <input
                      autoFocus
                      aria-label={`Edit ${lowerLabel} ${index + 1}`}
                      value={editing.text}
                      maxLength={MAX_TEXT}
                      size={Math.max(4, editing.text.length)}
                      onChange={(event) => setEditing({ index, text: event.currentTarget.value })}
                      onBlur={commitEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') { event.preventDefault(); commitEdit() }
                        if (event.key === 'Escape') { event.preventDefault(); setEditing(null); focusTag(index) }
                      }}
                    />
                  </li>
                )
              }
              return (
                <li
                  key={index}
                  id={`${idPrefix}-tag-${index}`}
                  className={`tag-chip${draggingIndex === index ? ' dragging' : ''}`}
                  data-tag-index={position}
                  tabIndex={0}
                  aria-label={`${tag}, ${lowerLabel} ${index + 1} of ${tags.length}`}
                  title="Drag to reorder · double-click to edit"
                  {...handlers(index)}
                  onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) handlers(index).onPointerDown(event) }}
                  onDoubleClick={() => setEditing({ index, text: tag })}
                  onKeyDown={(event) => {
                    if (event.altKey && event.key === 'ArrowLeft') { event.preventDefault(); moveTag(index, index - 1) }
                    else if (event.altKey && event.key === 'ArrowRight') { event.preventDefault(); moveTag(index, index + 1) }
                    else if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); setEditing({ index, text: tag }) }
                    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeTag(index); focusTag(Math.min(index, tags.length - 2)) }
                  }}
                >
                  <GripVertical size={12} aria-hidden="true" className="tag-grip" />
                  <span>{tag}</span>
                  <button type="button" tabIndex={-1} aria-label={`Remove ${tag}`} title={`Remove ${tag}`} onClick={() => removeTag(index)}><X size={12} /></button>
                </li>
              )
            })}
          </ul>
        ) : null}
        <input
          id={`${idPrefix}-input`}
          className="tag-input"
          aria-label={`Add ${lowerLabel}`}
          value={draft}
          maxLength={MAX_TEXT}
          disabled={atLimit}
          placeholder={atLimit ? `${label} limit reached` : tags.length ? 'Add another…' : placeholder}
          onChange={(event) => {
            const text = event.currentTarget.value
            if (/[,\n]/.test(text)) addTags(text)
            else setDraft(text)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); addTags(draft) }
            else if (event.key === 'Backspace' && !draft && tags.length) { event.preventDefault(); focusTag(tags.length - 1) }
          }}
          onBlur={() => { if (draft.trim()) addTags(draft) }}
        />
      </div>
      <small className="tag-hint">Enter or comma adds · drag to reorder · double-click to edit</small>
    </fieldset>
  )
}
