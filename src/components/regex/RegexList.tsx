import type { RegexScript } from "@/types"
import { Button } from "@/components/ui/button"
import { createDefaultRegexScript } from "@/lib/parsers/regex"
import { Copy, Plus } from "lucide-react"
import type { RegexListVariant } from "./constants"
import { RegexItem } from "./RegexItem"

interface Props {
  scripts: RegexScript[]
  onChange: (scripts: RegexScript[]) => void
  variant: RegexListVariant
  onCopyFromPreset?: () => void
}

export function RegexList({
  scripts,
  onChange,
  variant,
  onCopyFromPreset,
}: Props) {
  const isCard = variant === "card"

  function addScript() {
    onChange([...scripts, createDefaultRegexScript()])
  }

  function updateScript(
    id: string,
    updates: Partial<RegexScript>
  ) {
    onChange(
      scripts.map((script) =>
        script.id === id ? { ...script, ...updates } : script
      )
    )
  }

  function removeScript(id: string) {
    onChange(scripts.filter((script) => script.id !== id))
  }

  function moveScript(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= scripts.length) return

    const updated = [...scripts]
    ;[updated[index], updated[target]] = [
      updated[target],
      updated[index],
    ]
    onChange(updated)
  }

  return (
    <div className={isCard ? "space-y-6" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <span
          className={
            isCard
              ? "text-sm text-muted-foreground"
              : "text-xs text-muted-foreground"
          }
        >
          {isCard
            ? `共 ${scripts.length} 条脚本`
            : `共 ${scripts.length} 条正则脚本`}
        </span>
        {isCard ? (
          <Button variant="outline" size="sm" onClick={addScript}>
            <Plus className="h-4 w-4 mr-1" />
            添加脚本
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {onCopyFromPreset && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onCopyFromPreset}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                从预设复制
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={addScript}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              添加脚本
            </Button>
          </div>
        )}
      </div>

      {scripts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          暂无正则脚本
        </div>
      ) : (
        <div className={isCard ? "space-y-6" : "space-y-4"}>
          {scripts.map((script, index) => (
            <RegexItem
              key={script.id}
              script={script}
              index={index}
              total={scripts.length}
              variant={variant}
              onUpdate={(updates) =>
                updateScript(script.id, updates)
              }
              onRemove={() => removeScript(script.id)}
              onMove={
                isCard
                  ? undefined
                  : (direction) => moveScript(index, direction)
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
