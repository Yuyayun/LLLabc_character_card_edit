import type { CharacterCard } from "@/types"
import { RegexList } from "@/components/regex/RegexList"
import type {
  RegexTransferMode,
  TransferRegexScriptsResult,
} from "@/lib/regexOperations"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
  canTransfer: boolean
  transferDisabledReason: string
  onTransferComplete: (
    result: TransferRegexScriptsResult,
    mode: RegexTransferMode
  ) => void
}

export function EditorRegex({
  card,
  onChange,
  canTransfer,
  transferDisabledReason,
  onTransferComplete,
}: Props) {
  return (
    <RegexList
      scripts={card.regex_scripts}
      onChange={(regexScripts) =>
        onChange({ ...card, regex_scripts: regexScripts })
      }
      variant="card"
      owner={{ kind: "card", id: card.id }}
      sourceUpdatedAt={card.updated_at}
      canTransfer={canTransfer}
      transferDisabledReason={transferDisabledReason}
      onTransferComplete={onTransferComplete}
    />
  )
}
