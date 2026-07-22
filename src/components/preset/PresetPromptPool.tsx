import type { PresetPrompt } from "@/types"
import { Button } from "@/components/ui/button"
import { Link, Pencil, Trash2 } from "lucide-react"
import { TokenEstimate } from "@/components/token/TokenEstimate"
import { isPresetMarkerPrompt } from "@/lib/presetMarkers"

interface Props {
  prompts: PresetPrompt[]
  linkedIdentifiers: Set<string>
  onAddToLinked: (identifier: string) => void
  onEdit: (prompt: PresetPrompt) => void
  onDelete: (identifier: string) => void
  search: string
}

const roleLabels: Record<string, string> = {
  system: "系统",
  user: "用户",
  assistant: "AI",
}

function promptKind(prompt: PresetPrompt): string {
  if (isPresetMarkerPrompt(prompt)) return "占位节点"
  if (!prompt.content) return "空内容"
  return "提示词"
}

function positionLabel(prompt: PresetPrompt): string {
  if (prompt.injection_position === 1) return `聊天中 @ 深度 ${prompt.injection_depth ?? 4}`
  return "相对"
}

export function PresetPromptPool({
  prompts,
  linkedIdentifiers,
  onAddToLinked,
  onEdit,
  onDelete,
  search,
}: Props) {
  const filtered = prompts.filter((p) => {
    if (!search) return true
    const lower = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(lower) ||
      p.content.toLowerCase().includes(lower)
    )
  })

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        {search ? "没有匹配的条目" : "池为空，请新建提示词"}
      </p>
    )
  }

  const grouped = [
    { title: "占位节点", items: filtered.filter((p) => promptKind(p) === "占位节点") },
    { title: "提示词", items: filtered.filter((p) => promptKind(p) === "提示词") },
    { title: "空内容", items: filtered.filter((p) => promptKind(p) === "空内容") },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <section key={group.title} className="space-y-1">
          <h4 className="px-1 text-[11px] font-medium text-muted-foreground">
            {group.title}
          </h4>
          <ul className="space-y-1">
            {group.items.map((p) => {
        const isLinked = linkedIdentifiers.has(p.identifier)
        return (
          <li
            key={p.identifier}
            className="flex items-start gap-2 px-3 py-2 rounded-md border border-transparent hover:bg-muted/50 min-h-[44px]"
          >
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium truncate block">
                {p.name || "未命名"}
              </span>
              <span className="text-[10px] text-muted-foreground line-clamp-1 block mt-0.5">
                {[
                  roleLabels[p.role] ?? "未指定角色",
                  positionLabel(p),
                  `${p.content?.length ?? 0} 字符`,
                ].filter(Boolean).join(" · ")}
                {!isPresetMarkerPrompt(p) && (
                  <TokenEstimate text={p.content} prefix=" · " />
                )}
              </span>
              <span className="text-[10px] text-muted-foreground/80 line-clamp-1 block mt-0.5">
                {p.content
                  ? p.content.slice(0, 80).replace(/\n/g, " ")
                  : "（空内容）"}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {isLinked ? (
                <span className="text-[10px] text-emerald-500 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full">
                  已链接
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="添加到列表"
                  onClick={() => onAddToLinked(p.identifier)}
                >
                  <Link className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(p)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(p.identifier)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </li>
        )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
