import { useState } from "react"
import type { PresetPrompt } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowRightToLine, Copy, Link, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  poolPrompts: PresetPrompt[]
  orderIdentifiers: string[]
  onInsertFromPool: (identifier: string) => void
  onNewPrompt: () => void
  onMoveToPosition: () => void
  onCopyFromPreset: () => void
  selectedIds: Set<string>
}

export function PresetToolbar({
  poolPrompts,
  orderIdentifiers,
  onInsertFromPool,
  onNewPrompt,
  onMoveToPosition,
  onCopyFromPreset,
  selectedIds,
}: Props) {
  const [selectedPoolId, setSelectedPoolId] = useState("")

  // 下拉列表：按名称排序，已链接的条目标记
  const sorted = [...poolPrompts].sort((a, b) => a.name.localeCompare(b.name))
  const linkedSet = new Set(orderIdentifiers)

  function handleInsert() {
    if (!selectedPoolId) return
    if (linkedSet.has(selectedPoolId)) {
      toast("该条目已在列表中")
      return
    }
    onInsertFromPool(selectedPoolId)
    setSelectedPoolId("")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 下拉 + 插入 */}
      <select
        value={selectedPoolId}
        onChange={(e) => setSelectedPoolId(e.target.value)}
        className="flex h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring sm:h-8 sm:w-auto sm:min-w-[180px] sm:max-w-[320px]"
      >
        <option value="">从池中选择条目...</option>
        {sorted.map((p) => (
          <option key={p.identifier} value={p.identifier}>
            {linkedSet.has(p.identifier) ? "✓ " : "○ "}
            {p.name || "未命名"}
          </option>
        ))}
      </select>

      <Button
        variant="outline"
        size="sm"
        className="h-9 flex-1 text-xs sm:h-8 sm:flex-none"
        disabled={!selectedPoolId}
        onClick={handleInsert}
      >
        <Link className="h-3.5 w-3.5 mr-1" />
        插入
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-9 flex-1 text-xs sm:h-8 sm:flex-none"
        onClick={onCopyFromPreset}
      >
        <Copy className="h-3.5 w-3.5 mr-1" />
        复制
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-9 flex-1 text-xs sm:h-8 sm:flex-none"
        onClick={onMoveToPosition}
      >
        <ArrowRightToLine className="h-3.5 w-3.5 mr-1" />
        移动到
      </Button>

      {/* 分隔 */}
      <span className="hidden w-px h-5 bg-border mx-0.5 sm:block" />

      <Button variant="outline" size="sm" className="h-9 flex-1 text-xs sm:h-8 sm:flex-none" onClick={onNewPrompt}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        新建
      </Button>

      {selectedIds.size > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 text-xs text-destructive hover:bg-destructive/10 sm:h-8 sm:flex-none"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          删除 ({selectedIds.size})
        </Button>
      )}

      <span className="flex-1" />
    </div>
  )
}
