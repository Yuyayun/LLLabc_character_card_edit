export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function cloneRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? structuredClone(value) : {}
}

export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function stringValue(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string" ? value : fallback
}

export function numberValue(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback
}

export function booleanValue(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function stringArrayValue(
  value: unknown,
  fallback: string[] = []
): string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string")
    ? structuredClone(value)
    : structuredClone(fallback)
}
