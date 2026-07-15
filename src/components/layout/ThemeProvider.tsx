import { useEffect, useState } from "react"
import {
  ThemeContext,
  accentDefs,
  type AccentColor,
  type Theme,
} from "./theme-context"

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
