import type { RegexScript } from "@/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  RegexReorderTarget,
  RegexTransferMode,
} from "@/lib/regexOperations"
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ListOrdered,
  MoreHorizontal,
  MoveRight,
  Trash2,
} from "lucide-react"
import { REGEX_PLACEMENT_OPTIONS } from "./constants"

interface Props {
  script: RegexScript
  index: number
  total: number
  selectionMode: boolean
  selected: boolean
  canTransfer: boolean
  transferDisabledReason?: string
  onSelectedChange: (selected: boolean) => void
  onUpdate: (updates: Partial<RegexScript>) => void
  onRemove: () => void
  onMove: (target: RegexReorderTarget) => void
  onRequestPosition: () => void
  onExport: () => void
  onTransfer: (mode: RegexTransferMode) => void
}

export function RegexItem({
  script,
  index,
  total,
  selectionMode,
  selected,
  canTransfer,
  transferDisabledReason,
  onSelectedChange,
  onUpdate,
  onRemove,
  onMove,
  onRequestPosition,
  onExport,
  onTransfer,
}: Props) {
  function togglePlacement(value: number) {
    const placement = script.placement.includes(value)
      ? script.placement.filter((current) => current !== value)
      : [...script.placement, value]
    onUpdate({ placement })
  }

  function updateDepth(
    field: "minDepth" | "maxDepth",
    value: string
  ) {
    if (value === "") {
      onUpdate({ [field]: null })
      return
    }

    const depth = Number(value)
    if (Number.isFinite(depth)) {
      onUpdate({ [field]: depth })
    }
  }

  function controlId(prefix: string): string {
    return `${prefix}-${script.id}`
  }

  return (
    <section
      className={cn(
        "rounded-lg border transition-opacity duration-150",
        script.disabled && "opacity-55"
      )}
    >
      <div className="flex items-center gap-2 rounded-t-lg border-b bg-muted/30 px-3 py-2">
        {selectionMode && (
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(!!value)}
            aria-label={`选择 ${script.scriptName || `第 ${index + 1} 条脚本`}`}
          />
        )}

        {total > 1 && (
          <span className="mr-0.5 flex shrink-0 flex-col">
            <button
              type="button"
              className="leading-none text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-20"
              disabled={index === 0}
              onClick={() => onMove("up")}
              aria-label="上移"
              title="上移"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="leading-none text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-20"
              disabled={index === total - 1}
              onClick={() => onMove("down")}
              aria-label="下移"
              title="下移"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        <Input
          value={script.scriptName}
          onChange={(event) =>
            onUpdate({ scriptName: event.target.value })
          }
          placeholder="脚本名称"
          aria-label="脚本名称"
          className="h-7 min-w-0 flex-1 border-none bg-transparent px-0 text-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Regex 操作"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExport}>
              <Download />
              导出这一条
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canTransfer}
              onClick={() => onTransfer("copy")}
            >
              <Copy />
              复制到…
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canTransfer}
              onClick={() => onTransfer("move")}
            >
              <MoveRight />
              移动到…
            </DropdownMenuItem>
            {!canTransfer && transferDisabledReason && (
              <DropdownMenuItem
                disabled
                className="whitespace-normal text-xs leading-snug"
              >
                {transferDisabledReason}
              </DropdownMenuItem>
            )}

            {total > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={index === 0}
                  onClick={() => onMove("top")}
                >
                  <ArrowUpToLine />
                  置顶
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === total - 1}
                  onClick={() => onMove("bottom")}
                >
                  <ArrowDownToLine />
                  置底
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRequestPosition}>
                  <ListOrdered />
                  移动到指定位置…
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={controlId("find")} className="text-xs">
              正则匹配 (findRegex)
            </Label>
            <Textarea
              id={controlId("find")}
              value={script.findRegex}
              onChange={(event) =>
                onUpdate({ findRegex: event.target.value })
              }
              rows={3}
              className="max-h-32 font-mono text-xs"
              placeholder="/pattern/g"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={controlId("replace")} className="text-xs">
              替换内容 (replaceString)
            </Label>
            <Textarea
              id={controlId("replace")}
              value={script.replaceString}
              onChange={(event) =>
                onUpdate({ replaceString: event.target.value })
              }
              rows={3}
              className="max-h-32 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">作用范围</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {REGEX_PLACEMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-1.5 text-xs"
              >
                <Checkbox
                  checked={script.placement.includes(option.value)}
                  onCheckedChange={() =>
                    togglePlacement(option.value)
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">替换宏</Label>
            <Select
              value={String(script.substituteRegex)}
              onValueChange={(value) =>
                onUpdate({ substituteRegex: Number(value) })
              }
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">不替换</SelectItem>
                <SelectItem value="1">替换（原始）</SelectItem>
                <SelectItem value="2">替换（转义）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={controlId("min-depth")} className="text-xs">
              最小深度
            </Label>
            <Input
              id={controlId("min-depth")}
              type="number"
              value={script.minDepth ?? ""}
              onChange={(event) =>
                updateDepth("minDepth", event.target.value)
              }
              placeholder="无限制"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={controlId("max-depth")} className="text-xs">
              最大深度
            </Label>
            <Input
              id={controlId("max-depth")}
              type="number"
              value={script.maxDepth ?? ""}
              onChange={(event) =>
                updateDepth("maxDepth", event.target.value)
              }
              placeholder="无限制"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={script.markdownOnly}
              onCheckedChange={(value) =>
                onUpdate({ markdownOnly: !!value })
              }
              id={controlId("md")}
            />
            <Label htmlFor={controlId("md")} className="text-xs">
              仅格式显示
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={script.promptOnly}
              onCheckedChange={(value) =>
                onUpdate({ promptOnly: !!value })
              }
              id={controlId("po")}
            />
            <Label htmlFor={controlId("po")} className="text-xs">
              仅格式提示词
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={script.runOnEdit}
              onCheckedChange={(value) =>
                onUpdate({ runOnEdit: !!value })
              }
              id={controlId("roe")}
            />
            <Label htmlFor={controlId("roe")} className="text-xs">
              编辑时运行
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={!script.disabled}
              onCheckedChange={(value) =>
                onUpdate({ disabled: !value })
              }
              id={controlId("dis")}
            />
            <Label htmlFor={controlId("dis")} className="text-xs">
              {script.disabled ? "已禁用" : "已启用"}
            </Label>
          </div>
        </div>
      </div>
    </section>
  )
}
