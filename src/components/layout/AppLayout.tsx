import { Link, useLocation } from "react-router-dom"
import { useTheme } from "./ThemeProvider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Settings, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { path: "/", label: "首页" },
  { path: "/worldbooks", label: "世界书" },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-lg text-primary tracking-tight">
              CharCard Editor
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={
                      location.pathname === item.path ? "secondary" : "ghost"
                    }
                    size="sm"
                    className={cn(
                      location.pathname === item.path && "font-medium"
                    )}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
