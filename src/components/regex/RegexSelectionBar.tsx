import { Button } from "@/components/ui/button"
import {
  CheckCheck,
  Copy,
  Download,
  LogOut,
  MoveRight,
  Square,
} from "lucide-react"

interface Props {
  selectedCount: number
  total: number
  canTransfer: boolean
  transferDisabledReason?: string
  onSelectAll: () => void
  onClear: () => void
  onExport: () => void
  onCopy: () => void
  onMove: () => void
  onCancel: () => void
}

export function RegexSelectionBar({
  selectedCount,
  total,
  canTransfer,
  transferDisabledReason,
  onSelectAll,
  onClear,
  onExport,
  onCopy,
  onMove,
  onCancel,
}: Props) {
  const hasSelection = selectedCount > 0

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">已选 {selectedCount} 条</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={selectedCount === total ? onClear : onSelectAll}
          >
            {selectedCount === total ? <Square /> : <CheckCheck />}
            {selectedCount === total ? "清空" : "全选"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelection}
            onClick={onExport}
          >
            <Download />
            导出
          </Button>
          <span title={!canTransfer ? transferDisabledReason : undefined}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasSelection || !canTransfer}
              onClick={onCopy}
            >
              <Copy />
              复制到…
            </Button>
          </span>
          <span title={!canTransfer ? transferDisabledReason : undefined}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasSelection || !canTransfer}
              onClick={onMove}
            >
              <MoveRight />
              移动到…
            </Button>
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <LogOut />
            退出选择
          </Button>
        </div>
      </div>
      {!canTransfer && transferDisabledReason && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {transferDisabledReason}
        </p>
      )}
    </div>
  )
}
