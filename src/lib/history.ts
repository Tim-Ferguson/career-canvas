import type { ResumeDocument } from './resume'

export const HISTORY_LIMIT = 60
export const HISTORY_GROUP_WINDOW_MS = 1_200

export interface ResumeHistory {
  past: ResumeDocument[]
  future: ResumeDocument[]
  lastPath: string
  lastRecordedAt: number
}

export function createResumeHistory(): ResumeHistory {
  return { past: [], future: [], lastPath: '', lastRecordedAt: 0 }
}

function firstDifference(before: unknown, after: unknown, path: string): string | null {
  if (Object.is(before, after)) return null
  if (typeof before !== 'object' || before === null || typeof after !== 'object' || after === null) return path || 'resume'
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) return path || 'resume'
    if (before.length !== after.length) return `${path}.length`
    for (let index = 0; index < before.length; index += 1) {
      const difference = firstDifference(before[index], after[index], `${path}.${index}`)
      if (difference) return difference
    }
    return null
  }
  const beforeRecord = before as Record<string, unknown>
  const afterRecord = after as Record<string, unknown>
  const keys = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].sort()
  for (const key of keys) {
    const difference = firstDifference(beforeRecord[key], afterRecord[key], path ? `${path}.${key}` : key)
    if (difference) return difference
  }
  return null
}

export function changedResumePath(before: ResumeDocument, after: ResumeDocument): string | null {
  return firstDifference(before, after, '')
}

export function recordResumeChange(history: ResumeHistory, before: ResumeDocument, after: ResumeDocument, recordedAt = Date.now()): ResumeHistory {
  const path = changedResumePath(before, after)
  if (!path) return history
  const groupWithPrevious = history.future.length === 0 && history.lastPath === path && recordedAt - history.lastRecordedAt <= HISTORY_GROUP_WINDOW_MS
  const past = groupWithPrevious ? history.past : [...history.past, before].slice(-HISTORY_LIMIT)
  return { past, future: [], lastPath: path, lastRecordedAt: recordedAt }
}

export function undoResumeChange(history: ResumeHistory, current: ResumeDocument): { history: ResumeHistory; document: ResumeDocument | null } {
  const document = history.past.at(-1)
  if (!document) return { history, document: null }
  return {
    document,
    history: { past: history.past.slice(0, -1), future: [...history.future, current].slice(-HISTORY_LIMIT), lastPath: '', lastRecordedAt: 0 },
  }
}

export function redoResumeChange(history: ResumeHistory, current: ResumeDocument): { history: ResumeHistory; document: ResumeDocument | null } {
  const document = history.future.at(-1)
  if (!document) return { history, document: null }
  return {
    document,
    history: { past: [...history.past, current].slice(-HISTORY_LIMIT), future: history.future.slice(0, -1), lastPath: '', lastRecordedAt: 0 },
  }
}
