import { Link, useLocation } from "react-router-dom"
import { useTheme } from "./ThemeProvider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Settings, MessageSquareText, SlidersHorizontal, Home, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { isPresetUnlocked } from "@/lib/lockKey"

const navItems = [
  { path: "/", label: "首页", icon: Home },
  { path: "/worldbooks", label: "世界书", icon: BookOpen },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [showPresets, setShowPresets] = useState(false)

  useEffect(() => {
    isPresetUnlocked().then(setShowPresets)
  }, [location.pathname])

  const isPresetActive = location.pathname === "/presets" || location.pathname.startsWith("/preset")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              to="/"
              className="font-bold text-sm sm:text-lg text-primary tracking-tight shrink-0"
            >
              CCE
            </Link>
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const active = location.pathname === item.path
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-9 w-9 sm:w-auto sm:px-2.5",
                        active && "font-medium"
                      )}
                      title={item.label}
                    >
                      <item.icon className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
              {showPresets && (
                <Link to="/presets">
                  <Button
                    variant={isPresetActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-9 w-9 sm:w-auto sm:px-2.5",
                      isPresetActive && "font-medium"
                    )}
                    title="预设"
                  >
                    <SlidersHorizontal className="h-4 w-4 sm:hidden" />
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                    <span className="hidden sm:inline">预设</span>
                  </Button>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link to="/chat" title="AI 对话">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MessageSquareText className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/settings" title="设置">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === "dark" ? "切换浅色" : "切换深色"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
