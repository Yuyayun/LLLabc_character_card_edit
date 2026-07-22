import { createHashRouter, Outlet, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { FontProvider } from "@/components/layout/FontProvider"
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

function AppShell() {
  return (
    <ThemeProvider>
      <FontProvider>
        <ErrorBoundary>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </ErrorBoundary>
      </FontProvider>
    </ThemeProvider>
  )
}

const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/editor/:id", element: <Editor /> },
      { path: "/editor/new", element: <Editor /> },
      { path: "/worldbooks", element: <WorldBooks /> },
      { path: "/worldbook/:id", element: <WorldBookEditor /> },
      { path: "/chat", element: <Chat /> },
      { path: "/settings", element: <Settings /> },
      { path: "/presets", element: <Presets /> },
      { path: "/preset/:id", element: <PresetEditor /> },
      { path: "/preset/new", element: <PresetEditor /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
