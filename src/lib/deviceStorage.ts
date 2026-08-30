export type DeviceStorageFailure = 'blocked' | 'full' | 'unavailable'

export type DeviceStorageOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: DeviceStorageFailure }

function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return ''
  return typeof error.name === 'string' ? error.name : ''
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'number' ? error.code : undefined
}

export function classifyDeviceStorageFailure(error: unknown): DeviceStorageFailure {
  const name = errorName(error)
  const code = errorCode(error)
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) return 'full'
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'blocked'
  return 'unavailable'
}

export function runDeviceStorageOperation<StorageType, Result>(
  getStorage: () => StorageType,
  operation: (storage: StorageType) => Result,
): DeviceStorageOperationResult<Result> {
  try {
    return { ok: true, value: operation(getStorage()) }
  } catch (error) {
    return { ok: false, reason: classifyDeviceStorageFailure(error) }
  }
}

