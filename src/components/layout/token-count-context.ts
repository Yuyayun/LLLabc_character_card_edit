import { createContext, useContext } from "react"
import type { TokenSettings, TokenizerId } from "@/lib/tokenSettings"

export type TokenizerStatus =
  | "disabled"
  | "selection-required"
  | "loading"
  | "ready"
  | "unavailable"

export interface TokenCountContextType {
  settings: TokenSettings
  status: TokenizerStatus
  sessionKey: string
  errorMessage: string | null
  setEnabled: (enabled: boolean) => void
  setTokenizer: (tokenizer: TokenizerId) => void
  countTexts: (texts: readonly string[]) => Promise<number[]>
}

export const TokenCountContext = createContext<TokenCountContextType | null>(null)

export function useTokenCountContext() {
  const context = useContext(TokenCountContext)
  if (!context) {
    throw new Error("useTokenCountContext 必须在 TokenCountProvider 中使用")
  }
  return context
}
