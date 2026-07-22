import { useEffect, useState } from "react"
import { useTokenCountContext } from "@/components/layout/token-count-context"
import type { TokenizerStatus } from "@/components/layout/token-count-context"

export interface TokenCountResult {
  visible: boolean
  status: TokenizerStatus
  counts: number[] | null
  total: number | null
}

export function useTokenCounts(
  texts: readonly string[],
  debounceMs = 180
): TokenCountResult {
  const { settings, status, sessionKey, countTexts } = useTokenCountContext()
  const [result, setResult] = useState<{
    key: string
    counts: number[]
  } | null>(null)
  const signature = JSON.stringify(texts)
  const requestKey = `${sessionKey}:${signature}`
  const counts =
    status === "ready" && result?.key === requestKey ? result.counts : null

  useEffect(() => {
    let active = true

    if (status !== "ready") return

    const timeout = window.setTimeout(() => {
      const requestedTexts = JSON.parse(signature) as string[]
      countTexts(requestedTexts)
        .then((nextCounts) => {
          if (active) setResult({ key: requestKey, counts: nextCounts })
        })
        .catch(() => {})
    }, debounceMs)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [countTexts, debounceMs, requestKey, signature, status])

  return {
    visible: settings.enabled,
    status,
    counts,
    total: counts?.reduce((sum, count) => sum + count, 0) ?? null,
  }
}

export function useTokenCount(text: string, debounceMs = 180) {
  const result = useTokenCounts([text], debounceMs)
  return { ...result, count: result.counts?.[0] ?? null }
}
