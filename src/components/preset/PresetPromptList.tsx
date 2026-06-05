import { useState } from "react"
import type { PresetPrompt, PresetPromptOrder } from "@/types"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { GripVertical, Pencil, Unlink } from "lucide-react"

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

  const promptMap = new Map(prompts.map((p) => [p.identifier, p]))

  const filtered = order.filter((o) => {
    if (!search) return true
    const p = promptMap.get(o.identifier)
    if (!p) return false
    return p.name.toLowerCase().includes(search.toLowerCase())
  })

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return
    const updated = [...order]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(index, 0, moved)
    onReorder(updated)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        {search ? "没有匹配的提示词" : "列表为空，从池中添加条目"}
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {filtered.map((o, i) => {
        const prompt = promptMap.get(o.identifier)
        if (!prompt) return null
        const isDrag = dragIndex === i
        const isOver = dragOverIndex === i
        return (
          <li
            key={o.identifier}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all min-h-[44px] ${
              isDrag ? "opacity-40" : ""
            } ${isOver ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:bg-muted/50"} ${
              !o.enabled ? "opacity-50" : ""
            }`}
          >
            {/* 拖拽手柄 */}
            <span className="cursor-grab text-muted-foreground shrink-0">
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
