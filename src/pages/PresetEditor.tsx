import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { db } from "@/lib/db"
import type { Preset, PresetPrompt, PresetPromptOrder } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Save, Download, Upload,
  PanelLeftClose, PanelLeft,
  SlidersHorizontal, MessageSquareText,
  ArrowRightToLine, Braces, Copy, FileText,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createDefaultPreset } from "@/lib/helpers"
import { exportPresetJSON, parsePresetJSON } from "@/lib/parser"
import { PresetSamplerParams } from "@/components/preset/PresetSamplerParams"
import { PresetFormatTemplates } from "@/components/preset/PresetFormatTemplates"
import { PresetPromptList } from "@/components/preset/PresetPromptList"
import { PresetPromptPool } from "@/components/preset/PresetPromptPool"
import { PresetPromptEditor } from "@/components/preset/PresetPromptEditor"
import { PresetToolbar } from "@/components/preset/PresetToolbar"
import { PresetRegex } from "@/components/preset/PresetRegex"
import { PresetCopyDialog } from "@/components/preset/PresetCopyDialog"
import type { RegexScript } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PresetEditor() {
  const { id } = useParams<{ id: string }>()
  return <PresetEditorContent key={id ?? "new"} id={id} />
}

function PresetEditorContent({ id }: { id?: string }) {
  const navigate = useNavigate()
  const isNew = id === "new" || !id

  const [preset, setPreset] = useState<Preset | null>(() =>
    isNew ? createDefaultPreset() : null
  )
  const [loading, setLoading] = useState(!isNew)

  // 侧边栏
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)

  // prompt 管理状态
  const [promptTab, setPromptTab] = useState<"linked" | "pool">("linked")
  const [search, setSearch] = useState("")
  const [editingPrompt, setEditingPrompt] = useState<PresetPrompt | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [order, setOrder] = useState<PresetPromptOrder[]>([])

  // 移动到 Dialog 状态
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveSearch, setMoveSearch] = useState("")
  const [moveSelectedId, setMoveSelectedId] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)

  // 从 prompts + prompt_order 初始化列表顺序
  function buildOrder(p: Preset): PresetPromptOrder[] {
    const raw = p.extensions?.prompt_order
    if (Array.isArray(raw) && raw.length > 0) {
      const preferred = raw.find(
        (e) => (e as Record<string, unknown>).character_id !== 100000
      )
      const target = (preferred ?? raw[0]) as Record<string, unknown>
      if (Array.isArray(target.order) && target.order.length > 0) {
        return target.order as PresetPromptOrder[]
      }
      if (target.identifier !== undefined) {
        return raw as unknown as PresetPromptOrder[]
      }
    }
    return p.prompts
      .filter((pp) => pp.identifier)
      .sort((a, b) => a.injection_order - b.injection_order)
      .map((pp) => ({ identifier: pp.identifier, enabled: pp.enabled }))
  }

  useEffect(() => {
    if (isNew) return

    let active = true
    db.presets
      .get(id!)
      .then((p) => {
        if (!active) return
        if (p) {
          setPreset(p)
          setOrder(buildOrder(p))
        } else {
          toast.error("预设不存在")
          navigate("/presets")
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, isNew, navigate])

  function handleChange(changed: Preset) {
    setPreset(changed)
  }

  async function handleSave() {
    if (!preset) return
    const promptOrderWrapped = order.length > 0
      ? [{ character_id: preset.extensions?.preferred_char_id as number ?? 100001, order }]
      : []
    const toSave: Preset = {
      ...preset,
      extensions: {
        ...(preset.extensions ?? {}),
        prompt_order: promptOrderWrapped,
        preferred_char_id: 100001,
      },
      updated_at: new Date(),
    }
    try {
      await db.presets.put(toSave)
      handleChange(toSave)
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

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
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

  // === 移动到指定位置 ===

  function openMoveDialog() {
    setMoveSearch("")
    setMoveSelectedId(null)
    setMoveOpen(true)
  }

  function handleMoveToPosition(targetIndex: number) {
    if (!moveSelectedId) return

    const alreadyLinkedIdx = order.findIndex((o) => o.identifier === moveSelectedId)
    if (alreadyLinkedIdx >= 0) {
      // 已在列表中：移动到新位置
      const updated = [...order]
      const [moved] = updated.splice(alreadyLinkedIdx, 1)
      // 如果目标在原位置之后，splice 后索引偏移
      const insertIdx = alreadyLinkedIdx < targetIndex ? targetIndex - 1 : targetIndex
      updated.splice(insertIdx, 0, moved)
      setOrder(updated)
    } else {
      // 不在列表中：插入到指定位置
      const updated = [...order]
      updated.splice(targetIndex, 0, { identifier: moveSelectedId, enabled: true })
      setOrder(updated)
    }
    setMoveOpen(false)
  }

  function insertAfter<T>(
    items: T[],
    insertItems: T[],
    afterKey: string | null,
    getKey: (item: T) => string
  ): T[] {
    if (insertItems.length === 0) return items
    const updated = [...items]
    if (afterKey === null) {
      updated.splice(0, 0, ...insertItems)
      return updated
    }
    const idx = updated.findIndex((item) => getKey(item) === afterKey)
    if (idx < 0) {
      updated.push(...insertItems)
      return updated
    }
    updated.splice(idx + 1, 0, ...insertItems)
    return updated
  }

  function handleCopyFromPreset(payload: {
    prompts: PresetPrompt[]
    promptInsertAfter: string | null
    regexScripts: RegexScript[]
    regexInsertAfter: string | null
  }) {
    if (!preset) return

    const nextOrderItems = payload.prompts.map((prompt) => ({
      identifier: prompt.identifier,
      enabled: prompt.enabled,
    }))
    const nextOrder = insertAfter(
      order,
      nextOrderItems,
      payload.promptInsertAfter,
      (item) => item.identifier
    )
    const currentRegex =
      ((preset.extensions?.regex_scripts as RegexScript[] | undefined) ?? [])
    const nextRegex = insertAfter(
      currentRegex,
      payload.regexScripts,
      payload.regexInsertAfter,
      (script) => script.id
    )

    handleChange({
      ...preset,
      prompts: [...preset.prompts, ...payload.prompts],
      extensions: {
        ...(preset.extensions ?? {}),
        regex_scripts: nextRegex as unknown as Record<string, unknown>,
      },
    })
    setOrder(nextOrder)
    toast.success(
      `已复制 ${payload.prompts.length} 条提示词、${payload.regexScripts.length} 条正则`
    )
  }

  const promptMap = new Map(preset?.prompts.map((p) => [p.identifier, p]) ?? [])

  // 移动到 Dialog 的过滤池列表
  const movePoolFiltered = (preset?.prompts ?? []).filter((p) => {
    if (!moveSearch) return true
    const lower = moveSearch.toLowerCase()
    return p.name.toLowerCase().includes(lower) || p.content.toLowerCase().includes(lower)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载中...
      </div>
    )
  }

  if (!preset) return null

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* 顶栏 */}
      <header className="flex flex-col gap-2 px-3 py-2.5 border-b shrink-0 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex w-full items-center gap-2 min-w-0 sm:flex-1">
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
            className="min-w-0 flex-1 text-sm font-bold border-none px-0 h-auto sm:max-w-[680px] sm:text-lg"
          />
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {preset.prompts.length} 条提示词
          </span>
        </div>
        <div className="flex w-full items-center gap-1.5 shrink-0 sm:w-auto">
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
            <span className="hidden sm:inline">导入</span>
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

      {/* 手机端分区导航 */}
      <nav className="md:hidden shrink-0 border-b bg-muted/60 overflow-x-auto">
        <div className="flex min-w-max gap-1 p-2">
          <button
            onClick={openMoveDialog}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <ArrowRightToLine className="h-3.5 w-3.5 shrink-0" />
            移动到
          </button>
          <button
            onClick={() => setCopyOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
            复制
          </button>
          <button
            onClick={() => scrollToSection("section-sampler")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            采样
          </button>
          <button
            onClick={() => scrollToSection("section-templates")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            模板
          </button>
          <button
            onClick={() => scrollToSection("section-regex")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <Braces className="h-3.5 w-3.5 shrink-0" />
            Regex
          </button>
          <button
            onClick={() => scrollToSection("section-prompts")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
            提示词
          </button>
        </div>
      </nav>

      {/* 主体：侧边栏 + 内容 */}
      <div className="flex flex-1 min-h-0">
        {/* 侧边栏 */}
        <nav className={cn(
          "hidden shrink-0 border-r bg-muted/60 py-2 gap-0.5 transition-all duration-200 overflow-hidden md:flex md:flex-col",
          sidebarOpen ? "md:w-[90px]" : "w-0 border-r-0"
        )}>
          <button
            onClick={openMoveDialog}
            title="移动到指定位置"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <ArrowRightToLine className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">移动到</span>
          </button>
          <button
            onClick={() => setCopyOpen(true)}
            title="从其他预设复制"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">复制</span>
          </button>

          <hr className="my-1 mx-2 border-border" />

          <button
            onClick={() => scrollToSection("section-sampler")}
            title="采样参数"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">采样</span>
          </button>
          <button
            onClick={() => scrollToSection("section-templates")}
            title="格式模板"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">模板</span>
          </button>
          <button
            onClick={() => scrollToSection("section-regex")}
            title="正则脚本"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <Braces className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Regex</span>
          </button>
          <button
            onClick={() => scrollToSection("section-prompts")}
            title="提示词管理"
            className="flex items-center justify-center sm:justify-start gap-1.5 px-1 sm:px-2.5 py-2 text-xs transition-colors mx-0.5 sm:mx-1 rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-background/50"
          >
            <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">提示词</span>
          </button>

          {/* 折叠按钮 */}
          <div className="mt-auto pt-2 border-t mx-2 border-border">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </nav>

        {/* 内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 侧边栏切换按钮（侧边栏收起时） */}
          {!sidebarOpen && (
            <div className="hidden px-2 pt-1 shrink-0 md:block">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSidebarOpen(true)}
                title="展开侧栏"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl">
            {/* 采样参数 */}
            <div id="section-sampler">
              <PresetSamplerParams preset={preset} onChange={handleChange} />
            </div>

            {/* 格式化模板 */}
            <div id="section-templates">
              <PresetFormatTemplates preset={preset} onChange={handleChange} />
            </div>

            {/* 正则脚本 */}
            <div id="section-regex">
              <PresetRegex
                scripts={(preset.extensions?.regex_scripts as RegexScript[]) ?? []}
                onCopyFromPreset={() => setCopyOpen(true)}
                onChange={(scripts) => {
                  handleChange({
                    ...preset,
                    extensions: {
                      ...(preset.extensions ?? {}),
                      regex_scripts: scripts as unknown as Record<string, unknown>,
                    },
                  })
                }}
              />
            </div>

            {/* 提示词管理 */}
            <div id="section-prompts" className="space-y-3">
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
                onMoveToPosition={openMoveDialog}
                onCopyFromPreset={() => setCopyOpen(true)}
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
          </div>
        </div>
      </div>

      {/* Prompt 编辑对话框 */}
      <PresetPromptEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        prompt={editingPrompt}
        onSave={handleSavePrompt}
      />

      <PresetCopyDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        currentPresetId={preset.id}
        targetPrompts={preset.prompts}
        targetOrder={order}
        targetRegexScripts={(preset.extensions?.regex_scripts as RegexScript[]) ?? []}
        onCopy={handleCopyFromPreset}
      />

      {/* 移动到指定位置 Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">
              移动到指定位置
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* 搜索 */}
            <Input
              placeholder="搜索条目..."
              value={moveSearch}
              onChange={(e) => setMoveSearch(e.target.value)}
              className="h-8 text-xs"
            />

            {/* 池中条目 */}
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                选择要移动的条目：
              </p>
              <div className="max-h-[160px] overflow-y-auto space-y-0.5 border rounded-md p-1">
                {movePoolFiltered.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">无匹配条目</p>
                ) : (
                  movePoolFiltered.map((p) => {
                    const curIdx = order.findIndex((o) => o.identifier === p.identifier)
                    const isLinked = curIdx >= 0
                    return (
                      <button
                        key={p.identifier}
                        onClick={() => setMoveSelectedId(p.identifier)}
                        className={`w-full text-left px-2 py-1.5 rounded-sm text-xs flex items-center justify-between transition-colors ${
                          moveSelectedId === p.identifier
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate">{p.name || "未命名"}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {isLinked ? `已在列表 #${curIdx + 1}` : "未链接"}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* 已链接列表 = 选择目标位置 */}
            {moveSelectedId && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  选择插入位置（将插入到该行之前）：
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-0.5 border rounded-md p-1">
                  {/* 最前面 */}
                  <button
                    onClick={() => handleMoveToPosition(0)}
                    className="w-full text-left px-2 py-1.5 rounded-sm text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    📍 最前面
                  </button>
                  <hr className="my-0.5" />
                  {order.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">列表为空</p>
                  ) : (
                    order.map((o, i) => {
                      const prompt = promptMap.get(o.identifier)
                      return (
                        <button
                          key={o.identifier}
                          onClick={() => handleMoveToPosition(i)}
                          className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors flex items-center gap-2 ${
                            o.identifier === moveSelectedId
                              ? "opacity-50 cursor-default"
                              : "hover:bg-primary/10 hover:text-primary"
                          }`}
                          disabled={o.identifier === moveSelectedId}
                        >
                          <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">
                            {i + 1}.
                          </span>
                          <span className="truncate">
                            {prompt?.name ?? "未命名"}
                          </span>
                        </button>
                      )
                    })
                  )}
                  <hr className="my-0.5" />
                  {/* 最后面 */}
                  <button
                    onClick={() => handleMoveToPosition(order.length)}
                    className="w-full text-left px-2 py-1.5 rounded-sm text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    📍 最后面
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
