import { useState } from "react"
import type { PresetPrompt } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { generateId } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: PresetPrompt | null
  onSave: (prompt: PresetPrompt) => void
}

const ROLES = [
  { value: "system", label: "系统" },
  { value: "user", label: "用户" },
  { value: "assistant", label: "AI助手" },
]
const POSITIONS = [
  { value: 0, label: "相对" },
  { value: 1, label: "聊天中" },
]
const DEPTHS = [0, 1, 2, 3, 4] as const

export function PresetPromptEditor(props: Props) {
  const editorKey = props.open
    ? (props.prompt?.identifier ?? "new")
    : "closed"

  return <PresetPromptEditorForm key={editorKey} {...props} />
}

function PresetPromptEditorForm({ open, onOpenChange, prompt, onSave }: Props) {
  const [name, setName] = useState(() => prompt?.name ?? "")
  const [content, setContent] = useState(() => prompt?.content ?? "")
  const [role, setRole] = useState<"system" | "user" | "assistant">(
    () => prompt?.role ?? "system"
  )
  const [injectionPosition, setInjectionPosition] = useState(
    () => prompt?.injection_position ?? 0
  )
  const [injectionDepth, setInjectionDepth] = useState(
    () => prompt?.injection_depth ?? 4
  )
  const [systemPrompt, setSystemPrompt] = useState(
    () => prompt?.system_prompt ?? false
  )
  const marker = prompt?.marker ?? false
  const [forbidOverrides, setForbidOverrides] = useState(
    () => prompt?.forbid_overrides ?? false
  )

  function handleSave() {
    if (!name.trim()) return
    onSave({
      identifier: prompt?.identifier ?? generateId(),
      name: name.trim(),
      enabled: prompt?.enabled ?? true,
      role,
      content,
      injection_position: injectionPosition,
      injection_depth: injectionDepth,
      injection_order: prompt?.injection_order ?? 100,
      system_prompt: systemPrompt,
      marker,
      forbid_overrides: forbidOverrides,
      injection_trigger: prompt?.injection_trigger ?? [],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">
            {prompt ? "编辑提示词" : "新建提示词"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* 名称 */}
          <div className="space-y-1">
            <Label className="text-xs">名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="可含 emoji 前缀"
              className="h-8 text-xs"
            />
          </div>

          {/* 角色 */}
          <div className="space-y-1">
            <Label className="text-xs">角色</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="flex h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* 内容 */}
          <div className="space-y-1">
            <Label className="text-xs">
              内容
              {marker && (
                <span className="text-muted-foreground ml-1">
                  （标记类条目不需要编辑内容）
                </span>
              )}
            </Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="提示词正文..."
              disabled={marker}
              className="flex min-h-[180px] w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-y"
            />
          </div>

          {/* 注入位置 + 深度 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">注入位置</Label>
              <select
                value={injectionPosition}
                onChange={(e) => setInjectionPosition(parseInt(e.target.value))}
                className="flex h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {injectionPosition === 1 && (
              <div className="space-y-1">
                <Label className="text-xs">深度</Label>
                <select
                  value={injectionDepth}
                  onChange={(e) => setInjectionDepth(parseInt(e.target.value))}
                  className="flex h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEPTHS.map((d) => (
                    <option key={d} value={d}>
                      @ 深度 {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 开关 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">系统提示词</Label>
              <Switch checked={systemPrompt} onCheckedChange={setSystemPrompt} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">禁止覆盖</Label>
              <Switch checked={forbidOverrides} onCheckedChange={setForbidOverrides} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
