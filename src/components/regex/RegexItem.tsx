import type { RegexScript } from "@/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react"
import {
  REGEX_PLACEMENT_OPTIONS,
  type RegexListVariant,
} from "./constants"

interface Props {
  script: RegexScript
  index: number
  total: number
  variant: RegexListVariant
  onUpdate: (updates: Partial<RegexScript>) => void
  onRemove: () => void
  onMove?: (direction: -1 | 1) => void
}

export function RegexItem({
  script,
  index,
  total,
  variant,
  onUpdate,
  onRemove,
  onMove,
}: Props) {
  const isCard = variant === "card"

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

  function controlId(prefix: string): string | undefined {
    return isCard ? `${prefix}-${script.id}` : undefined
  }

  return (
    <section
      className={cn(
        "border rounded-lg",
        script.disabled && "opacity-50"
      )}
    >
      <div
        className={
          isCard
            ? "flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-lg"
            : "flex items-center gap-1 px-3 py-2 border-b bg-muted/30 rounded-t-lg"
        }
      >
        {!isCard && (
          <span className="flex flex-col gap-0 shrink-0 mr-1">
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default leading-none"
              disabled={index === 0}
              onClick={() => onMove?.(-1)}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default leading-none"
              disabled={index === total - 1}
              onClick={() => onMove?.(1)}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </span>
        )}
        <Input
          value={script.scriptName}
          onChange={(event) =>
            onUpdate({ scriptName: event.target.value })
          }
          placeholder="脚本名称"
          className={
            isCard
              ? "max-w-xs h-7 text-sm border-none bg-transparent px-0"
              : "flex-1 h-7 text-sm border-none bg-transparent px-0"
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-destructive hover:text-destructive",
            !isCard && "shrink-0"
          )}
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        className={
          isCard
            ? "p-4 space-y-4"
            : "p-3 sm:p-4 space-y-3"
        }
      >
        <div
          className={
            isCard
              ? "grid grid-cols-2 gap-4"
              : "grid grid-cols-1 sm:grid-cols-2 gap-3"
          }
        >
          <div className={isCard ? "space-y-1.5" : "space-y-1"}>
            <Label className="text-xs">
              正则匹配 (findRegex)
            </Label>
            <Textarea
              value={script.findRegex}
              onChange={(event) =>
                onUpdate({ findRegex: event.target.value })
              }
              rows={3}
              className="font-mono text-xs max-h-32"
              placeholder={isCard ? "/pattern/s" : "/pattern/g"}
            />
          </div>
          <div className={isCard ? "space-y-1.5" : "space-y-1"}>
            <Label className="text-xs">
              替换内容 (replaceString)
            </Label>
            <Textarea
              value={script.replaceString}
              onChange={(event) =>
                onUpdate({ replaceString: event.target.value })
              }
              rows={3}
              className="font-mono text-xs max-h-32"
            />
          </div>
        </div>

        <div className={isCard ? "space-y-1.5" : "space-y-1"}>
          <Label className="text-xs">作用范围</Label>
          <div
            className={cn(
              "flex flex-wrap gap-y-1",
              isCard ? "gap-x-4" : "gap-x-3"
            )}
          >
            {REGEX_PLACEMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
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

        <div
          className={cn(
            "grid grid-cols-3",
            isCard ? "gap-4" : "gap-3"
          )}
        >
          <div className={isCard ? "space-y-1.5" : "space-y-1"}>
            <Label className="text-xs">替换宏</Label>
            <Select
              value={String(script.substituteRegex)}
              onValueChange={(value) =>
                onUpdate({ substituteRegex: Number(value) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">不替换</SelectItem>
                <SelectItem value="1">替换（原始）</SelectItem>
                <SelectItem value="2">替换（转义）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={isCard ? "space-y-1.5" : "space-y-1"}>
            <Label className="text-xs">最小深度</Label>
            <Input
              type="number"
              value={script.minDepth ?? ""}
              onChange={(event) =>
                updateDepth("minDepth", event.target.value)
              }
              placeholder="无限制"
              className="h-8 text-xs"
            />
          </div>
          <div className={isCard ? "space-y-1.5" : "space-y-1"}>
            <Label className="text-xs">最大深度</Label>
            <Input
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

        <div
          className={cn(
            "flex items-center gap-y-1 flex-wrap",
            isCard ? "gap-x-6" : "gap-x-4"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={script.markdownOnly}
              onCheckedChange={(value) =>
                onUpdate({ markdownOnly: !!value })
              }
              id={controlId("md")}
            />
            <Label
              htmlFor={controlId("md")}
              className="text-xs"
            >
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
            <Label
              htmlFor={controlId("po")}
              className="text-xs"
            >
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
            <Label
              htmlFor={controlId("roe")}
              className="text-xs"
            >
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
            <Label
              htmlFor={controlId("dis")}
              className="text-xs"
            >
              {script.disabled ? "已禁用" : "已启用"}
            </Label>
          </div>
        </div>
      </div>
    </section>
  )
}
