import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  getTokenizerDefinition,
  loadTokenSettings,
  saveTokenSettings,
} from "@/lib/tokenSettings"
import type { TokenSettings, TokenizerId } from "@/lib/tokenSettings"
import {
  TokenCountContext,
  type TokenizerStatus,
} from "@/components/layout/token-count-context"

interface PendingRequest {
  resolve: (counts: number[]) => void
  reject: (error: Error) => void
}

interface WorkerMessage {
  type: "ready" | "count-result" | "error"
  requestId?: number
  counts?: number[]
  message?: string
}

const MAX_CACHE_ENTRIES = 1000

export function TokenCountProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TokenSettings>(loadTokenSettings)
  const [settingsEpoch, setSettingsEpoch] = useState(0)
  const sessionKey = `${settings.enabled}:${settings.tokenizer ?? "none"}:${settingsEpoch}`
  const desiredStatus: TokenizerStatus = settings.enabled
    ? settings.tokenizer
      ? "loading"
      : "selection-required"
    : "disabled"
  const [runtimeState, setRuntimeState] = useState<{
    key: string
    status: TokenizerStatus
    errorMessage: string | null
  }>(() => ({ key: sessionKey, status: desiredStatus, errorMessage: null }))
  const status =
    runtimeState.key === sessionKey ? runtimeState.status : desiredStatus
  const errorMessage =
    runtimeState.key === sessionKey ? runtimeState.errorMessage : null
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const generationRef = useRef(0)
  const pendingRef = useRef(new Map<number, PendingRequest>())
  const cacheRef = useRef(new Map<string, number>())
  const inFlightRef = useRef(new Map<string, Promise<number>>())

  const rejectPending = useCallback((message: string) => {
    const error = new Error(message)
    for (const pending of pendingRef.current.values()) {
      pending.reject(error)
    }
    pendingRef.current.clear()
    inFlightRef.current.clear()
  }, [])

  useEffect(() => {
    saveTokenSettings(settings)
  }, [settings])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current

    workerRef.current?.terminate()
    workerRef.current = null
    rejectPending("分词器设置已改变")
    cacheRef.current.clear()

    if (!settings.enabled) {
      return
    }

    if (!settings.tokenizer) {
      return
    }

    const definition = getTokenizerDefinition(settings.tokenizer)
    const worker = new Worker(
      new URL("../../workers/tokenizer.worker.ts", import.meta.url),
      { type: "module" }
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (generation !== generationRef.current) return
      const message = event.data

      if (message.type === "ready") {
        setRuntimeState({ key: sessionKey, status: "ready", errorMessage: null })
        return
      }

      if (message.type === "count-result" && message.requestId != null) {
        const pending = pendingRef.current.get(message.requestId)
        if (!pending) return
        pendingRef.current.delete(message.requestId)
        pending.resolve(message.counts ?? [])
        return
      }

      if (message.type === "error") {
        const friendlyMessage = message.message || "分词器暂时不可用"
        setRuntimeState({
          key: sessionKey,
          status: "unavailable",
          errorMessage: friendlyMessage,
        })
        rejectPending(friendlyMessage)
      }
    }

    worker.onerror = () => {
      if (generation !== generationRef.current) return
      const message = "分词器加载失败，请稍后重试"
      setRuntimeState({
        key: sessionKey,
        status: "unavailable",
        errorMessage: message,
      })
      rejectPending(message)
    }

    const baseUrl = new URL(".", document.baseURI)
    worker.postMessage({
      type: "init",
      generation,
      format: definition.format,
      resourceUrl: new URL(`tokenizers/${definition.file}`, baseUrl).href,
    })

    return () => {
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
    }
  }, [rejectPending, sessionKey, settings.enabled, settings.tokenizer])

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((current) => ({ ...current, enabled }))
    setSettingsEpoch((current) => current + 1)
  }, [])

  const setTokenizer = useCallback((tokenizer: TokenizerId) => {
    setSettings((current) => ({ ...current, tokenizer }))
    setSettingsEpoch((current) => current + 1)
  }, [])

  const sendBatch = useCallback((texts: readonly string[]) => {
    const worker = workerRef.current
    if (!worker) return Promise.reject(new Error("分词器尚未就绪"))

    const requestId = ++requestIdRef.current
    const generation = generationRef.current
    return new Promise<number[]>((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject })
      worker.postMessage({
        type: "count",
        generation,
        requestId,
        texts,
      })
    })
  }, [])

  const countTexts = useCallback(
    async (texts: readonly string[]) => {
      if (status !== "ready") throw new Error("分词器尚未就绪")

      const missing = Array.from(
        new Set(
          texts.filter(
            (text) =>
              text.length > 0 &&
              !cacheRef.current.has(text) &&
              !inFlightRef.current.has(text)
          )
        )
      )

      if (missing.length > 0) {
        const batch = sendBatch(missing)
        missing.forEach((text, index) => {
          const pendingCount = batch
            .then((counts) => {
              const count = counts[index] ?? 0
              cacheRef.current.set(text, count)
              while (cacheRef.current.size > MAX_CACHE_ENTRIES) {
                const oldest = cacheRef.current.keys().next().value
                if (oldest == null) break
                cacheRef.current.delete(oldest)
              }
              return count
            })
            .finally(() => {
              inFlightRef.current.delete(text)
            })
          inFlightRef.current.set(text, pendingCount)
        })
      }

      return Promise.all(
        texts.map((text) => {
          if (text.length === 0) return Promise.resolve(0)
          const cached = cacheRef.current.get(text)
          if (cached != null) return Promise.resolve(cached)
          const pending = inFlightRef.current.get(text)
          return pending ?? Promise.reject(new Error("Token 统计请求未创建"))
        })
      )
    },
    [sendBatch, status]
  )

  const contextValue = useMemo(
    () => ({
      settings,
      status,
      sessionKey,
      errorMessage,
      setEnabled,
      setTokenizer,
      countTexts,
    }),
    [countTexts, errorMessage, sessionKey, setEnabled, setTokenizer, settings, status]
  )

  return (
    <TokenCountContext.Provider value={contextValue}>
      {children}
    </TokenCountContext.Provider>
  )
}
