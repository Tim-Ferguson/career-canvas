export interface LatestRef<T> {
  current: T
}

export function commitLatest<T>(latest: LatestRef<T>, commit: (value: T) => void, update: (current: T) => T): T {
  const next = update(latest.current)
  latest.current = next
  commit(next)
  return next
}
