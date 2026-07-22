import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { db } from "@/lib/db"
import { generateId } from "@/lib/utils"
import { createDefaultWorldBookEntry } from "@/lib/helpers"
import type { WorldBook, WorldBookEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorldBookEntryEditor } from "@/components/editor/WorldBookEntryEditor"
import { Plus, BookOpen, Trash2, Save, ExternalLink, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { deleteWorldBookWithBindings } from "@/lib/dataOperations"
import {
  createEditorSnapshot,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges"

interface BookListItem {
  id: string
  name: string
  entryCount: number
  source: "standalone" | "embedded"
  cardName?: string
  cardId?: string
}

async function queryAllBooks(): Promise<BookListItem[]> {
  const [dbBooksRaw, cards] = await Promise.all([
    db.worldBooks.toArray(),
    db.characterCards.toArray(),
  ])

  const dbBooks = dbBooksRaw.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  const list: BookListItem[] = dbBooks.map((book) => ({
    id: book.id,
    name: book.name || "未命名世界书",
    entryCount: book.entries?.length ?? 0,
    source: "standalone" as const,
  }))

  for (const card of cards) {
    if (card.character_book) {
      list.push({
        id: card.character_book.id,
        name: card.character_book.name || card.name + " 的世界书",
        entryCount: card.character_book.entries?.length ?? 0,
        source: "embedded" as const,
        cardName: card.name,
        cardId: card.id,
      })
    }
  }

  return list
}

export function WorldBooks() {
  const [books, setBooks] = useState<BookListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingBook, setEditingBook] = useState<WorldBook | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const loadVersionRef = useRef(0)
  const selectionVersionRef = useRef(0)
  const isDirty = Boolean(
    editingBook && savedSnapshot && createEditorSnapshot(editingBook) !== savedSnapshot
  )
  const unsavedChanges = useUnsavedChanges(isDirty)

  const loadAllBooks = useCallback(async () => {
    const version = ++loadVersionRef.current
    const list = await queryAllBooks()

    // 竞态保护
    if (version !== loadVersionRef.current) return

    setBooks(list)

    // 如果当前选中的书已不在列表中，清空编辑区
    if (selectedId && !list.find((b) => b.id === selectedId)) {
      setSelectedId(null)
      setEditingBook(null)
      setSavedSnapshot(null)
    }
  }, [selectedId])

  useEffect(() => {
    const version = ++loadVersionRef.current
    let active = true

    queryAllBooks()
      .then((list) => {
        if (active && version === loadVersionRef.current) setBooks(list)
      })
      .catch(() => {
        if (active) toast.error("加载世界书失败")
      })

    return () => {
      active = false
    }
  }, [])

  async function selectBook(item: BookListItem) {
    const version = ++selectionVersionRef.current
    let nextBook: WorldBook | null = null
    if (item.source === "standalone") {
      nextBook = (await db.worldBooks.get(item.id)) ?? null
    } else if (item.cardId) {
      const card = await db.characterCards.get(item.cardId)
      nextBook = card?.character_book ?? null
    }
    if (version !== selectionVersionRef.current) return
    if (!nextBook) {
      toast.error("世界书不存在或已被删除")
      await loadAllBooks()
      return
    }
    setSelectedId(item.id)
    setEditingBook(nextBook)
    setSavedSnapshot(nextBook ? createEditorSnapshot(nextBook) : null)
    setExpanded(new Set())
  }

  async function createBook() {
    const book: WorldBook = {
      id: generateId(),
      name: "未命名世界书",
      description: "",
      entries: [],
      is_standalone: true,
      created_at: new Date(),
      updated_at: new Date(),
    }
    try {
      await db.worldBooks.put(book)
      toast.success("已创建世界书")
      await loadAllBooks()
      setSelectedId(book.id)
      setEditingBook(book)
      setSavedSnapshot(createEditorSnapshot(book))
      setExpanded(new Set())
    } catch (e) {
      console.error("创建世界书失败:", e)
      toast.error("创建失败，请检查存储空间")
    }
  }

  function handleCreate() {
    unsavedChanges.requestDiscard(createBook)
  }

  async function handleSave() {
    if (!editingBook) return
    const toSave = { ...editingBook, updated_at: new Date() }

    // 根据来源保存到对应位置
    const item = books.find((b) => b.id === editingBook.id)
    if (!item) {
      toast.error("世界书不存在或已被删除")
      return
    }

    try {
      if (item.source === "standalone") {
        await db.worldBooks.put(toSave)
      } else if (item.cardId) {
        const card = await db.characterCards.get(item.cardId)
        if (!card) throw new Error("绑定的角色卡不存在")
        await db.characterCards.put({ ...card, character_book: toSave, updated_at: new Date() })
      }
      setEditingBook(toSave)
      setSavedSnapshot(createEditorSnapshot(toSave))
      unsavedChanges.markClean()
      toast.success("已保存")
      await loadAllBooks()
    } catch {
      toast.error("保存失败")
    }
  }

  async function handleDelete() {
    if (!editingBook) return
    const item = books.find((b) => b.id === editingBook.id)
    if (!item) {
      toast.error("世界书不存在或已被删除")
      return
    }
    const message = item.source === "standalone"
      ? `确认删除「${editingBook.name || "未命名世界书"}」？\n\n所有角色卡中指向这本世界书的绑定也会一并解除。`
      : `确认删除「${editingBook.name || "未命名世界书"}」？\n\n这本内嵌世界书会从对应角色卡中移除。`
    if (!confirm(message)) return

    try {
      if (item.source === "standalone") {
        await deleteWorldBookWithBindings(editingBook.id)
      } else if (item.cardId) {
        const card = await db.characterCards.get(item.cardId)
        if (!card) throw new Error("绑定的角色卡不存在")
        await db.characterCards.put({ ...card, character_book: undefined, updated_at: new Date() })
      }
      toast.success("已删除")
      setSelectedId(null)
      setEditingBook(null)
      setSavedSnapshot(null)
      unsavedChanges.markClean()
      await loadAllBooks()
    } catch {
      toast.error("删除失败")
    }
  }

  function addEntry() {
    if (!editingBook) return
    const maxId = editingBook.entries.reduce((max, e) => Math.max(max, e.id), 0)
    const entry = createDefaultWorldBookEntry(maxId + 1)
    const updated = { ...editingBook, entries: [...editingBook.entries, entry] }
    setEditingBook(updated)
    setExpanded((prev) => new Set(prev).add(entry.id))
  }

  function updateEntry(id: number, updates: Partial<WorldBookEntry>) {
    if (!editingBook) return
    const entries = editingBook.entries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    setEditingBook({ ...editingBook, entries })
  }

  function extPatch(id: number, patch: Record<string, unknown>) {
    if (!editingBook) return
    const entry = editingBook.entries.find((e) => e.id === id)
    if (!entry) return
    updateEntry(id, { extensions: { ...entry.extensions, ...patch } })
  }

  function removeEntry(id: number) {
    if (!editingBook) return
    setEditingBook({ ...editingBook, entries: editingBook.entries.filter((e) => e.id !== id) })
    setExpanded((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function duplicateEntry(id: number) {
    if (!editingBook) return
    const src = editingBook.entries.find((e) => e.id === id)
    if (!src) return
    const maxId = editingBook.entries.reduce((max, e) => Math.max(max, e.id), 0)
    setEditingBook({
      ...editingBook,
      entries: [...editingBook.entries, structuredClone({ ...src, id: maxId + 1 })],
    })
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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">世界书</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新建
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">暂无世界书</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* 上方：世界书列表 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground px-1">
              共 {books.length} 本
            </p>
            {books.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (selectedId === item.id) return
                  unsavedChanges.requestDiscard(() => selectBook(item))
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm",
                  selectedId === item.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-transparent hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{item.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{item.entryCount} 条</span>
                  {item.source === "embedded" && (
                    <span className="bg-muted px-1 rounded-sm">
                      绑定于 {item.cardName}
                      {item.cardId && (
                        <Link to={`/editor/${item.cardId}`} className="ml-1 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-2.5 w-2.5 inline" />
                        </Link>
                      )}
                    </span>
                  )}
                  {item.source === "standalone" && (
                    <span className="text-muted-foreground">独立</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 右侧：编辑区 */}
          <div className="flex-1 min-w-0">
            {!editingBook ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm border rounded-lg">
                <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                选择左侧世界书开始编辑
              </div>
            ) : (
              <div className="space-y-4">
                {/* 编辑区顶栏 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Input
                      value={editingBook.name}
                      onChange={(e) => setEditingBook({ ...editingBook, name: e.target.value })}
                      placeholder="世界书名称"
                      className="text-base font-semibold border-none px-0 h-auto max-w-[200px]"
                    />
                    <span className="text-xs text-muted-foreground">
                      {editingBook.entries.length} 条
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button onClick={handleSave} size="sm" className="h-8 text-xs">
                      <Save className="h-3.5 w-3.5 mr-1" />
                      保存
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addEntry}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      添加条目
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>

                {/* 条目列表 */}
                {editingBook.entries.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm border rounded-lg">
                    暂无条目，点击「添加条目」开始
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingBook.entries.map((entry) => (
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
              </div>
            )}
          </div>
        </div>
      )}
      {unsavedChanges.dialog}
    </div>
  )
}
