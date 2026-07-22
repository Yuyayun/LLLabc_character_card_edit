export const TOKEN_SETTINGS_STORAGE_KEY = "space-station-token-settings-v1"

export type TokenizerId = "gemini" | "claude" | "deepseek-v4"

export interface TokenSettings {
  enabled: boolean
  tokenizer: TokenizerId | null
}

export interface TokenizerDefinition {
  id: TokenizerId
  label: string
  file: string
  format: "json" | "sentencepiece" | "tiktoken"
  description: string
}

export const TOKENIZER_DEFINITIONS: readonly TokenizerDefinition[] = [
  {
    id: "gemini",
    label: "Gemini（Gemma 近似）",
    file: "gemma.model",
    format: "sentencepiece",
    description: "使用 Gemma 分词器近似估算 Gemini 文本。",
  },
  {
    id: "claude",
    label: "Claude（粗略估算）",
    file: "claude.json",
    format: "tiktoken",
    description: "仅作粗略参考；Claude 3 及更新模型没有公开的精确分词器。",
  },
  {
    id: "deepseek-v4",
    label: "DeepSeek V4",
    file: "deepseek-v4.json",
    format: "json",
    description: "使用 DeepSeek V4 官方模型仓库中公开的分词器估算。",
  },
] as const

export const DEFAULT_TOKEN_SETTINGS: TokenSettings = {
  enabled: false,
  tokenizer: null,
}

export function isTokenizerId(value: unknown): value is TokenizerId {
  return TOKENIZER_DEFINITIONS.some((definition) => definition.id === value)
}

export function loadTokenSettings(): TokenSettings {
  try {
    const raw = localStorage.getItem(TOKEN_SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_TOKEN_SETTINGS

    const parsed = JSON.parse(raw) as Partial<TokenSettings>
    return {
      enabled: parsed.enabled === true,
      tokenizer: isTokenizerId(parsed.tokenizer) ? parsed.tokenizer : null,
    }
  } catch {
    return DEFAULT_TOKEN_SETTINGS
  }
}

export function saveTokenSettings(settings: TokenSettings): void {
  localStorage.setItem(TOKEN_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function getTokenizerDefinition(
  tokenizer: TokenizerId
): TokenizerDefinition {
  return TOKENIZER_DEFINITIONS.find(
    (definition) => definition.id === tokenizer
  )!
}
