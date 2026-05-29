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
    light: { primary: "#0ea5e9", ring: "#0ea5e9" },
    dark: { primary: "#38bdf8", ring: "#38bdf8" },
  },
  emerald: {
    label: "翠绿",
    light: { primary: "#10b981", ring: "#10b981" },
    dark: { primary: "#34d399", ring: "#34d399" },
  },
  rose: {
    label: "玫瑰",
    light: { primary: "#f43f5e", ring: "#f43f5e" },
    dark: { primary: "#fb7185", ring: "#fb7185" },
  },
  amber: {
    label: "琥珀",
    light: { primary: "#f59e0b", ring: "#f59e0b" },
    dark: { primary: "#fbbf24", ring: "#fbbf24" },
  },
  slate: {
    label: "岩黑",
    light: { primary: "#1e293b", ring: "#1e293b" },
    dark: { primary: "#94a3b8", ring: "#94a3b8" },
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
