import { useState, useEffect, useRef, useCallback } from "react"
import type { CharacterCard, Memo } from "@/types"
import { db } from "@/lib/db"
import { createDefaultMemo } from "@/lib/helpers"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  card: CharacterCard
  onChange: () => void
}

type ViewMode = "cards" | "timeline"

const SESSION_TIMEOUT = 60_000 // 1 分钟无输入视为编辑会话结束

function formatDate(d: Date | number): string {
  const date = d instanceof Date ? d : new Date(d)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateStr = date.toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (dateStr === todayStr) return "今天"
  if (dateStr === yesterdayStr) return "昨天"
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatTime(d: Date | number): string {
  const date = d instanceof Date ? d : new Date(d)
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function formatDateTime(d: Date | number): string {
  return `${formatDate(d)} ${formatTime(d)}`
}

export function EditorMemos({ card, onChange }: Props) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [view, setView] = useState<ViewMode>("cards")
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const sessionStarts = useRef<Map<string, number>>(new Map())
  const sessionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
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

  // 组件卸载时清理所有 session 定时器
  useEffect(() => {
    return () => {
      sessionTimers.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  useEffect(() => {
    if (newTextareaRef.current) {
      newTextareaRef.current.focus()
      newTextareaRef.current = null
    }
  }, [memos.length])

  function finishSession(memo: Memo, startTime: number) {
    const endTime = Date.now()
    const session = { start: startTime, end: endTime }
    const updated: Memo = {
      ...memo,
      updated_at: new Date(),
      edit_sessions: [...(memo.edit_sessions ?? []), session],
    }
    db.memos.put(updated).then(() => onChange())
    sessionStarts.current.delete(memo.id)
    sessionTimers.current.delete(memo.id)
    // 同步更新本地状态
    setMemos((prev) =>
      prev.map((m) => (m.id === memo.id ? updated : m))
    )
  }

  function saveContent(memo: Memo) {
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
    const now = Date.now()
    const memo = memos.find((m) => m.id === id)
    if (!memo) return

    // 首次填写不记编辑记录（内容为空且无历史编辑）
    const isFirstFill = !memo.content && (memo.edit_sessions?.length ?? 0) === 0

    // 即时更新本地内容
    setMemos((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content, updated_at: new Date() } : m
      )
    )

    // 延迟保存内容
    saveContent({ ...memo, content, updated_at: new Date() })

    // 首次填写跳过会话追踪
    if (isFirstFill) return

    // 如果没有进行中的编辑会话，开启一个
    if (!sessionStarts.current.has(id)) {
      sessionStarts.current.set(id, now)
    }

    // 重置 1 分钟倒计时
    const existingSessionTimer = sessionTimers.current.get(id)
    if (existingSessionTimer) clearTimeout(existingSessionTimer)
    const sessionTimer = setTimeout(() => {
      const startTime = sessionStarts.current.get(id)
      if (startTime == null) return
      // 取当前最新 memo 数据用于 finishSession
      setMemos((prev) => {
        const latest = prev.find((m) => m.id === id)
        if (latest && startTime != null) finishSession(latest, startTime)
        return prev
      })
    }, SESSION_TIMEOUT)
    sessionTimers.current.set(id, sessionTimer)
  }

  function removeMemo(id: string) {
    // 清理相关定时器
    const st = sessionTimers.current.get(id)
    if (st) clearTimeout(st)
    sessionTimers.current.delete(id)
    sessionStarts.current.delete(id)
    const sv = saveTimers.current.get(id)
    if (sv) clearTimeout(sv)
    saveTimers.current.delete(id)

    db.memos.delete(id).then(() => {
      onChange()
      loadMemos()
    })
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  /** 将 fromIndex 的备忘移动到 toIndex，重新分配 sort_order */
  function reorderMemo(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= memos.length) return
    if (toIndex < 0 || toIndex >= memos.length) return

    const updated = [...memos]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)

    // 将现有 sort_order 值从大到小排序后重新分配给新顺序
    const sortedOrders = [...memos].map((m) => m.sort_order).sort((a, b) => b - a)
    updated.forEach((memo, i) => {
      memo.sort_order = sortedOrders[i]
    })

    setMemos(updated)
    db.memos.bulkPut(updated).then(() => onChange())
  }

  function moveMemo(index: number, direction: -1 | 1) {
    reorderMemo(index, index + direction)
  }

  // ──── 拖拽处理 ────

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
    // 让拖拽时的幽灵图半透明
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4"
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderMemo(dragIndex, toIndex)
    }
    setDragIndex(null)
    setDragOverIndex(null)
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
              className={cn(
                "border rounded-lg bg-card transition-all",
                dragOverIndex === index && "border-primary border-dashed ring-2 ring-primary/20",
                dragIndex === index && "opacity-40"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 rounded-t-lg">
                <div className="flex items-center gap-1">
                  <span
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                    title="拖拽排序"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    创建于 {formatDateTime(new Date(memo.created_at))}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMemo(index, -1)}
                    disabled={index === 0}
                    title="上移"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMemo(index, 1)}
                    disabled={index === memos.length - 1}
                    title="下移"
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
                {(memo.edit_sessions?.length ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground shrink-0">编辑记录：</span>
                    {memo.edit_sessions!.map((s) => (
                      <span
                        key={s.start}
                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground"
                      >
                        {formatTime(s.start)}~{formatTime(s.end)}
                      </span>
                    ))}
                  </div>
                )}
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm whitespace-pre-wrap leading-5">
                          {memo.content || (
                            <span className="text-muted-foreground italic">空内容</span>
                          )}
                        </p>
                        {(memo.edit_sessions?.length ?? 0) > 0 && (
                          <div className="mt-1.5 text-[10px] text-muted-foreground">
                            编辑于{" "}
                            {memo.edit_sessions!
                              .map((s) => `${formatTime(s.start)}~${formatTime(s.end)}`)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
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
