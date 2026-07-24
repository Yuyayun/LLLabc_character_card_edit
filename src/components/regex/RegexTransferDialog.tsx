import { useEffect, useMemo, useState } from "react"
import type { RegexScript } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  listRegexTransferTargets,
  transferRegexScripts,
  type RegexInsertLocation,
  type RegexOwnerRef,
  type RegexTransferMode,
  type RegexTransferTarget,
  type TransferRegexScriptsResult,
} from "@/lib/regexOperations"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: RegexTransferMode
  source: RegexOwnerRef
  sourceScripts: RegexScript[]
  sourceUpdatedAt: Date
  scriptIds: string[]
  onComplete: (
    result: TransferRegexScriptsResult,
    mode: RegexTransferMode
  ) => void
}

export function RegexTransferDialog({
  open,
  onOpenChange,
  mode,
  source,
  sourceScripts,
  sourceUpdatedAt,
  scriptIds,
  onComplete,
}: Props) {
  const [targets, setTargets] = useState<RegexTransferTarget[]>([])
  const [targetId, setTargetId] = useState("")
  const [insertionType, setInsertionType] = useState<
    RegexInsertLocation["type"]
  >("bottom")
  const [position, setPosition] = useState("1")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    let active = true

    listRegexTransferTargets(source.kind)
      .then((items) => {
        if (!active) return
        setTargets(items)
        setTargetId(items[0]?.id ?? "")
      })
      .catch(() => {
        if (active) toast.error("加载可用目标失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, source.kind])

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === targetId),
    [targetId, targets]
  )
  const targetKindName = source.kind === "card" ? "预设" : "角色卡"
  const actionName = mode === "copy" ? "复制" : "移动"
  const insertionLabel = {
    top: "顶部",
    bottom: "底部",
    position: "指定位置",
  }[insertionType]

  async function handleSubmit() {
    if (!targetId || submitting) return

    const insertion: RegexInsertLocation =
      insertionType === "position"
        ? {
            type: "position",
            position: Number(position),
          }
        : { type: insertionType }

    setSubmitting(true)
    try {
      const result = await transferRegexScripts({
        source,
        target: {
          kind: source.kind === "card" ? "preset" : "card",
          id: targetId,
        },
        scriptIds,
        mode,
        insertion,
        sourceScripts,
        expectedSourceUpdatedAt: sourceUpdatedAt,
      })
      onComplete(result, mode)
      onOpenChange(false)
      toast.success(`已${actionName} ${result.transferredCount} 条 Regex`)
    } catch (error) {
      toast.error(
        `${actionName}失败：${
          error instanceof Error ? error.message : "未知错误"
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actionName} {scriptIds.length} 条 Regex
          </DialogTitle>
          <DialogDescription>
            选择一个已保存的{targetKindName}。移动会同时更新源与目标；
            任一写入失败都会完整回滚。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>目标{targetKindName}</Label>
            <Select
              value={targetId}
              onValueChange={(value) => setTargetId(value ?? "")}
              disabled={loading || targets.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedTarget
                    ? `${selectedTarget.name} · ${selectedTarget.scriptCount} 条`
                    : loading
                      ? "加载中…"
                      : "选择目标"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.name} · {target.scriptCount} 条
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loading && targets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                暂无可用目标，请先保存一个{targetKindName}。
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>插入位置</Label>
            <Select
              value={insertionType}
              onValueChange={(value) =>
                setInsertionType(
                  (value ?? "bottom") as RegexInsertLocation["type"]
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{insertionLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">顶部</SelectItem>
                <SelectItem value="bottom">底部</SelectItem>
                <SelectItem value="position">指定位置</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {insertionType === "position" && (
            <div className="space-y-1.5">
              <Label htmlFor="regex-transfer-position">
                目标位置（1–
                {(selectedTarget?.scriptCount ?? 0) + 1}）
              </Label>
              <Input
                id="regex-transfer-position"
                type="number"
                min={1}
                max={(selectedTarget?.scriptCount ?? 0) + 1}
                step={1}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            disabled={!targetId || loading || submitting}
            onClick={handleSubmit}
          >
            {submitting ? `${actionName}中…` : actionName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
