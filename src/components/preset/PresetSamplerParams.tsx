import { useState } from "react"
import type { Preset } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
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
  slider?: boolean
}

const LENGTH_FIELDS: LabeledField[] = [
  { key: "openai_max_context", label: "最大上下文", integer: true, min: 0, max: 2000000 },
  { key: "openai_max_tokens", label: "最大Token", integer: true, min: 1, max: 128000 },
  { key: "seed", label: "种子", integer: true, min: -1 },
  { key: "n", label: "采样数", integer: true, min: 1, max: 16 },
]

const CORE_FIELDS: LabeledField[] = [
  { key: "temperature", label: "温度", step: "0.01", min: 0, max: 5, slider: true },
  { key: "top_k", label: "Top K", integer: true, min: 0, max: 200, slider: true },
  { key: "top_p", label: "Top P", step: "0.01", min: 0, max: 1, slider: true },
  { key: "min_p", label: "Min P", step: "0.01", min: 0, max: 1, slider: true },
  { key: "top_a", label: "Top A", step: "0.01", min: 0, max: 1, slider: true },
]

const PENALTY_FIELDS: LabeledField[] = [
  { key: "repetition_penalty", label: "重复惩罚", step: "0.01", min: 0, max: 3, slider: true },
  { key: "frequency_penalty", label: "频率惩罚", step: "0.01", min: -2, max: 2, slider: true },
  { key: "presence_penalty", label: "存在惩罚", step: "0.01", min: -2, max: 2, slider: true },
]

export function PresetSamplerParams({ preset, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  function updateField(key: keyof Preset, value: number) {
    onChange({ ...preset, [key]: value })
  }

  function parseField(f: LabeledField, raw: string): number {
    return f.integer ? parseInt(raw) || 0 : parseFloat(raw) || 0
  }

  function sliderStep(f: LabeledField): number {
    if (f.integer) return 1
    return Number(f.step ?? 0.01)
  }

  function FieldInput({ field }: { field: LabeledField }) {
    return (
      <Input
        type="number"
        step={field.step ?? "1"}
        min={field.min}
        max={field.max}
        value={preset[field.key] as number}
        onChange={(e) => updateField(field.key, parseField(field, e.target.value))}
        className="h-8 text-xs"
      />
    )
  }

  function SliderField({ field }: { field: LabeledField }) {
    const value = (preset[field.key] as number) ?? 0
    return (
      <div className="grid grid-cols-[72px_minmax(0,1fr)_78px] items-center gap-2">
        <label className="truncate text-xs text-muted-foreground">
          {field.label}
        </label>
        <Slider
          value={[value]}
          min={field.min}
          max={field.max}
          step={sliderStep(field)}
          onValueChange={(v) => {
            const raw = Array.isArray(v) ? v[0] : v
            updateField(field.key, field.integer ? Math.round(raw) : raw)
          }}
        />
        <FieldInput field={field} />
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
          <CardContent className="space-y-4 pb-4">
            <section className="space-y-2">
              <h4 className="text-xs font-medium">生成长度</h4>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {LENGTH_FIELDS.map((f) => (
                  <div key={f.key} className="min-w-0 space-y-1">
                    <label className="block truncate text-xs text-muted-foreground">
                      {f.label}
                    </label>
                    <FieldInput field={f} />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-medium">核心采样</h4>
              <div className="space-y-2">
                {CORE_FIELDS.map((f) => (
                  <SliderField key={f.key} field={f} />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-medium">惩罚</h4>
              <div className="space-y-2">
                {PENALTY_FIELDS.map((f) => (
                  <SliderField key={f.key} field={f} />
                ))}
              </div>
            </section>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
