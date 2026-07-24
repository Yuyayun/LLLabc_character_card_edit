import type { CharacterCard } from "@/types"
import { RegexList } from "@/components/regex/RegexList"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

export function EditorRegex({ card, onChange }: Props) {
  return (
    <RegexList
      scripts={card.regex_scripts}
      onChange={(regexScripts) =>
        onChange({ ...card, regex_scripts: regexScripts })
      }
      variant="card"
    />
  )
}
