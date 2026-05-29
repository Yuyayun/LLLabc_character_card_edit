import type { CharacterCard } from "@/types"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

export function EditorDefinition({ card, onChange }: Props) {
  function update<K extends keyof CharacterCard>(key: K, value: CharacterCard[K]) {
    onChange({ ...card, [key]: value })
  }

  return (
    <div className="space-y-8">
      {/* 角色描述 - 核心内容，大空间 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="def-description" className="text-sm font-semibold">角色描述 (Description)</Label>
          <span className="text-[11px] text-muted-foreground">
            {card.description.length.toLocaleString()} 字
          </span>
        </div>
        <Textarea
          id="def-description"
          value={card.description}
          onChange={(e) => update("description", e.target.value)}
          className="font-sans text-sm leading-relaxed h-[400px] overflow-y-auto resize-y min-h-[200px]"
        />
      </section>

      {/* 性格 */}
      <section>
        <Label htmlFor="def-personality" className="text-sm font-semibold mb-2 block">性格 (Personality)</Label>
        <Textarea
          id="def-personality"
          value={card.personality}
          onChange={(e) => update("personality", e.target.value)}
          className="font-sans text-sm leading-relaxed h-[160px] overflow-y-auto resize-y min-h-[100px]"
        />
      </section>

      {/* 场景 */}
      <section>
        <Label htmlFor="def-scenario" className="text-sm font-semibold mb-2 block">场景 (Scenario)</Label>
        <Textarea
          id="def-scenario"
          value={card.scenario}
          onChange={(e) => update("scenario", e.target.value)}
          className="font-sans text-sm leading-relaxed h-[160px] overflow-y-auto resize-y min-h-[100px]"
        />
      </section>

      {/* 第一条消息 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="def-first-mes" className="text-sm font-semibold">第一条消息 (First Message)</Label>
          <span className="text-[11px] text-muted-foreground">
            {card.first_mes.length.toLocaleString()} 字
          </span>
        </div>
        <Textarea
          id="def-first-mes"
          value={card.first_mes}
          onChange={(e) => update("first_mes", e.target.value)}
          className="font-sans text-sm leading-relaxed h-[240px] overflow-y-auto resize-y min-h-[150px]"
        />
      </section>

      {/* 对话示例 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="def-mes-example" className="text-sm font-semibold">对话示例 (Message Example)</Label>
          <span className="text-[11px] text-muted-foreground">
            {card.mes_example.length.toLocaleString()} 字
          </span>
        </div>
        <Textarea
          id="def-mes-example"
          value={card.mes_example}
          onChange={(e) => update("mes_example", e.target.value)}
          className="font-sans text-sm leading-relaxed h-[260px] overflow-y-auto resize-y min-h-[150px]"
        />
      </section>
    </div>
  )
}
