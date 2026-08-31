const englishActionVerbs = new Set(`
  accelerate accelerated achieve achieved administer administered analyze analyzed assess assessed author authored
  build built coach coached configure configured construct constructed coordinate coordinated create created cut
  deliver delivered design designed develop developed diagnose diagnosed direct directed drive drove establish established
  evaluate evaluated expand expanded facilitate facilitated found founded generate generated grow grew implement implemented
  improve improved increase increased launch launched lead led maintain maintained manage managed mentor mentored monitor monitored
  negotiate negotiated operate operated optimize optimized oversee oversaw plan planned present presented produce produced
  reduce reduced repair repaired research researched resolve resolved scale scaled secure secured serve served streamline streamlined
  supervise supervised support supported teach taught test tested train trained transform transformed write wrote
`.trim().split(/\s+/))

const englishCueWords = new Set('across after before during from into through using while with within'.split(' '))

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

export function reviewEnglishBulletStarts(bullets: string[]): EnglishBulletActionReview {
  let evaluated = 0
  let weakStarts = 0
  for (const bullet of bullets) {
    const words = textWordSegments(bullet).map((word) => word.toLocaleLowerCase('en-US'))
    const first = words[0] ?? ''
    const strongStart = englishActionVerbs.has(first)
    const likelyEnglish = strongStart || words.some((word) => englishCueWords.has(word))
    if (!likelyEnglish) continue
    evaluated += 1
    if (!strongStart) weakStarts += 1
  }
  return { evaluated, weakStarts, shouldFlag: evaluated >= 3 && weakStarts / evaluated > 0.65 }
}
