import { resumeToText, type ResumeDocument } from './resume'

export const MAX_TARGET_TEXT = 30_000
export const MAX_TARGET_TERMS = 18

export interface TargetTerm {
  term: string
  occurrences: number
  present: boolean
}

export interface TargetComparison {
  targetWordCount: number
  terms: TargetTerm[]
  matched: TargetTerm[]
  missing: TargetTerm[]
  truncated: boolean
}

interface SignalToken {
  display: string
  normalized: string
  comparable: string
  wordIndex: number
}

const ignoredTerms = new Set(`
  a about an and any are as at be been being by can company could candidate candidates
  desired do duties employer equal etc for from has have having he her hers him his how i
  ideal if in including into is it its job jobs may must of on opportunity or our ours
  position preferred qualifications required requirement requirements responsibilities
  responsibility role roles she should that the their theirs them they this those through
  to us using we what when where which who will with work working would you your yours
  ability abilities capable demonstrated desire duties excellent experience experienced
  knowledge minimum plus related relevant strong successful years
`.trim().split(/\s+/))

function comparableToken(value: string): string {
  if (/[+#]/.test(value)) return value
  if (value.length > 5 && value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.length > 4 && value.endsWith('s') && !/(ss|ics|is|us)$/.test(value)) return value.slice(0, -1)
  return value
}

function tokenize(value: string, includeIgnored = false): SignalToken[] {
  const tokens: SignalToken[] = []
  const pattern = /[\p{L}\p{N}][\p{L}\p{N}+#./-]*/gu
  let wordIndex = 0
  for (const match of value.normalize('NFKC').matchAll(pattern)) {
    const display = match[0].replace(/^[./-]+|[./-]+$/g, '')
    const normalized = display.toLocaleLowerCase()
    const currentWordIndex = wordIndex++
    if (!display || /^\d+$/.test(normalized)) continue
    if (!includeIgnored && (ignoredTerms.has(normalized) || (normalized.length < 3 && !/[+#]/.test(normalized)))) continue
    tokens.push({ display, normalized, comparable: comparableToken(normalized), wordIndex: currentWordIndex })
  }
  return tokens
}

function phraseIsPresent(phrase: string[], resumeTokens: SignalToken[]): boolean {
  if (phrase.length === 1) return resumeTokens.some((token) => token.comparable === phrase[0])
  for (let index = 0; index <= resumeTokens.length - phrase.length; index += 1) {
    if (phrase.every((token, offset) => resumeTokens[index + offset]?.comparable === token)) return true
  }
  return false
}

export function compareResumeToTarget(resume: ResumeDocument, targetText: string): TargetComparison {
  const truncated = targetText.length > MAX_TARGET_TEXT
  const boundedText = targetText.slice(0, MAX_TARGET_TEXT)
  const rawTargetTokens = tokenize(boundedText, true)
  const targetTokens = tokenize(boundedText)
  const resumeTokens = tokenize(resumeToText(resume), true)
  const candidates = new Map<string, { display: string; comparable: string[]; occurrences: number; firstIndex: number; score: number }>()

  for (const token of targetTokens) {
    const current = candidates.get(token.normalized)
    if (current) current.occurrences += 1
    else candidates.set(token.normalized, { display: token.display, comparable: [token.comparable], occurrences: 1, firstIndex: token.wordIndex, score: 0 })
  }

  const phraseCounts = new Map<string, { display: string; comparable: string[]; occurrences: number; firstIndex: number }>()
  for (let index = 0; index < targetTokens.length - 1; index += 1) {
    const first = targetTokens[index]!
    const second = targetTokens[index + 1]!
    if (second.wordIndex !== first.wordIndex + 1 || first.comparable === second.comparable) continue
    const key = `${first.normalized} ${second.normalized}`
    const current = phraseCounts.get(key)
    if (current) current.occurrences += 1
    else phraseCounts.set(key, { display: `${first.display} ${second.display}`, comparable: [first.comparable, second.comparable], occurrences: 1, firstIndex: first.wordIndex })
  }

  for (const [key, phrase] of phraseCounts) {
    if (phrase.occurrences >= 2) candidates.set(key, { ...phrase, score: 0 })
  }

  const ranked = [...candidates.values()]
  for (const candidate of ranked) {
    const phraseBoost = candidate.comparable.length > 1 ? 2.75 : 0
    candidate.score = candidate.occurrences * 3 + phraseBoost + Math.min(candidate.display.length, 20) / 100
  }
  ranked.sort((left, right) => right.score - left.score || left.firstIndex - right.firstIndex || left.display.localeCompare(right.display))

  const terms = ranked.slice(0, MAX_TARGET_TERMS).map<TargetTerm>((candidate) => ({
    term: candidate.display,
    occurrences: candidate.occurrences,
    present: phraseIsPresent(candidate.comparable, resumeTokens),
  }))
  return {
    targetWordCount: rawTargetTokens.length,
    terms,
    matched: terms.filter((term) => term.present),
    missing: terms.filter((term) => !term.present),
    truncated,
  }
}
