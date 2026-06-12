import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

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
  setAccentColor: (c: AccentColor) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  accentColor: "indigo",
  setAccentColor: () => {},
})

function applyAccent(accent: AccentColor, isDark: boolean) {
  const def = accentDefs[accent]
  const colors = isDark ? def.dark : def.light
  const root = document.documentElement
  root.style.setProperty("--primary", colors.primary)
  root.style.setProperty("--ring", colors.ring)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "light" || saved === "dark") return saved
    return "dark"
  })

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const saved = localStorage.getItem("accentColor")
    if (saved && saved in accentDefs) return saved as AccentColor
    return "indigo"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
    applyAccent(accentColor, theme === "dark")
  }, [theme, accentColor])

  useEffect(() => {
    localStorage.setItem("accentColor", accentColor)
  }, [accentColor])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
