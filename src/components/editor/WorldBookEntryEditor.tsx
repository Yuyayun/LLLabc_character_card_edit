import { useState } from "react"
import type { WorldBookEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

const positionOptions = [
  { value: "0", label: "角色定义之前" },
  { value: "1", label: "角色定义之后" },
  { value: "5", label: "示例消息前（↑EM）" },
  { value: "6", label: "示例消息后（↓EM）" },
  { value: "2", label: "作者注释之前" },
  { value: "3", label: "作者注释之后" },
  { value: "4-0", label: "@D ⚙ [系统]在深度" },
  { value: "4-1", label: "@D 👤 [用户]在深度" },
  { value: "4-2", label: "@D 🤖 [AI]在深度" },
  { value: "7", label: "Outlet" },
]

const logicLabels = [
  { value: "0", label: "与任意" },
  { value: "3", label: "与全部" },
  { value: "1", label: "非全部" },
  { value: "2", label: "非任意" },
]

const triStateLabels = [
  { value: "null", label: "使用全局" },
  { value: "true", label: "是" },
  { value: "false", label: "否" },
]

const triggerOptions = ["normal", "continue", "impersonate", "swipe", "regenerate", "quiet"]
const triggerLabels: Record<string, string> = {
  normal: "普通生成",
  continue: "继续生成",
  impersonate: "扮演",
  swipe: "滑动",
  regenerate: "重新生成",
  quiet: "静默",
}

function positionLabel(value: string): string {
  return positionOptions.find((p) => p.value === value)?.label ?? "角色定义之前"
}

function logicLabel(value: string): string {
  return logicLabels.find((l) => l.value === value)?.label ?? "与任意"
}

function triLabel(value: boolean | null): string {
  return triStateLabels.find((o) => o.value === triFmt(value))?.label ?? "使用全局"
}

function triParse(v: string): boolean | null {
  if (v === "true") return true
  if (v === "false") return false
  return null
}

function triFmt(v: boolean | null): string {
  if (v === true) return "true"
  if (v === false) return "false"
  return "null"
}

interface Props {
  entry: WorldBookEntry
  isOpen: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<WorldBookEntry>) => void
  onExtPatch: (patch: Record<string, unknown>) => void
  onDuplicate: () => void
  onRemove: () => void
}

