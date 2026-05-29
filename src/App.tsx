import { HashRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { AppLayout } from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { Dashboard } from "@/pages/Dashboard"
import { Editor } from "@/pages/Editor"
import { Chat } from "@/pages/Chat"
import { WorldBooks } from "@/pages/WorldBooks"
import { WorldBookEditor } from "@/pages/WorldBookEditor"
import { Settings } from "@/pages/Settings"

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
          </Routes>
        </AppLayout>
        </ErrorBoundary>
      </ThemeProvider>
    </HashRouter>
  )
}
