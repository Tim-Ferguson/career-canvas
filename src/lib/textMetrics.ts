const englishActionVerbs = new Set(`
  accelerate accelerated achieve achieved administer administered analyze analyzed assess assessed author authored boost boosted
  build built coach coached configure configured construct constructed coordinate coordinated create created cut
  decrease decreased deliver delivered design designed develop developed diagnose diagnosed direct directed drive drove eliminate eliminated ensure ensured establish established
  evaluate evaluated expand expanded facilitate facilitated found founded generate generated grow grew implement implemented
  improve improved increase increased launch launched lead led lower lowered maintain maintained manage managed mentor mentored monitor monitored
  negotiate negotiated operate operated optimize optimized oversee oversaw plan planned present presented produce produced
  preserve preserved prevent prevented protect protected raise raised reduce reduced repair repaired research researched resolve resolved restore restored
  save saved scale scaled secure secured serve served stabilize stabilized streamline streamlined strengthen strengthened supervise supervised
  support supported sustain sustained teach taught test tested train trained transform transformed write wrote
`.trim().split(/\s+/))

const englishCueWords = new Set('across after before during from into through using while with within'.split(' '))

const qualitativeChangeVerbs = new Set(`
  accelerate accelerated achieve achieved boost boosted cut decrease decreased eliminate eliminated expand expanded grow grew improve improved
  increase increased lower lowered prevent prevented raise raised reduce reduced resolve resolved restore restored save saved stabilize stabilized
  streamline streamlined strengthen strengthened transform transformed
`.trim().split(/\s+/))

const qualitativeOutcomeTerms = new Set(`
  access accessible accuracy availability capacity compliance completion cost costs defect defects delay delays downtime efficiency equity error errors
  incident incidents margin margins outcome outcomes performance quality reliability retention revenue risk risks safety satisfaction throughput trust
  uptime wait waste
`.trim().split(/\s+/))

const qualitativeOutcomeVerbs = new Set(`
  achieve achieved deliver delivered ensure ensured maintain maintained preserve preserved protect protected restore restored sustain sustained
`.trim().split(/\s+/))

const outcomeScopePhrases = [
  'ahead of schedule',
  'cross functional',
  'enterprise wide',
  'multi site',
  'nationwide',
  'on time',
  'organization wide',
  'statewide',
  'under budget',
] as const

const englishResponsibilityStart = /^(responsible for|duties included|helped (with|to)|worked on)\b/i
const unicodeMeasurement = /[\p{N}\p{Sc}%‰‱％٪؉؊]/u

let cachedSegmenter: Intl.Segmenter | null | undefined

function wordSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter
  try {
    cachedSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null
  } catch {
    cachedSegmenter = null
  }
  return cachedSegmenter
}

function fallbackWordSegments(value: string): string[] {
  const matches = value.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
  return matches.flatMap((match) => {
    if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(match)) return [match]
    const characters = Array.from(match)
    const segments: string[] = []
    for (let index = 0; index < characters.length; index += 3) segments.push(characters.slice(index, index + 3).join(''))
    return segments
  })
}

export function textWordSegments(value: string): string[] {
  const normalized = value.normalize('NFKC').trim()
  if (!normalized) return []
  const segmenter = wordSegmenter()
  if (!segmenter) return fallbackWordSegments(normalized)
  return [...segmenter.segment(normalized)].filter((item) => item.isWordLike).map((item) => item.segment)
}

export function textWordCount(value: string): number {
  return textWordSegments(value).length
}

export interface EnglishBulletActionReview {
  evaluated: number
  weakStarts: number
  shouldFlag: boolean
}

export interface BulletOutcomeReview {
  measurableSignals: number
  qualitativeSignals: number
  evaluatedEnglish: number
  firstReviewableIndex?: number
  hasOutcomeEvidence: boolean
  shouldFlag: boolean
}

interface EnglishBulletAssessment {
  words: string[]
  strongStart: boolean
  likelyEnglish: boolean
}

function assessEnglishBullet(bullet: string): EnglishBulletAssessment {
  const words = textWordSegments(bullet).map((word) => word.toLocaleLowerCase('en-US'))
  const strongStart = englishActionVerbs.has(words[0] ?? '')
  const likelyEnglish = strongStart || englishResponsibilityStart.test(bullet.trim()) || words.some((word) => englishCueWords.has(word))
  return { words, strongStart, likelyEnglish }
}

export function reviewEnglishBulletStarts(bullets: string[]): EnglishBulletActionReview {
  let evaluated = 0
  let weakStarts = 0
  for (const bullet of bullets) {
    const { strongStart, likelyEnglish } = assessEnglishBullet(bullet)
    if (!likelyEnglish) continue
    evaluated += 1
    if (!strongStart) weakStarts += 1
  }
  return { evaluated, weakStarts, shouldFlag: evaluated >= 3 && weakStarts / evaluated > 0.65 }
}

export function reviewBulletOutcomes(bullets: string[]): BulletOutcomeReview {
  let measurableSignals = 0
  let qualitativeSignals = 0
  let evaluatedEnglish = 0
  let firstReviewableIndex: number | undefined

  bullets.forEach((bullet, index) => {
    const normalized = bullet.normalize('NFKC')
    if (unicodeMeasurement.test(normalized)) measurableSignals += 1

    const { words, likelyEnglish } = assessEnglishBullet(normalized)
    if (!likelyEnglish) return
    evaluatedEnglish += 1
    firstReviewableIndex ??= index

    const normalizedPhrase = words.join(' ')
    const hasChangeVerb = words.some((word) => qualitativeChangeVerbs.has(word))
    const hasOutcomePair = words.some((word) => qualitativeOutcomeVerbs.has(word)) && words.some((word) => qualitativeOutcomeTerms.has(word))
    const hasScopePhrase = outcomeScopePhrases.some((phrase) => normalizedPhrase.includes(phrase))
    if (hasChangeVerb || hasOutcomePair || hasScopePhrase) qualitativeSignals += 1
  })

  const hasOutcomeEvidence = measurableSignals > 0 || qualitativeSignals > 0
  return {
    measurableSignals,
    qualitativeSignals,
    evaluatedEnglish,
    ...(firstReviewableIndex === undefined ? {} : { firstReviewableIndex }),
    hasOutcomeEvidence,
    shouldFlag: bullets.length > 0 && evaluatedEnglish > 0 && !hasOutcomeEvidence,
  }
}
