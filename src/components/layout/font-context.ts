import { createContext, useContext } from "react"
import type {
  CustomFontInput,
  FontOption,
  FontPreferences,
} from "@/lib/fontSettings"

export type FontLoadStatus =
  | "idle"
  | "loading-css"
  | "loading-font"
  | "ready"
  | "failed"

export interface FontLoadState {
  status: FontLoadStatus
  targetFamily: string | null
  message: string
}

export interface FontActionResult {
  ok: boolean
  message: string
}

interface FontContextType {
  fontState: FontPreferences
  fonts: FontOption[]
  loadState: FontLoadState
  selectFont: (font: FontOption) => Promise<FontActionResult>
  addCustomFont: (input: CustomFontInput) => Promise<FontActionResult>
  removeCustomFont: (id: string) => void
}

export const FontContext = createContext<FontContextType | null>(null)

export function useFont() {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error("useFont 必须在 FontProvider 中使用")
  }
  return context
}
