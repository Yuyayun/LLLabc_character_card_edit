import type { CharacterCard } from "@/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TokenEstimate } from "@/components/token/TokenEstimate"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

export function EditorDepth({ card, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* 深度提示 */}
      <section>
        <h3 className="text-sm font-semibold mb-3 pb-1.5 border-b">深度提示 (Depth Prompt)</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="depth-value" className="text-xs">注入深度 (0-4)</Label>
            <Input
              id="depth-value"
              type="number"
              min={0}
              max={4}
              value={card.depth_prompt.depth}
              onChange={(e) => {
                const v = Math.min(4, Math.max(0, Number(e.target.value) || 0))
                onChange({
                  ...card,
                  depth_prompt: { ...card.depth_prompt, depth: v },
                })
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="depth-role" className="text-xs">注入角色</Label>
            <Select
              value={card.depth_prompt.role}
              onValueChange={(v) =>
                onChange({
                  ...card,
                  depth_prompt: {
                    ...card.depth_prompt,
                    role: (v ?? "system") as "system" | "user" | "assistant",
                  },
                })
              }
            >
              <SelectTrigger id="depth-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">系统 (System)</SelectItem>
                <SelectItem value="user">用户 (User)</SelectItem>
                <SelectItem value="assistant">助手 (Assistant)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="depth-prompt" className="flex flex-wrap items-center gap-x-1 text-xs">
            提示内容
            <TokenEstimate text={card.depth_prompt.prompt} prefix=" · " className="text-[10px]" />
          </Label>
          <Textarea
            id="depth-prompt"
            value={card.depth_prompt.prompt}
            onChange={(e) =>
              onChange({
                ...card,
                depth_prompt: { ...card.depth_prompt, prompt: e.target.value },
              })
            }
            className="font-mono text-sm h-[160px] overflow-y-auto resize-y min-h-[100px]"
          />
        </div>
      </section>

      {/* 系统提示词 */}
      <section>
        <h3 className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-1.5 text-sm font-semibold">
          系统提示词
          <TokenEstimate text={card.system_prompt} className="text-[10px] font-normal" />
        </h3>
        <Textarea
          id="sys-prompt"
          value={card.system_prompt}
          onChange={(e) => onChange({ ...card, system_prompt: e.target.value })}
          className="font-mono text-sm h-[200px] overflow-y-auto resize-y min-h-[100px]"
        />
      </section>

      {/* Post-History 指令 */}
      <section>
        <h3 className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-1.5 text-sm font-semibold">
          Post-History 指令
          <TokenEstimate text={card.post_history_instructions} className="text-[10px] font-normal" />
        </h3>
        <Textarea
          id="post-history"
          value={card.post_history_instructions}
          onChange={(e) => onChange({ ...card, post_history_instructions: e.target.value })}
          className="font-mono text-sm h-[160px] overflow-y-auto resize-y min-h-[100px]"
        />
      </section>
    </div>
  )
}
