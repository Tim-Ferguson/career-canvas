export interface ResumeDateRange {
  earliestMonth: number
  latestMonth: number
}

const months: Readonly<Record<string, number>> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

function range(year: number, startMonth: number, endMonth = startMonth): ResumeDateRange {
  return {
    earliestMonth: year * 12 + startMonth,
    latestMonth: year * 12 + endMonth,
  }
}

export function parseResumeDate(value: string): ResumeDateRange | null {
  const normalized = value.trim().toLocaleLowerCase()
  if (!normalized || /^(present|current|active|ongoing|forthcoming|in press|now)$/.test(normalized)) return null
  const years = normalized.match(/\b(?:18|19|20|21|22)\d{2}\b/g)
  if (years?.length !== 1) return null
  const year = Number(years[0])

  const numericMonth = normalized.match(/\b(?:18|19|20|21|22)\d{2}[-/.](0?[1-9]|1[0-2])\b/)
  if (numericMonth) return range(year, Number(numericMonth[1]) - 1)
  const monthFirst = normalized.match(/\b(0?[1-9]|1[0-2])[-/.](?:18|19|20|21|22)\d{2}\b/)
  if (monthFirst) return range(year, Number(monthFirst[1]) - 1)

  const monthName = Object.keys(months).find((name) => new RegExp(`\\b${name}\\.?\\b`).test(normalized))
  if (monthName) return range(year, months[monthName]!)

  const quarter = normalized.match(/\bq([1-4])\b/)
  if (quarter) {
    const firstMonth = (Number(quarter[1]) - 1) * 3
    return range(year, firstMonth, firstMonth + 2)
  }

  if (/\bspring\b/.test(normalized)) return range(year, 2, 4)
  if (/\bsummer\b/.test(normalized)) return range(year, 5, 7)
  if (/\b(fall|autumn)\b/.test(normalized)) return range(year, 8, 10)
  return range(year, 0, 11)
}

export function resumeDateRangeIsReversed(startDate: string, endDate: string): boolean {
  const start = parseResumeDate(startDate)
  const end = parseResumeDate(endDate)
  return Boolean(start && end && end.latestMonth < start.earliestMonth)
}

export function resumeDateIsDefinitelyFuture(value: string, today = new Date()): boolean {
  const parsed = parseResumeDate(value)
  const currentMonth = today.getUTCFullYear() * 12 + today.getUTCMonth()
  return Boolean(parsed && parsed.earliestMonth > currentMonth)
}
