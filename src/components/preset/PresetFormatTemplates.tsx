import { useState } from "react"
import type { Preset } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  preset: Preset
  onChange: (preset: Preset) => void
}

interface TemplateField {
  key: keyof Preset
  label: string
  textarea?: boolean
}

const TEMPLATE_FIELDS: TemplateField[] = [
  { key: "wi_format", label: "世界书格式" },
  { key: "scenario_format", label: "场景格式" },
  { key: "personality_format", label: "性格格式" },
  { key: "impersonation_prompt", label: "AI帮答提示词", textarea: true },
  { key: "new_chat_prompt", label: "新聊天提示词", textarea: true },
  { key: "new_group_chat_prompt", label: "新群聊提示词", textarea: true },
  { key: "new_example_chat_prompt", label: "新示例聊天提示词", textarea: true },
  { key: "continue_nudge_prompt", label: "继续推进提示词", textarea: true },
  { key: "group_nudge_prompt", label: "群聊推进提示词", textarea: true },
  { key: "assistant_prefill", label: "AI预设填充", textarea: true },
  { key: "assistant_impersonation", label: "AI帮答预设填充", textarea: true },
]

interface BehaviorToggle {
  key: keyof Preset
  label: string
  desc?: string
}

const BEHAVIOR_TOGGLES: BehaviorToggle[] = [
  { key: "stream_openai", label: "流式输出", desc: "启用 SSE 流式传输 AI 回复" },
  { key: "squash_system_messages", label: "合并系统消息", desc: "将多条系统消息合并为一条" },
  { key: "continue_prefill", label: "继续预填充", desc: "请求继续生成时使用预设填充" },
  { key: "function_calling", label: "函数调用", desc: "启用 AI 工具调用能力" },
  { key: "show_thoughts", label: "显示思考", desc: "展示 AI 推理过程的思考内容" },
  { key: "max_context_unlocked", label: "解锁最大上下文", desc: "允许使用 API 全部上下文窗口" },
  { key: "wrap_in_quotes", label: "引号包裹", desc: "用引号包裹用户输入" },
]

export function PresetFormatTemplates({ preset, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  function updateField(key: keyof Preset, value: unknown) {
    onChange({ ...preset, [key]: value })
  }

  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span>格式化模板与行为</span>
          <span className="inline-flex items-center justify-center h-6 w-6">
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <div
        className={cn(
          "grid transition-all duration-200",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pb-4 space-y-4">
            {/* 模板字段 */}
            <div className="space-y-3">
              {TEMPLATE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {f.label}
                  </Label>
                  {f.textarea ? (
                    <textarea
                      value={(preset[f.key] as string) ?? ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      className="flex min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                      placeholder={`{{macro}} 或普通文本`}
                    />
                  ) : (
                    <Input
                      value={(preset[f.key] as string) ?? ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder="{{macro}} 或普通文本"
                      className="h-7 text-xs font-mono"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* 行为开关 */}
            <div className="border-t pt-4">
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                行为开关
              </button>
              {showAdvanced && (
                <div className="space-y-2">
                  {BEHAVIOR_TOGGLES.map((t) => (
                    <div key={t.key} className="flex items-center justify-between py-1">
                      <div>
                        <Label className="text-xs">{t.label}</Label>
                        {t.desc && (
                          <p className="text-[10px] text-muted-foreground">
                            {t.desc}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={(preset[t.key] as boolean) ?? false}
                        onCheckedChange={(v) => updateField(t.key, v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 高级数值参数 */}
            <div className="border-t pt-4">
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                高级参数
              </button>
              {showAdvanced && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">名称行为</Label>
                    <select
                      value={preset.names_behavior ?? 0}
                      onChange={(e) => updateField("names_behavior", parseInt(e.target.value))}
                      className="flex h-7 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={0}>无</option>
                      <option value={1}>补全</option>
                      <option value={-1}>静默</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">推理力度</Label>
                    <select
                      value={preset.reasoning_effort ?? "auto"}
                      onChange={(e) => updateField("reasoning_effort", e.target.value)}
                      className="flex h-7 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="auto">自动</option>
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">续写后缀</Label>
                    <Input
                      value={(preset.continue_postfix as string) ?? ""}
                      onChange={(e) => updateField("continue_postfix", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">空消息文本</Label>
                    <Input
                      value={(preset.send_if_empty as string) ?? ""}
                      onChange={(e) => updateField("send_if_empty", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
