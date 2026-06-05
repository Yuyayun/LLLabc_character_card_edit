import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect, type ReactNode } from "react"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { AppLayout } from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { Dashboard } from "@/pages/Dashboard"
import { Editor } from "@/pages/Editor"
import { Chat } from "@/pages/Chat"
import { WorldBooks } from "@/pages/WorldBooks"
import { WorldBookEditor } from "@/pages/WorldBookEditor"
import { Settings } from "@/pages/Settings"
import { Presets } from "@/pages/Presets"
import { PresetEditor } from "@/pages/PresetEditor"
import { isPresetUnlocked } from "@/lib/lockKey"

function PresetRouteGuard({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    isPresetUnlocked().then(setUnlocked)
  }, [])

  if (unlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        检查中...
      </div>
    )
  }
  if (!unlocked) return <Navigate to="/settings" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <ErrorBoundary>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/editor/new" element={<Editor />} />
            <Route path="/worldbooks" element={<WorldBooks />} />
            <Route path="/worldbook/:id" element={<WorldBookEditor />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/presets" element={<PresetRouteGuard><Presets /></PresetRouteGuard>} />
            <Route path="/preset/:id" element={<PresetRouteGuard><PresetEditor /></PresetRouteGuard>} />
            <Route path="/preset/new" element={<PresetRouteGuard><PresetEditor /></PresetRouteGuard>} />
          </Routes>
        </AppLayout>
        </ErrorBoundary>
      </ThemeProvider>
    </HashRouter>
  )
}