export function WorldBookEntryEditor({
  entry,
  isOpen,
  onToggle,
  onUpdate,
  onExtPatch,
  onDuplicate,
  onRemove,
}: Props) {
  const ext = entry.extensions
  const role = Math.min(Math.max(ext.role ?? 0, 0), 2) as 0 | 1 | 2
  const atDepthKey = ext.position === 4 ? `4-${role}` : String(ext.position)
  const isAtDepth = ext.position === 4
  const isOutlet = ext.position === 7
  const [showMatchSources, setShowMatchSources] = useState(false)

  return (
    <section className={cn("border rounded-lg", !entry.enabled && "opacity-40 grayscale")}>
      {/* ====== Header Bar ====== */}
      <div className="bg-muted/30 rounded-t-lg">
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onToggle()
            }
          }}
        >
          {/* Expand chevron */}
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/50"
            tabIndex={-1}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {/* Kill switch */}
          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={entry.enabled}
              onCheckedChange={(v) => onUpdate({ enabled: v })}
              className="scale-75"
            />
          </span>

          {/* Entry state selector (🔵🟢🔗) */}
          <Select
            value={entry.constant ? "constant" : entry.vectorized ? "vectorized" : "normal"}
            onValueChange={(v) => {
              onUpdate({
                constant: v === "constant",
                vectorized: v === "vectorized",
              })
            }}
          >
            <SelectTrigger className="h-9 w-12 px-1 text-xs shrink-0 [&>svg]:hidden" onClick={(e) => e.stopPropagation()}>
              <SelectValue>
                <span>{entry.constant ? "🔵" : entry.vectorized ? "🔗" : "🟢"}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constant" title="常量">🔵 常量</SelectItem>
              <SelectItem value="normal" title="普通">🟢 普通</SelectItem>
              <SelectItem value="vectorized" title="向量化">🔗 向量化</SelectItem>
            </SelectContent>
          </Select>

          {/* Comment / title */}
          <input
            value={entry.comment}
            onChange={(e) => onUpdate({ comment: e.target.value })}
            placeholder={`条目 #${entry.id}`}
            className="min-w-0 flex-1 bg-transparent border-none outline-none text-sm px-1 h-9"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            aria-label="复制条目"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive shrink-0"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            aria-label="删除条目"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-[minmax(180px,1.4fr)_80px_80px_80px] sm:gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Position dropdown */}
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label className="text-[11px] text-muted-foreground">位置</Label>
            <Select
              value={atDepthKey}
              onValueChange={(v) => {
                if (!v) return
                const parts = v.split("-")
                const pos = Number(parts[0])
                const r = parts.length > 1 ? Number(parts[1]) : 0
                onExtPatch({ position: pos, role: pos === 4 ? r : 0 })
              }}
            >
              <SelectTrigger className="h-9 min-w-0 text-xs">
                <SelectValue>{positionLabel(atDepthKey)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {positionOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Depth (only atDepth) */}
          {isAtDepth && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">深度</Label>
              <Input
                type="number"
                min={0}
                value={ext.depth}
                onChange={(e) => onExtPatch({ depth: Number(e.target.value) })}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Order */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">顺序</Label>
            <Input
              type="number"
              value={entry.insertion_order}
              onChange={(e) => onUpdate({ insertion_order: Number(e.target.value) })}
              className="h-9 text-xs"
            />
          </div>

          {/* Probability */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">触发 %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={ext.probability}
              onChange={(e) => onExtPatch({ probability: Number(e.target.value) })}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ====== Expanded Drawer ====== */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t">
          {/* Trigger conditions */}
          <section className="space-y-3">
            <h4 className="text-xs font-medium">触发条件</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label className="text-xs">主要关键字</Label>
                <Input
                  value={entry.keys.join(", ")}
                  onChange={(e) =>
                    onUpdate({
                      keys: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="逗号分隔列表"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">逻辑</Label>
                <Select
                  value={String(entry.selectiveLogic)}
                  onValueChange={(v) => onUpdate({ selectiveLogic: Number(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>{logicLabel(String(entry.selectiveLogic))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {logicLabels.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">可选过滤器</Label>
                <Input
                  value={entry.secondary_keys.join(", ")}
                  onChange={(e) =>
                    onUpdate({
                      secondary_keys: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="逗号分隔列表（如果为空则忽略）"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  checked={entry.selective}
                  onCheckedChange={(v) => onUpdate({ selective: !!v })}
                  id={`sel-${entry.id}`}
                />
                <Label htmlFor={`sel-${entry.id}`} className="text-xs">使用可选过滤器</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  checked={ext.useProbability}
                  onCheckedChange={(v) => onExtPatch({ useProbability: !!v })}
                  id={`prob-${entry.id}`}
                />
                <Label htmlFor={`prob-${entry.id}`} className="text-xs">启用概率</Label>
              </div>
            </div>
          </section>

          {/* Entry overrides */}
          <section className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-medium">条目覆盖</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {isOutlet && (
                <div className="space-y-1.5">
                  <Label className="text-xs">出口名称</Label>
                  <Input
                    value={ext.outlet_name}
                    onChange={(e) => onExtPatch({ outlet_name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">扫描深度</Label>
                <Input
                  type="number"
                  value={ext.scan_depth ?? ""}
                  onChange={(e) =>
                    onExtPatch({ scan_depth: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="全局"
                  className="h-8 text-xs"
                />
              </div>
              {([
                ["case_sensitive", "区分大小写"],
                ["match_whole_words", "完整单词"],
                ["use_group_scoring", "分组计分"],
              ] as const).map(([key, label]) => {
                const val: boolean | null = ext[key]
                return (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Select
                      value={triFmt(val as boolean | null)}
                      onValueChange={(v) => { if (v) onExtPatch({ [key]: triParse(v) }) }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue>{triLabel(val as boolean | null)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {triStateLabels.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
              <div className="space-y-1.5">
                <Label className="text-xs">Automation ID</Label>
                <Input
                  value={ext.automation_id}
                  onChange={(e) => onExtPatch({ automation_id: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </section>

          {/* Content + recursion */}
          <section className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs">
                条目内容
                <span className="text-muted-foreground ml-2">UID: {entry.id}</span>
              </Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={entry.addMemo}
                    onCheckedChange={(v) => onUpdate({ addMemo: !!v })}
                    id={`memo-${entry.id}`}
                  />
                  <Label htmlFor={`memo-${entry.id}`} className="text-xs">添加备注</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={ext.exclude_recursion}
                    onCheckedChange={(v) => onExtPatch({ exclude_recursion: !!v })}
                    id={`exr-${entry.id}`}
                  />
                  <Label htmlFor={`exr-${entry.id}`} className="text-xs">不可递归</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={ext.prevent_recursion}
                    onCheckedChange={(v) => onExtPatch({ prevent_recursion: !!v })}
                    id={`prr-${entry.id}`}
                  />
                  <Label htmlFor={`prr-${entry.id}`} className="text-xs">防止进一步递归</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={ext.ignore_budget}
                    onCheckedChange={(v) => onExtPatch({ ignore_budget: !!v })}
                    id={`ib-${entry.id}`}
                  />
                  <Label htmlFor={`ib-${entry.id}`} className="text-xs">忽略预算</Label>
                </div>
              </div>
            </div>
            <Textarea
              value={entry.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={6}
              className="font-mono text-xs h-[140px] overflow-y-auto resize-y min-h-[100px]"
            />
            <div className="max-w-[180px] space-y-1.5">
              <Label className="text-xs">延迟到递归</Label>
              <Input
                type="number"
                min={0}
                value={ext.delay_until_recursion}
                onChange={(e) => onExtPatch({ delay_until_recursion: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
          </section>

          {/* Group & Timed effects */}
          <section className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">分组</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={ext.group}
                  onChange={(e) => onExtPatch({ group: e.target.value })}
                  placeholder="分组名"
                  className="h-8 text-xs flex-1"
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={ext.group_override}
                    onCheckedChange={(v) => onExtPatch({ group_override: !!v })}
                    id={`go-${entry.id}`}
                  />
                  <Label htmlFor={`go-${entry.id}`} className="text-xs text-nowrap">覆盖权重</Label>
                </div>
                <Input
                  type="number"
                  value={ext.group_weight}
                  onChange={(e) => onExtPatch({ group_weight: Number(e.target.value) })}
                  className="h-8 w-16 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["sticky", "粘性"],
                ["cooldown", "冷却"],
                ["delay", "延迟"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label} (消息数)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={ext[key] ?? ""}
                    onChange={(e) =>
                      onExtPatch({ [key]: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    placeholder="禁用"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Character filter + Triggers */}
          <section className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">角色过滤</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={(entry.character_filter_names ?? []).join(", ")}
                  onChange={(e) => {
                    const names = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    onUpdate({ character_filter_names: names.length > 0 ? names : undefined })
                  }}
                  placeholder="角色名 (逗号分隔)"
                  className="h-8 text-xs flex-1"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <Checkbox
                    checked={entry.character_filter_exclude ?? false}
                    onCheckedChange={(v) => onUpdate({ character_filter_exclude: !!v })}
                    id={`cfe-${entry.id}`}
                  />
                  <Label htmlFor={`cfe-${entry.id}`} className="text-xs text-nowrap">排除模式</Label>
                </div>
              </div>
              <Input
                value={(entry.character_filter_tags ?? []).join(", ")}
                onChange={(e) => {
                  const tags = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  onUpdate({ character_filter_tags: tags.length > 0 ? tags : undefined })
                }}
                placeholder="角色标签 (逗号分隔)"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">触发类型过滤</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {triggerOptions.map((t) => {
                  const checked = ext.triggers.includes(t)
                  return (
                    <label key={t} className="flex items-center gap-1 cursor-pointer text-xs">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          const next = checked
                            ? ext.triggers.filter((v) => v !== t)
                            : [...ext.triggers, t]
                          onExtPatch({ triggers: next })
                        }}
                      />
                      {triggerLabels[t]}
                    </label>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Match sources */}
          <section className="border-t pt-4">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium"
              onClick={() => setShowMatchSources(!showMatchSources)}
            >
              {showMatchSources ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              额外匹配来源
            </button>
            {showMatchSources && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {([
                  ["match_persona_description", "角色描述"],
                  ["match_character_description", "角色定义"],
                  ["match_character_personality", "角色性格"],
                  ["match_character_depth_prompt", "深度提示"],
                  ["match_scenario", "场景"],
                  ["match_creator_notes", "作者备注"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <Checkbox
                      checked={ext[key] as boolean}
                      onCheckedChange={(v) => onExtPatch({ [key]: !!v })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
