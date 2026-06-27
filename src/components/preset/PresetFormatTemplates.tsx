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
]

const UTILITY_PROMPT_FIELDS: TemplateField[] = [
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

  function TemplateControl({ field }: { field: TemplateField }) {
    return (
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">
          {field.label}
        </Label>
        {field.textarea ? (
          <textarea
            value={(preset[field.key] as string) ?? ""}
            onChange={(e) => updateField(field.key, e.target.value)}
            className="flex min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="{{macro}} 或普通文本"
          />
        ) : (
          <Input
            value={(preset[field.key] as string) ?? ""}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder="{{macro}} 或普通文本"
            className="h-8 text-xs font-mono"
          />
        )}
      </div>
    )
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
          <CardContent className="pb-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <section className="space-y-3">
                  <h4 className="text-xs font-medium">格式模板</h4>
                  {TEMPLATE_FIELDS.map((f) => (
                    <TemplateControl key={f.key} field={f} />
                  ))}
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h4 className="text-xs font-medium">实用提示词</h4>
                  {UTILITY_PROMPT_FIELDS.map((f) => (
                    <TemplateControl key={f.key} field={f} />
                  ))}
                </section>
              </div>

              <aside className="space-y-4 lg:border-l lg:pl-4">
                <section className="space-y-2">
                  <h4 className="text-xs font-medium">行为开关</h4>
                  {BEHAVIOR_TOGGLES.map((t) => (
                    <div key={t.key} className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0">
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
                </section>

                <section className="border-t pt-4">
                  <button
                    type="button"
                    className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    高级参数
                  </button>
                  {showAdvanced && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">名称行为</Label>
                        <select
                          value={preset.names_behavior ?? 0}
                          onChange={(e) => updateField("names_behavior", parseInt(e.target.value))}
                          className="flex h-8 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
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
                          className="flex h-8 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
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
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">空消息文本</Label>
                        <Input
                          value={(preset.send_if_empty as string) ?? ""}
                          onChange={(e) => updateField("send_if_empty", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
