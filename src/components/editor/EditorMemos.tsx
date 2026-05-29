import { useState, useEffect, useRef, useCallback } from "react"
import type { CharacterCard, Memo } from "@/types"
import { db } from "@/lib/db"
import { createDefaultMemo } from "@/lib/helpers"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  card: CharacterCard
  onChange: () => void
}

type ViewMode = "cards" | "timeline"

function formatDate(d: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateStr = d.toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (dateStr === todayStr) return "今天"
  if (dateStr === yesterdayStr) return "昨天"
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function EditorMemos({ card, onChange }: Props) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [view, setView] = useState<ViewMode>("cards")
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const newTextareaRef = useRef<HTMLTextAreaElement>(null)

  const loadMemos = useCallback(() => {
    db.memos
      .where("character_id")
      .equals(card.id)
      .reverse()
      .sortBy("sort_order")
      .then((data) => {
        setMemos(data)
        setLoading(false)
      })
  }, [card.id])

  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  useEffect(() => {
    if (newTextareaRef.current) {
      newTextareaRef.current.focus()
      newTextareaRef.current = null
    }
  }, [memos.length])

  function scheduleSave(memo: Memo) {
    const existing = saveTimers.current.get(memo.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      db.memos.put({ ...memo, updated_at: new Date() })
      saveTimers.current.delete(memo.id)
    }, 300)
    saveTimers.current.set(memo.id, timer)
  }

  function addMemo() {
    const memo = createDefaultMemo(card.id)
    db.memos.put(memo).then(() => {
      onChange()
      loadMemos()
    })
  }

  function updateContent(id: string, content: string) {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    )
    const memo = memos.find((m) => m.id === id)
    if (memo) scheduleSave({ ...memo, content })
  }

  function removeMemo(id: string) {
    db.memos.delete(id).then(() => {
      onChange()
      loadMemos()
    })
  }

  function moveMemo(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= memos.length) return
    const updated = [...memos]
    const a = updated[index]
    const b = updated[newIndex]
    const aOrder = a.sort_order
    const bOrder = b.sort_order
    a.sort_order = bOrder
    b.sort_order = aOrder
    updated[index] = b
    updated[newIndex] = a
    setMemos(updated)
    db.memos.bulkPut([a, b]).then(() => onChange())
  }

  function groupByDate(memoList: Memo[]): Map<string, Memo[]> {
    const groups = new Map<string, Memo[]>()
    for (const m of memoList) {
      const label = formatDate(new Date(m.created_at))
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label)!.push(m)
    }
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 顶栏：视图切换 + 新建 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          <button
            onClick={() => setView("cards")}
            className={cn(
              "px-3 py-1 text-xs rounded-sm transition-colors",
              view === "cards"
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            灵感卡片
          </button>
          <button
            onClick={() => setView("timeline")}
            className={cn(
              "px-3 py-1 text-xs rounded-sm transition-colors",
              view === "timeline"
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            时间轴
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={addMemo}>
          <Plus className="h-4 w-4 mr-1" />
          新建笔记
        </Button>
      </div>

      {/* 空状态 */}
      {memos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          暂无灵感笔记，点击「新建笔记」开始记录
        </div>
      ) : view === "cards" ? (
        /* ────────── 灵感卡片视图 ────────── */
        <div className="space-y-3">
          {memos.map((memo, index) => (
            <section
              key={memo.id}
              className="border rounded-lg bg-card"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 rounded-t-lg">
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(new Date(memo.created_at))} {formatTime(new Date(memo.created_at))}
                  {memo.updated_at > memo.created_at && (
                    <span className="ml-1">（已编辑）</span>
                  )}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMemo(index, -1)}
                    disabled={index === memos.length - 1}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMemo(index, 1)}
                    disabled={index === 0}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("确认删除这条灵感笔记？")) removeMemo(memo.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <Textarea
                  value={memo.content}
                  onChange={(e) => updateContent(memo.id, e.target.value)}
                  placeholder="写下你的灵感..."
                  className="font-sans text-sm leading-relaxed min-h-[80px] resize-y border-none shadow-none bg-transparent px-0 py-0"
                />
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* ────────── 时间轴视图 ────────── */
        <div className="space-y-6">
          {(() => {
            const groups = groupByDate(
              [...memos].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
            )
            return Array.from(groups.entries()).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <h3 className="text-sm font-semibold mb-3 pb-1.5 border-b sticky top-0 bg-background">
                  {dateLabel}
                </h3>
                <div className="space-y-3">
                  {items.map((memo) => (
                    <div
                      key={memo.id}
                      className="flex gap-3 pl-1 border-l-2 border-muted ml-2"
                    >
                      <span className="text-[10px] text-muted-foreground shrink-0 w-10 text-right leading-5">
                        {formatTime(new Date(memo.created_at))}
                      </span>
                      <p className="text-sm whitespace-pre-wrap leading-5">
                        {memo.content || (
                          <span className="text-muted-foreground italic">空内容</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
