import type { CharacterCard, WorldBook } from "@/types"
import { Button } from "@/components/ui/button"
import { WorldBookNameField } from "./WorldBookNameField"
import { TokenEstimateTotal } from "@/components/token/TokenEstimate"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, ExternalLink, Link, Unlink } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createDefaultWorldBookEntry } from "@/lib/helpers"
import { generateId } from "@/lib/utils"
import { db } from "@/lib/db"
import { WorldBookEntryEditor } from "./WorldBookEntryEditor"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

export function EditorWorldBook({ card, onChange }: Props) {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())
  const [standaloneBooks, setStandaloneBooks] = useState<WorldBook[]>([])

  function loadStandaloneBooks() {
    db.worldBooks.toArray().then((all) => {
      const sorted = all.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setStandaloneBooks(sorted)
    }).catch(() => {
      // 查询失败静默处理，列表保持 []
    })
  }

  useEffect(() => {
    loadStandaloneBooks()
  }, [])

  // 角色卡变更时刷新独立书列表（用于提取后立即显示）
  useEffect(() => {
    loadStandaloneBooks()
  }, [card.id])

  const worldBook = card.character_book
  const boundBook = standaloneBooks.find((b) => b.id === card.bound_worldbook_id)

  function ensureWorldBook(): WorldBook {
    if (worldBook) return worldBook
    const newWB: WorldBook = {
      id: generateId(),
      name: card.name ? card.name + " 的世界书" : "未命名世界书",
      description: "",
      entries: [],
      is_standalone: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    onChange({ ...card, character_book: newWB })
    return newWB
  }

  function updateWorldBook(updates: Partial<WorldBook>) {
    const wb = ensureWorldBook()
    onChange({ ...card, character_book: { ...wb, ...updates, updated_at: new Date() } })
  }

  function addEntry() {
    const wb = ensureWorldBook()
    const maxId = wb.entries.reduce((max, e) => Math.max(max, e.id), 0)
    const newEntry = createDefaultWorldBookEntry(maxId + 1)
    const updated = { ...wb, entries: [...wb.entries, newEntry] }
    onChange({ ...card, character_book: updated })
    setExpandedEntries((prev) => new Set(prev).add(newEntry.id))
  }

  function updateEntry(id: number, updates: Partial<WorldBook["entries"][number]>) {
    const wb = ensureWorldBook()
    const entries = wb.entries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    updateWorldBook({ entries })
  }

  function extPatch(id: number, patch: Record<string, unknown>) {
    const wb = ensureWorldBook()
    const entry = wb.entries.find((e) => e.id === id)
    if (!entry) return
    updateEntry(id, { extensions: { ...entry.extensions, ...patch } })
  }

  function removeEntry(id: number) {
    const wb = ensureWorldBook()
    updateWorldBook({ entries: wb.entries.filter((e) => e.id !== id) })
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function duplicateEntry(id: number) {
    const wb = ensureWorldBook()
    const src = wb.entries.find((e) => e.id === id)
    if (!src) return
    const maxId = wb.entries.reduce((max, e) => Math.max(max, e.id), 0)
    const clone = structuredClone({ ...src, id: maxId + 1 })
    updateWorldBook({ entries: [...wb.entries, clone] })
  }

  function toggleExpanded(id: number) {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeWorldBook() {
    onChange({ ...card, character_book: undefined, bound_worldbook_id: undefined })
  }

  async function extractWorldBook() {
    if (!worldBook) return
    try {
      const standalone: WorldBook = {
        ...structuredClone(worldBook),
        id: generateId(),
        is_standalone: true,
        name: worldBook.name || (card.name ? card.name + " 世界书" : "未命名世界书"),
        created_at: new Date(),
        updated_at: new Date(),
      }
      await db.worldBooks.put(standalone)
      toast.success("已提取为独立世界书，请保存角色卡以完成解绑")
      onChange({ ...card, character_book: undefined, bound_worldbook_id: standalone.id })
      setStandaloneBooks((prev) => [standalone, ...prev])
    } catch {
      toast.error("提取失败，请检查存储空间")
    }
  }

  function bindWorldBook(bookId: string) {
    onChange({ ...card, character_book: undefined, bound_worldbook_id: bookId })
  }

  function unbindWorldBook() {
    onChange({ ...card, bound_worldbook_id: undefined })
  }

  if (!worldBook) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        {boundBook ? (
          <>
            <div className="flex max-w-full items-start gap-2 text-sm">
              <Link className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 break-words">
                已绑定独立世界书：
                <span className="font-medium">{boundBook.name}</span>
                <span className="text-muted-foreground ml-1">({boundBook.entries.length} 条)</span>
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={unbindWorldBook}>
                <Unlink className="h-4 w-4 mr-1" />
                解绑
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">此角色卡尚未绑定世界书</p>
            <div className="flex gap-2">
              <Button onClick={ensureWorldBook}>创建内嵌世界书</Button>
              {standaloneBooks.length > 0 && (
                <Select onValueChange={(v) => { if (typeof v === "string") bindWorldBook(v) }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="绑定已有世界书" />
                  </SelectTrigger>
                  <SelectContent>
                    {standaloneBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                        <span className="text-muted-foreground ml-1 text-xs">({b.entries.length} 条)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 世界书名称标题 */}
      <div className="space-y-1.5 pb-3 border-b">
        <div className="flex min-w-0 items-start gap-3">
          <WorldBookNameField
            value={worldBook.name}
            onChange={(e) => updateWorldBook({ name: e.target.value })}
            placeholder="世界书名称"
            className="min-w-0 flex-1 text-base font-semibold"
          />
          <span className="ml-auto shrink-0 pt-0.5 text-right text-xs text-muted-foreground">
            {worldBook.entries.length} 条
            <TokenEstimateTotal
              texts={worldBook.entries.map((entry) => entry.content)}
              prefix=" · 全部条目 "
            />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="h-4 w-4 mr-1" />
            添加条目
          </Button>
          <Button variant="outline" size="sm" onClick={extractWorldBook}>
            <ExternalLink className="h-4 w-4 mr-1" />
            提取为独立
          </Button>
          <Button variant="outline" size="sm" onClick={removeWorldBook} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            移除世界书
          </Button>
        </div>
      </div>

      {worldBook.entries.map((entry) => (
        <WorldBookEntryEditor
          key={entry.id}
          entry={entry}
          isOpen={expandedEntries.has(entry.id)}
          onToggle={() => toggleExpanded(entry.id)}
          onUpdate={(updates) => updateEntry(entry.id, updates)}
          onExtPatch={(patch) => extPatch(entry.id, patch)}
          onDuplicate={() => duplicateEntry(entry.id)}
          onRemove={() => removeEntry(entry.id)}
        />
      ))}
    </div>
  )
}
