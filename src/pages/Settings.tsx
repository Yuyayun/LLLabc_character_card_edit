import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useTheme, type AccentColor, accentDefs } from "@/components/layout/ThemeProvider"
import { Sun, Moon, PaintBucket } from "lucide-react"
import { cn } from "@/lib/utils"

const accentKeys = Object.keys(accentDefs) as AccentColor[]

type Section = "appearance" | "api" | "presets"

const sections: { id: Section; label: string }[] = [
  { id: "appearance", label: "界面" },
  { id: "api", label: "API" },
  { id: "presets", label: "预设" },
]

export function Settings() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme()
  const [section, setSection] = useState<Section>("appearance")

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* 分段按钮导航 */}
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mr-2">设置</h1>
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "px-2.5 py-1 text-xs sm:text-sm rounded-sm transition-colors whitespace-nowrap",
                section === s.id
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 界面风格 */}
      {section === "appearance" && (
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <PaintBucket className="h-4 w-4 shrink-0" />
                亮暗模式
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {theme === "dark"
                  ? <Moon className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                  : <Sun className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {theme === "dark" ? "深色模式" : "浅色模式"}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">点击切换亮暗主题</p>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="shrink-0" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">强调色</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                选择界面主色调，影响按钮、焦点环、导航激活等元素
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {accentKeys.map((key) => {
                  const def = accentDefs[key]
                  const swatchColor = theme === "dark" ? def.dark.primary : def.light.primary
                  const isActive = accentColor === key
                  return (
                    <button
                      key={key}
                      onClick={() => setAccentColor(key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all",
                        isActive
                          ? "border-primary shadow-sm"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                      title={def.label}
                    >
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span className={cn(
                        "text-[10px] sm:text-xs",
                        isActive ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {def.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API 配置 */}
      {section === "api" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">API 配置</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-muted-foreground">
              AI 对话功能将在后续版本中提供。此处将配置 AI 接口连接信息。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 预设管理 */}
      {section === "presets" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">预设管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-muted-foreground">
              预设管理功能将在后续版本中提供。此处将管理 AI 生成预设模板。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
