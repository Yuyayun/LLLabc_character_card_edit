import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { db } from "@/lib/db"
import type { Preset, PresetPrompt, PresetPromptOrder } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, Download, Upload } from "lucide-react"
import { toast } from "sonner"
import { createDefaultPreset } from "@/lib/helpers"
import { exportPresetJSON, parsePresetJSON } from "@/lib/parser"
import { PresetSamplerParams } from "@/components/preset/PresetSamplerParams"
import { PresetFormatTemplates } from "@/components/preset/PresetFormatTemplates"
import { PresetPromptList } from "@/components/preset/PresetPromptList"
import { PresetPromptPool } from "@/components/preset/PresetPromptPool"
import { PresetPromptEditor } from "@/components/preset/PresetPromptEditor"
import { PresetToolbar } from "@/components/preset/PresetToolbar"

export function PresetEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === "new" || !id

  const [preset, setPreset] = useState<Preset | null>(null)
  const [loading, setLoading] = useState(true)

  // prompt 管理状态
  const [promptTab, setPromptTab] = useState<"linked" | "pool">("linked")
  const [search, setSearch] = useState("")
  const [editingPrompt, setEditingPrompt] = useState<PresetPrompt | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [order, setOrder] = useState<PresetPromptOrder[]>([])

  // 从 prompts + prompt_order 初始化列表顺序
  function buildOrder(p: Preset): PresetPromptOrder[] {
    const raw = p.extensions?.prompt_order
    // 酒馆格式: [{ character_id: number, order: [{identifier, enabled}] }]
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0] as Record<string, unknown>
      if (first.order && Array.isArray(first.order)) {
        return first.order as PresetPromptOrder[]
      }
      // 也可能是平铺格式 [{identifier, enabled}]
      if (first.identifier) {
        return raw as unknown as PresetPromptOrder[]
      }
    }
    // fallback: 从 prompts 数组生成
    return p.prompts
      .filter((pp) => pp.identifier)
      .sort((a, b) => a.injection_order - b.injection_order)
      .map((pp) => ({ identifier: pp.identifier, enabled: pp.enabled }))
  }

  useEffect(() => {
    if (isNew) {
      setPreset(createDefaultPreset())
      setOrder([])
      setLoading(false)
      return
    }
    db.presets
      .get(id!)
      .then((p) => {
        if (p) {
          setPreset(p)
          setOrder(buildOrder(p))
        } else {
          toast.error("预设不存在")
          navigate("/presets")
        }
        setLoading(false)
      })
  }, [id, isNew, navigate])

  function handleChange(changed: Preset) {
    setPreset(changed)
  }

  async function handleSave() {
    if (!preset) return
    const toSave: Preset = {
      ...preset,
      extensions: {
        ...(preset.extensions ?? {}),
        prompt_order: order,
      },
      updated_at: new Date(),
    }
    try {
      await db.presets.put(toSave)
      toast.success("已保存")
      if (isNew && toSave.id) {
        navigate(`/preset/${toSave.id}`, { replace: true })
      }
    } catch {
      toast.error("保存失败")
    }
  }

  function handleExport() {
    if (!preset) return
    try {
      exportPresetJSON(preset)
      toast.success("已导出")
    } catch {
      toast.error("导出失败")
    }
  }

  async function handleImport(file: File) {
    try {
      const imported = await parsePresetJSON(file)
      // 合并 prompt 池
      const existingIds = new Set(preset?.prompts.map((p) => p.identifier) ?? [])
      const newPrompts = (imported.prompts ?? []).filter(
        (p) => !existingIds.has(p.identifier)
      )
      if (preset) {
        handleChange({ ...preset, prompts: [...preset.prompts, ...newPrompts] })
      }
      toast.success(`已导入 ${newPrompts.length} 条提示词`)
    } catch {
      toast.error("导入失败")
    }
  }

  // === Prompt 操作 ===

  function handleNewPrompt() {
    setEditingPrompt(null)
    setEditorOpen(true)
  }

  function handleEditPrompt(prompt: PresetPrompt) {
    setEditingPrompt(prompt)
    setEditorOpen(true)
  }

  function handleSavePrompt(prompt: PresetPrompt) {
    if (!preset) return
    const idx = preset.prompts.findIndex((p) => p.identifier === prompt.identifier)
    if (idx >= 0) {
      const updated = [...preset.prompts]
      updated[idx] = prompt
      handleChange({ ...preset, prompts: updated })
    } else {
      handleChange({ ...preset, prompts: [...preset.prompts, prompt] })
    }
    setEditorOpen(false)
  }

  function handleInsertFromPool(identifier: string) {
    const exists = order.find((o) => o.identifier === identifier)
    if (exists) {
      toast("该条目已在列表中")
      return
    }
    setOrder([...order, { identifier, enabled: true }])
  }

  function handleTogglePrompt(identifier: string) {
    setOrder(
      order.map((o) =>
        o.identifier === identifier ? { ...o, enabled: !o.enabled } : o
      )
    )
  }

  function handleRemoveFromList(identifier: string) {
    setOrder(order.filter((o) => o.identifier !== identifier))
  }

  function handleDeletePoolPrompt(identifier: string) {
    if (!preset) return
    if (!confirm("确认从池中删除此条目？将同时从列表中移除。")) return
    handleChange({
      ...preset,
      prompts: preset.prompts.filter((p) => p.identifier !== identifier),
    })
    setOrder(order.filter((o) => o.identifier !== identifier))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载中...
      </div>
    )
  }

  if (!preset) return null

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* 顶栏 */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate("/presets")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={preset.name}
            onChange={(e) => handleChange({ ...preset, name: e.target.value })}
            placeholder="预设名称"
            className="text-lg sm:text-xl font-bold border-none px-0 h-auto max-w-[300px]"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {preset.prompts.length} 条提示词
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button onClick={handleSave} size="sm" className="h-8 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />
            导出
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
      </header>

      {/* 采样参数 */}
      <PresetSamplerParams preset={preset} onChange={handleChange} />

      {/* 格式化模板 */}
      <PresetFormatTemplates preset={preset} onChange={handleChange} />

      {/* 提示词管理 */}
      <div className="space-y-3">
        {/* 标签切换 */}
        <div className="flex items-center bg-muted/50 rounded-md p-0.5 w-fit">
          <button
            onClick={() => setPromptTab("linked")}
            className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
              promptTab === "linked"
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            已链接 ({order.length})
          </button>
          <button
            onClick={() => setPromptTab("pool")}
            className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
              promptTab === "pool"
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            全部池 ({preset.prompts.length})
          </button>
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索提示词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs max-w-sm"
        />

        {/* 工具栏 */}
        <PresetToolbar
          poolPrompts={preset.prompts}
          orderIdentifiers={order.map((o) => o.identifier)}
          onInsertFromPool={handleInsertFromPool}
          onNewPrompt={handleNewPrompt}
          selectedIds={selectedIds}
        />

        {/* 列表/池视图 */}
        {promptTab === "linked" ? (
          <PresetPromptList
            order={order}
            prompts={preset.prompts}
            selectedIds={selectedIds}
            onReorder={setOrder}
            onToggleEnabled={handleTogglePrompt}
            onEdit={handleEditPrompt}
            onRemove={handleRemoveFromList}
            onToggleSelect={(id) => {
              const next = new Set(selectedIds)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              setSelectedIds(next)
            }}
            search={search}
          />
        ) : (
          <PresetPromptPool
            prompts={preset.prompts}
            linkedIdentifiers={new Set(order.map((o) => o.identifier))}
            onAddToLinked={handleInsertFromPool}
            onEdit={handleEditPrompt}
            onDelete={handleDeletePoolPrompt}
            search={search}
          />
        )}
      </div>

      {/* Prompt 编辑对话框 */}
      <PresetPromptEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        prompt={editingPrompt}
        onSave={handleSavePrompt}
      />
    </div>
  )
}
