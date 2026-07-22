import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { db } from "@/lib/db"
import type { WorldBook, WorldBookEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { WorldBookNameField } from "@/components/editor/WorldBookNameField"
import { TokenEstimateTotal } from "@/components/token/TokenEstimate"
import { ArrowLeft, Save, Plus } from "lucide-react"
import { toast } from "sonner"
import { createDefaultWorldBookEntry } from "@/lib/helpers"
import { WorldBookEntryEditor } from "@/components/editor/WorldBookEntryEditor"
import {
  createEditorSnapshot,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges"

export function WorldBookEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<WorldBook | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const isDirty = Boolean(
    book && savedSnapshot && createEditorSnapshot(book) !== savedSnapshot
  )
  const unsavedChanges = useUnsavedChanges(isDirty)

  useEffect(() => {
    if (!id) return
    db.worldBooks.get(id).then((b) => {
      if (!b) {
        toast.error("世界书不存在")
        navigate("/worldbooks")
        return
      }
      setBook(b)
      setSavedSnapshot(createEditorSnapshot(b))
    })
  }, [id, navigate])

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载中...
      </div>
    )
  }

  async function handleSave() {
    const toSave = { ...book!, updated_at: new Date() }
    try {
      await db.worldBooks.put(toSave)
      setBook(toSave)
      setSavedSnapshot(createEditorSnapshot(toSave))
      unsavedChanges.markClean()
      toast.success("已保存")
    } catch {
      toast.error("保存失败")
    }
  }

  function addEntry() {
    const maxId = book!.entries.reduce((max, e) => Math.max(max, e.id), 0)
    const entry = createDefaultWorldBookEntry(maxId + 1)
    const updated = { ...book!, entries: [...book!.entries, entry] }
    setBook(updated)
    setExpanded((prev) => new Set(prev).add(entry.id))
  }

  function updateEntry(id: number, updates: Partial<WorldBookEntry>) {
    const entries = book!.entries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    setBook({ ...book!, entries })
  }

  function extPatch(id: number, patch: Record<string, unknown>) {
    const entry = book!.entries.find((e) => e.id === id)
    if (!entry) return
    updateEntry(id, { extensions: { ...entry.extensions, ...patch } })
  }

  function removeEntry(id: number) {
    setBook({ ...book!, entries: book!.entries.filter((e) => e.id !== id) })
    setExpanded((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function duplicateEntry(id: number) {
    const src = book!.entries.find((e) => e.id === id)
    if (!src) return
    const maxId = book!.entries.reduce((max, e) => Math.max(max, e.id), 0)
    const clone = structuredClone({ ...src, id: maxId + 1 })
    setBook({ ...book!, entries: [...book!.entries, clone] })
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/worldbooks")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <WorldBookNameField
            value={book.name}
            onChange={(e) => setBook({ ...book, name: e.target.value })}
            placeholder="世界书名称"
            className="min-w-0 flex-1 text-xl font-bold"
          />
          <span className="ml-auto shrink-0 pt-1 text-right text-xs text-muted-foreground">
            {book.entries.length} 条
            <TokenEstimateTotal
              texts={book.entries.map((entry) => entry.content)}
              prefix=" · 全部条目 "
            />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="h-4 w-4 mr-1" />
            添加条目
          </Button>
        </div>
      </div>

      {book.entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          暂无条目，点击「添加条目」开始
        </div>
      ) : (
        <div className="space-y-3">
          {book.entries.map((entry) => (
            <WorldBookEntryEditor
              key={entry.id}
              entry={entry}
              isOpen={expanded.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
              onUpdate={(updates) => updateEntry(entry.id, updates)}
              onExtPatch={(patch) => extPatch(entry.id, patch)}
              onDuplicate={() => duplicateEntry(entry.id)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </div>
      )}
      {unsavedChanges.dialog}
    </div>
  )
}
