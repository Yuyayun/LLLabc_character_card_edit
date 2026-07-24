import { useState } from "react"
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPosition: number
  total: number
  onConfirm: (position: number) => void
}

export function RegexPositionDialog({
  open,
  onOpenChange,
  currentPosition,
  total,
  onConfirm,
}: Props) {
  const [position, setPosition] = useState(String(currentPosition))

  function handleConfirm() {
    const parsed = Number(position)
    if (!Number.isFinite(parsed)) return
    onConfirm(parsed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>移动到指定位置</DialogTitle>
          <DialogDescription>
            输入 1–{total}。超出范围时会自动移动到首位或末位。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="regex-target-position">目标位置</Label>
          <Input
            id="regex-target-position"
            type="number"
            min={1}
            max={total}
            step={1}
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleConfirm()
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={handleConfirm}>移动</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
