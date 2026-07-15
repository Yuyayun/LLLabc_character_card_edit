import { createContext, useContext } from "react"

export type Theme = "dark" | "light"

export type AccentColor = "indigo" | "sky" | "emerald" | "rose" | "amber" | "slate"

interface AccentDef {
  label: string
  light: { primary: string; ring: string }
  dark: { primary: string; ring: string }
}

export const accentDefs: Record<AccentColor, AccentDef> = {
  indigo: {
    label: "系统蓝",
    light: { primary: "#007AFF", ring: "rgba(0, 122, 255, 0.3)" },
    dark: { primary: "#0A84FF", ring: "rgba(10, 132, 255, 0.3)" },
  },
  sky: {
    label: "天蓝",
    light: { primary: "#0ea5e9", ring: "rgba(14, 165, 233, 0.3)" },
    dark: { primary: "#38bdf8", ring: "rgba(56, 189, 248, 0.3)" },
  },
  emerald: {
    label: "翠绿",
    light: { primary: "#10b981", ring: "rgba(16, 185, 129, 0.3)" },
    dark: { primary: "#34d399", ring: "rgba(52, 211, 153, 0.3)" },
  },
  rose: {
    label: "玫瑰",
    light: { primary: "#f43f5e", ring: "rgba(244, 63, 94, 0.3)" },
    dark: { primary: "#fb7185", ring: "rgba(251, 113, 133, 0.3)" },
  },
  amber: {
    label: "琥珀",
    light: { primary: "#f59e0b", ring: "rgba(245, 158, 11, 0.3)" },
    dark: { primary: "#fbbf24", ring: "rgba(251, 191, 36, 0.3)" },
  },
  slate: {
    label: "岩黑",
    light: { primary: "#334155", ring: "rgba(51, 65, 85, 0.3)" },
    dark: { primary: "#cbd5e1", ring: "rgba(203, 213, 225, 0.3)" },
  },
}

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  accentColor: "indigo",
  setAccentColor: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
