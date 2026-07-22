/// <reference lib="webworker" />

interface InitMessage {
  type: "init"
  generation: number
  format: "json" | "sentencepiece" | "tiktoken"
  resourceUrl: string
}

interface CountMessage {
  type: "count"
  generation: number
  requestId: number
  texts: readonly string[]
}

type IncomingMessage = InitMessage | CountMessage

interface ActiveTokenizer {
  encode: (text: string) => { length: number }
  dispose: () => void
}

let tokenizer: ActiveTokenizer | null = null
let activeGeneration = 0

async function fetchResource(resourceUrl: string) {
  const response = await fetch(resourceUrl, { cache: "force-cache" })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.arrayBuffer()
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const message = event.data

  if (message.type === "init") {
    activeGeneration = message.generation
    try {
      tokenizer?.dispose()
      if (message.format === "tiktoken") {
        const [{ Tiktoken }, data] = await Promise.all([
          import("js-tiktoken/lite"),
          fetchResource(message.resourceUrl),
        ])
        if (message.generation !== activeGeneration) return
        const config = JSON.parse(new TextDecoder().decode(data)) as {
          bpe_ranks: string
          special_tokens: Record<string, number>
          pat_str: string
        }
        const instance = new Tiktoken(config)
        tokenizer = {
          encode: (text) => instance.encode(text),
          dispose: () => {},
        }
      } else {
        const [{ Tokenizer }, data] = await Promise.all([
          import("@mlc-ai/web-tokenizers"),
          fetchResource(message.resourceUrl),
        ])
        if (message.generation !== activeGeneration) return
        tokenizer =
          message.format === "sentencepiece"
            ? await Tokenizer.fromSentencePiece(data)
            : await Tokenizer.fromJSON(data)
      }
      if (message.generation !== activeGeneration) {
        tokenizer.dispose()
        tokenizer = null
        return
      }
      self.postMessage({ type: "ready" })
    } catch {
      if (message.generation !== activeGeneration) return
      tokenizer?.dispose()
      tokenizer = null
      self.postMessage({
        type: "error",
        message: "分词器资源加载失败，请检查网络后重试",
      })
    }
    return
  }

  if (message.generation !== activeGeneration || !tokenizer) return

  try {
    const counts = message.texts.map((text) => tokenizer!.encode(text).length)
    self.postMessage({
      type: "count-result",
      requestId: message.requestId,
      counts,
    })
  } catch {
    self.postMessage({
      type: "error",
      message: "Token 统计失败，请重新选择分词器",
    })
  }
}

export {}
