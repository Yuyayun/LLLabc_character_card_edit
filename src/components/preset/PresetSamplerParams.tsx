import { useState } from "react"
import type { Preset } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  preset: Preset
  onChange: (preset: Preset) => void
}

type LabeledField = {
  key: keyof Preset
  label: string
  step?: string
  integer?: boolean
  min?: number
  max?: number
}

const FIELDS: LabeledField[] = [
  { key: "temperature", label: "温度", step: "0.01", min: 0, max: 5 },
  { key: "frequency_penalty", label: "频率惩罚", step: "0.01", min: -2, max: 2 },
  { key: "presence_penalty", label: "存在惩罚", step: "0.01", min: -2, max: 2 },
  { key: "top_p", label: "Top P", step: "0.01", min: 0, max: 1 },
  { key: "top_k", label: "Top K", integer: true, min: 0, max: 200 },
  { key: "top_a", label: "Top A", step: "0.01", min: 0, max: 1 },
  { key: "min_p", label: "Min P", step: "0.01", min: 0, max: 1 },
  { key: "repetition_penalty", label: "重复惩罚", step: "0.01", min: 0, max: 3 },
  { key: "openai_max_context", label: "最大上下文", integer: true, min: 0, max: 2000000 },
  { key: "openai_max_tokens", label: "最大Token", integer: true, min: 1, max: 128000 },
  { key: "seed", label: "种子", integer: true, min: -1 },
  { key: "n", label: "采样数", integer: true, min: 1, max: 16 },
]

export function PresetSamplerParams({ preset, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  function updateField(key: keyof Preset, value: number) {
    onChange({ ...preset, [key]: value })
  }

  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span>采样参数</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">
                    {f.label}
                  </label>
                  <Input
                    type="number"
                    step={f.step ?? "1"}
                    min={f.min}
                    max={f.max}
                    value={preset[f.key] as number}
                    onChange={(e) => {
                      const v = f.integer
                        ? parseInt(e.target.value) || 0
                        : parseFloat(e.target.value) || 0
                      updateField(f.key, v)
                    }}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
