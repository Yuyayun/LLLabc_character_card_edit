import { useState, useRef, useCallback } from "react"
import type { PresetPrompt, PresetPromptOrder } from "@/types"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { GripVertical, Pencil, Unlink, ChevronUp, ChevronDown } from "lucide-react"

interface Props {
  order: PresetPromptOrder[]
  prompts: PresetPrompt[]
  selectedIds: Set<string>
  onReorder: (order: PresetPromptOrder[]) => void
  onToggleEnabled: (identifier: string) => void
  onEdit: (prompt: PresetPrompt) => void
  onRemove: (identifier: string) => void
  onToggleSelect: (identifier: string) => void
  search: string
}

const AUTO_SCROLL_ZONE = 60 // 距离边缘多少 px 开始自动滚动
const AUTO_SCROLL_SPEED = 8 // 每次滚动像素数

export function PresetPromptList({
  order,
  prompts,
  selectedIds,
  onReorder,
  onToggleEnabled,
  onEdit,
  onRemove,
  onToggleSelect,
  search,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scrollRafRef = useRef<number | null>(null)

  const promptMap = new Map(prompts.map((p) => [p.identifier, p]))

  const indexed = order
    .map((o, i) => ({ order: o, origIndex: i }))
    .filter(({ order: o }) => {
      if (!search) return true
      const p = promptMap.get(o.identifier)
      if (!p) return false
      return p.name.toLowerCase().includes(search.toLowerCase())
    })

  function moveUp(origIndex: number) {
    if (origIndex <= 0) return
    const updated = [...order]
    ;[updated[origIndex - 1], updated[origIndex]] = [updated[origIndex], updated[origIndex - 1]]
    onReorder(updated)
  }

  function moveDown(origIndex: number) {
    if (origIndex >= order.length - 1) return
    const updated = [...order]
    ;[updated[origIndex + 1], updated[origIndex]] = [updated[origIndex], updated[origIndex + 1]]
    onReorder(updated)
  }

  function stopAutoScroll() {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = null
    }
  }

  const autoScroll = useCallback((clientY: number) => {
    const list = listRef.current
    if (!list) return
    const rect = list.getBoundingClientRect()
    const top = rect.top
    const bottom = rect.bottom

    stopAutoScroll()

    const scrollStep = () => {
      const currentRect = list.getBoundingClientRect()
      const distFromTop = clientY - currentRect.top
      const distFromBottom = currentRect.bottom - clientY

      if (distFromTop < AUTO_SCROLL_ZONE && distFromTop > 0 && list.scrollTop > 0) {
        list.scrollTop -= AUTO_SCROLL_SPEED
        scrollRafRef.current = requestAnimationFrame(scrollStep)
      } else if (distFromBottom < AUTO_SCROLL_ZONE && distFromBottom > 0 && list.scrollTop < list.scrollHeight - list.clientHeight) {
        list.scrollTop += AUTO_SCROLL_SPEED
        scrollRafRef.current = requestAnimationFrame(scrollStep)
      }
    }

    if (clientY - top < AUTO_SCROLL_ZONE || bottom - clientY < AUTO_SCROLL_ZONE) {
      scrollRafRef.current = requestAnimationFrame(scrollStep)
    }
  }, [])

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
    stopAutoScroll()
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
    autoScroll(e.clientY)
  }

  function handleDrop(targetOrigIndex: number) {
    if (dragIndex === null || dragIndex === targetOrigIndex) return
    const updated = [...order]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(targetOrigIndex, 0, moved)
    onReorder(updated)
    setDragIndex(null)
    setDragOverIndex(null)
    stopAutoScroll()
  }

  if (indexed.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        {search ? "没有匹配的提示词" : "列表为空，从池中添加条目"}
      </p>
    )
  }

  return (
    <ul ref={listRef} className="space-y-1 max-h-[60vh] overflow-y-auto">
      {indexed.map(({ order: o, origIndex }) => {
        const prompt = promptMap.get(o.identifier)
        if (!prompt) return null
        const isDrag = dragIndex === origIndex
        const isOver = dragOverIndex === origIndex
        const isFirst = origIndex === 0
        const isLast = origIndex === order.length - 1

        return (
          <li
            key={o.identifier}
            draggable
            onDragStart={() => handleDragStart(origIndex)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, origIndex)}
            onDrop={() => handleDrop(origIndex)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-md border transition-all min-h-[44px] ${
              isDrag ? "opacity-40" : ""
            } ${isOver ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:bg-muted/50"} ${
              !o.enabled ? "opacity-50" : ""
            }`}
          >
            {/* 上下移动（手机友好） */}
            <span className="flex flex-col gap-0 shrink-0">
              <button
                className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default leading-none"
                disabled={isFirst}
                onClick={() => moveUp(origIndex)}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default leading-none"
                disabled={isLast}
                onClick={() => moveDown(origIndex)}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </span>

            {/* 拖拽手柄（桌面端） */}
            <span className="cursor-grab text-muted-foreground shrink-0 hidden sm:block">
              <GripVertical className="h-3.5 w-3.5" />
            </span>

            {/* 选中框 */}
            <input
              type="checkbox"
              checked={selectedIds.has(o.identifier)}
              onChange={() => onToggleSelect(o.identifier)}
              className="h-3.5 w-3.5 shrink-0"
            />

            {/* 名称 */}
            <span className="flex-1 min-w-0 text-xs truncate">
              {prompt.name}
            </span>

            {/* 开关 */}
            <Switch
              checked={o.enabled}
              onCheckedChange={() => onToggleEnabled(o.identifier)}
            />

            {/* 编辑 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onEdit(prompt)}
            >
              <Pencil className="h-3 w-3" />
            </Button>

            {/* 移除链接 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(o.identifier)}
            >
              <Unlink className="h-3 w-3" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
