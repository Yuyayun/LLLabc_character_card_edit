import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { db } from "@/lib/db"
import type { CharacterCard } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft, Save, FileJson, Image,
  User, FileText, MessageSquare, BookOpen, Braces, Layers, StickyNote,
  PanelLeftClose, PanelLeft,
} from "lucide-react"
import { toast } from "sonner"
import { exportJSON, exportPNG } from "@/lib/parser"
import { scheduleSilentUpload } from "@/lib/cloudSync"
import { EditorBasic } from "@/components/editor/EditorBasic"
import { EditorDefinition } from "@/components/editor/EditorDefinition"
import { EditorGreetings } from "@/components/editor/EditorGreetings"
import { EditorWorldBook } from "@/components/editor/EditorWorldBook"
import { EditorRegex } from "@/components/editor/EditorRegex"
import { EditorDepth } from "@/components/editor/EditorDepth"
import { EditorMemos } from "@/components/editor/EditorMemos"
import { createDefaultCard } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  createEditorSnapshot,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges"

type Section = "basic" | "definition" | "greetings" | "worldbook" | "regex" | "depth" | "memos"

const navSections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "基本信息", icon: User },
  { id: "definition", label: "角色定义", icon: FileText },
  { id: "greetings", label: "开场白", icon: MessageSquare },
  { id: "worldbook", label: "世界书", icon: BookOpen },
  { id: "regex", label: "Regex", icon: Braces },
  { id: "depth", label: "深度提示", icon: Layers },
  { id: "memos", label: "灵感笔记", icon: StickyNote },
]

export function Editor() {
  const { id } = useParams<{ id: string }>()
  return <EditorContent key={id ?? "new"} id={id} />
}

function EditorContent({ id }: { id?: string }) {
  const navigate = useNavigate()
  const isNew = id === "new" || !id
  const [initialCard] = useState<CharacterCard | null>(() =>
    isNew ? createDefaultCard() : null
  )
  const [card, setCard] = useState<CharacterCard | null>(initialCard)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(() =>
    initialCard ? createEditorSnapshot(initialCard) : null
  )
  const [memoSavePending, setMemoSavePending] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [section, setSection] = useState<Section>("basic")
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)

  const cardIsDirty = Boolean(
    card && savedSnapshot && createEditorSnapshot(card) !== savedSnapshot
  )
  const unsavedChanges = useUnsavedChanges(cardIsDirty || memoSavePending)

  function handleChange(changed: CharacterCard) {
    setCard(changed)
  }

  useEffect(() => {
    if (isNew) return

    let active = true
    db.characterCards
      .get(id!)
      .then((c) => {
        if (!active) return
        if (c) {
          setCard(c)
          setSavedSnapshot(createEditorSnapshot(c))
        } else {
          toast.error("角色卡不存在")
          navigate("/")
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, isNew, navigate])

  async function handleSave() {
    if (!card) return
    const now = new Date()
    const toSave: CharacterCard = {
      ...card,
      updated_at: now,
    }
    if (isNew) {
      toSave.created_at = now
    }
    try {
      await db.characterCards.put(toSave)
      setCard(toSave)
      setSavedSnapshot(createEditorSnapshot(toSave))
      unsavedChanges.markClean()
      scheduleSilentUpload()
      toast.success("已保存")
      if (isNew && toSave.id) {
        navigate(`/editor/${toSave.id}`, { replace: true })
      }
    } catch {
      toast.error("保存失败，请检查存储空间")
    }
  }

  async function handleExportJSON() {
    if (!card) return
    try {
      await exportJSON(card)
      toast.success("JSON 已导出")
    } catch {
      toast.error("导出失败")
    }
  }

  async function handleExportPNG() {
    if (!card) return
    if (!card.card_image) {
      toast.error("需要先导入卡面图片才能导出 PNG")
      return
    }
    try {
      await exportPNG(card)
      toast.success("PNG 已导出")
    } catch {
      toast.error("导出失败")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载中...
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* 顶栏 */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 basis-full sm:basis-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] flex-1 sm:min-w-0">
            <Input
              value={card.name}
              onChange={(e) => handleChange({ ...card, name: e.target.value })}
              placeholder="角色名"
              className="w-full text-sm font-semibold border-none px-0 h-auto sm:max-w-[200px]"
            />
            {card.character_version && (
              <p className="text-[10px] text-muted-foreground">{card.character_version}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <Button onClick={handleSave} size="sm" className="h-9 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExportJSON}>
            <FileJson className="h-3.5 w-3.5 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExportPNG}>
            <Image className="h-3.5 w-3.5 mr-1" />
            PNG
          </Button>
        </div>
      </header>

      {/* 主体：侧边栏 + 内容 */}
      <div className="flex flex-1 min-h-0">
        {/* 侧边导航 */}
        <nav className={cn(
          "shrink-0 border-r bg-muted/30 flex flex-col py-2 gap-0.5 transition-all duration-200 overflow-hidden",
          sidebarOpen ? "w-[120px]" : "w-0 border-r-0"
        )}>
          {navSections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors mx-1 rounded-sm whitespace-nowrap",
                section === item.id
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* 侧边栏切换按钮 + 编辑区域 */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="px-2 pt-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            {section === "basic" && <EditorBasic card={card} onChange={handleChange} />}
            {section === "definition" && <EditorDefinition card={card} onChange={handleChange} />}
            {section === "greetings" && <EditorGreetings card={card} onChange={handleChange} />}
            {section === "worldbook" && <EditorWorldBook card={card} onChange={handleChange} />}
            {section === "regex" && <EditorRegex card={card} onChange={handleChange} />}
            {section === "depth" && <EditorDepth card={card} onChange={handleChange} />}
            {section === "memos" && (
              <EditorMemos card={card} onPendingChange={setMemoSavePending} />
            )}
          </div>
        </ScrollArea>
      </div>
      </div>
      {unsavedChanges.dialog}
    </div>
  )
}
