import type { CharacterCard, RegexScript } from "@/types"
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
import { Plus, Trash2 } from "lucide-react"
import { cn, generateId } from "@/lib/utils"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

const placementLabels: { value: number; label: string }[] = [
  { value: 1, label: "用户输入" },
  { value: 2, label: "AI 输出" },
  { value: 3, label: "快捷命令" },
  { value: 4, label: "世界信息 (前)" },
  { value: 5, label: "世界信息" },
  { value: 6, label: "推理" },
]

export function EditorRegex({ card, onChange }: Props) {
  function addScript() {
    const newScript: RegexScript = {
      id: generateId(),
      scriptName: "",
      findRegex: "",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
    }
    onChange({ ...card, regex_scripts: [...card.regex_scripts, newScript] })
  }

  function updateScript(id: string, updates: Partial<RegexScript>) {
    onChange({
      ...card,
      regex_scripts: card.regex_scripts.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })
  }

  function togglePlacement(id: string, val: number) {
    const script = card.regex_scripts.find((s) => s.id === id)
    if (!script) return
    const next = script.placement.includes(val)
      ? script.placement.filter((v) => v !== val)
      : [...script.placement, val]
    updateScript(id, { placement: next })
  }

  function removeScript(id: string) {
    onChange({
      ...card,
      regex_scripts: card.regex_scripts.filter((s) => s.id !== id),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          共 {card.regex_scripts.length} 条脚本
        </span>
        <Button variant="outline" size="sm" onClick={addScript}>
          <Plus className="h-4 w-4 mr-1" />
          添加脚本
        </Button>
      </div>

      {card.regex_scripts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          暂无正则脚本
        </div>
      ) : (
        <div className="space-y-6">
          {card.regex_scripts.map((script) => (
            <section
              key={script.id}
              className={cn("border rounded-lg", script.disabled && "opacity-50")}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-lg">
                <Input
                  value={script.scriptName}
                  onChange={(e) => updateScript(script.id, { scriptName: e.target.value })}
                  placeholder="脚本名称"
                  className="max-w-xs h-7 text-sm border-none bg-transparent px-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeScript(script.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* findRegex & replaceString */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">正则匹配 (findRegex)</Label>
                    <Textarea
                      value={script.findRegex}
                      onChange={(e) => updateScript(script.id, { findRegex: e.target.value })}
                      rows={3}
                      className="font-mono text-xs max-h-32"
                      placeholder="/pattern/s"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">替换内容 (replaceString)</Label>
                    <Textarea
                      value={script.replaceString}
                      onChange={(e) => updateScript(script.id, { replaceString: e.target.value })}
                      rows={3}
                      className="font-mono text-xs max-h-32"
                    />
                  </div>
                </div>

                {/* 作用范围 (placement) */}
                <div className="space-y-1.5">
                  <Label className="text-xs">作用范围</Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {placementLabels.map((p) => (
                      <label key={p.value} className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <Checkbox
                          checked={script.placement.includes(p.value)}
                          onCheckedChange={() => togglePlacement(script.id, p.value)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 替换宏 + 深度 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">替换宏</Label>
                    <Select
                      value={String(script.substituteRegex)}
                      onValueChange={(v) => updateScript(script.id, { substituteRegex: Number(v) })}
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">最小深度</Label>
                    <Input
                      type="number"
                      value={script.minDepth ?? ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === "") { updateScript(script.id, { minDepth: null }); return }
                        const n = Number(v)
                        if (Number.isFinite(n)) updateScript(script.id, { minDepth: n })
                      }}
                      placeholder="无限制"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">最大深度</Label>
                    <Input
                      type="number"
                      value={script.maxDepth ?? ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === "") { updateScript(script.id, { maxDepth: null }); return }
                        const n = Number(v)
                        if (Number.isFinite(n)) updateScript(script.id, { maxDepth: n })
                      }}
                      placeholder="无限制"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* 选项开关 */}
                <div className="flex items-center gap-x-6 gap-y-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      checked={script.markdownOnly}
                      onCheckedChange={(v) => updateScript(script.id, { markdownOnly: !!v })}
                      id={`md-${script.id}`}
                    />
                    <Label htmlFor={`md-${script.id}`} className="text-xs">仅格式显示</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      checked={script.promptOnly}
                      onCheckedChange={(v) => updateScript(script.id, { promptOnly: !!v })}
                      id={`po-${script.id}`}
                    />
                    <Label htmlFor={`po-${script.id}`} className="text-xs">仅格式提示词</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      checked={script.runOnEdit}
                      onCheckedChange={(v) => updateScript(script.id, { runOnEdit: !!v })}
                      id={`roe-${script.id}`}
                    />
                    <Label htmlFor={`roe-${script.id}`} className="text-xs">编辑时运行</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={!script.disabled}
                      onCheckedChange={(v) => updateScript(script.id, { disabled: !v })}
                      id={`dis-${script.id}`}
                    />
                    <Label htmlFor={`dis-${script.id}`} className="text-xs">
                      {script.disabled ? "已禁用" : "已启用"}
                    </Label>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
