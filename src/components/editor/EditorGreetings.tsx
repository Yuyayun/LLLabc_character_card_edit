import type { CharacterCard } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

function GreetingList({
  title,
  label,
  placeholder,
  items,
  onUpdate,
  onAdd,
  onRemove,
  onMove,
}: {
  title: string
  label: string
  placeholder: string
  items: string[]
  onUpdate: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}) {
  const idPrefix = title === "群组开场白" ? "group-greet" : "greet"
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          共 {items.length} 条{title}
        </span>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          添加{title}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无{title}，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const itemId = `${idPrefix}-${index}`
            return (
            <section key={index} className="border-l-2 border-muted pl-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor={itemId} className="text-sm font-semibold">{label} #{index + 1}</Label>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMove(index, 1)}
                    disabled={index === items.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Textarea
                id={itemId}
                value={item}
                onChange={(e) => onUpdate(index, e.target.value)}
                className="font-sans text-sm leading-relaxed h-[200px] overflow-y-auto resize-y min-h-[120px]"
                placeholder={placeholder}
              />
            </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function EditorGreetings({ card, onChange }: Props) {
  function addGreeting() {
    onChange({ ...card, alternate_greetings: [...card.alternate_greetings, ""] })
  }
  function updateGreeting(index: number, value: string) {
    const updated = [...card.alternate_greetings]
    updated[index] = value
    onChange({ ...card, alternate_greetings: updated })
  }
  function removeGreeting(index: number) {
    onChange({ ...card, alternate_greetings: card.alternate_greetings.filter((_, i) => i !== index) })
  }
  function moveGreeting(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= card.alternate_greetings.length) return
    const updated = [...card.alternate_greetings]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    onChange({ ...card, alternate_greetings: updated })
  }

  function addGroupGreeting() {
    onChange({ ...card, group_only_greetings: [...card.group_only_greetings, ""] })
  }
  function updateGroupGreeting(index: number, value: string) {
    const updated = [...card.group_only_greetings]
    updated[index] = value
    onChange({ ...card, group_only_greetings: updated })
  }
  function removeGroupGreeting(index: number) {
    onChange({ ...card, group_only_greetings: card.group_only_greetings.filter((_, i) => i !== index) })
  }
  function moveGroupGreeting(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= card.group_only_greetings.length) return
    const updated = [...card.group_only_greetings]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    onChange({ ...card, group_only_greetings: updated })
  }

  return (
    <div className="space-y-10">
      <GreetingList
        title="开场白"
        label="开场白"
        placeholder="输入开场白内容..."
        items={card.alternate_greetings}
        onUpdate={updateGreeting}
        onAdd={addGreeting}
        onRemove={removeGreeting}
        onMove={moveGreeting}
      />
      <GreetingList
        title="群组开场白"
        label="群组开场白"
        placeholder="输入群组开场白内容..."
        items={card.group_only_greetings}
        onUpdate={updateGroupGreeting}
        onAdd={addGroupGreeting}
        onRemove={removeGroupGreeting}
        onMove={moveGroupGreeting}
      />
    </div>
  )
}
