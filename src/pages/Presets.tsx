import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { db } from "@/lib/db"
import type { Preset } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, Search, SlidersHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createDefaultPreset } from "@/lib/helpers"
import { parsePresetJSON } from "@/lib/parser"

export function Presets() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<Preset[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  function loadPresets() {
    setLoading(true)
    db.presets
      .orderBy("updated_at")
      .reverse()
      .toArray()
      .then(setPresets)
      .catch(() => toast.error("加载预设列表失败"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPresets()
  }, [])

  async function handleCreate() {
    try {
      const preset = createDefaultPreset()
      preset.name = "未命名预设"
      await db.presets.put(preset)
      toast.success("已创建预设")
      navigate(`/preset/${preset.id}`)
    } catch {
      toast.error("创建预设失败")
    }
  }

  async function handleImport(file: File) {
    try {
      const preset = await parsePresetJSON(file)
      await db.presets.put(preset)
      toast.success(`已导入：${preset.name || "未命名预设"}`)
      loadPresets()
    } catch (e) {
      toast.error("导入失败：" + (e instanceof Error ? e.message : "文件格式不正确"))
    }
  }

  async function handleDelete(preset: Preset) {
    if (!confirm(`确认删除预设"${preset.name}"？`)) return
    try {
      await db.presets.delete(preset.id)
      toast.success("已删除")
      loadPresets()
    } catch {
      toast.error("删除失败")
    }
  }

  const filtered = presets.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
          预设
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleCreate} size="sm" className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建
          </Button>
          <label className="cursor-pointer inline-flex items-center gap-1.5 h-8 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] border border-border bg-background hover:bg-muted hover:text-foreground whitespace-nowrap transition-all select-none">
            <Upload className="h-3.5 w-3.5" />
            导入
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
                e.target.value = ""
              }}
            />
          </label>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索预设..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs pl-9"
        />
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
          加载中...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <SlidersHorizontal className="h-10 w-10 opacity-20 mb-3" />
          <p className="text-sm">
            {search ? "没有匹配的预设" : "暂无预设，点击「新建」或「导入」"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((preset) => (
            <Card
              key={preset.id}
              className="group cursor-pointer transition-all relative"
              onClick={() => navigate(`/preset/${preset.id}`)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-xs sm:text-sm font-medium truncate">
                    {preset.name || "未命名预设"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {preset.prompts?.length ?? 0} 条提示词
                  </p>
                </div>
              </CardContent>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(preset)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
