import type { RegexScript } from "@/types"
import { RegexList } from "@/components/regex/RegexList"
import type {
  RegexTransferMode,
  TransferRegexScriptsResult,
} from "@/lib/regexOperations"

interface Props {
  presetId: string
  updatedAt: Date
  scripts: RegexScript[]
  onChange: (scripts: RegexScript[]) => void
  canTransfer: boolean
  transferDisabledReason: string
  onTransferComplete: (
    result: TransferRegexScriptsResult,
    mode: RegexTransferMode
  ) => void
  onCopyFromPreset?: () => void
}

export function PresetRegex({
  presetId,
  updatedAt,
  scripts,
  onChange,
  canTransfer,
  transferDisabledReason,
  onTransferComplete,
  onCopyFromPreset,
}: Props) {
  return (
    <RegexList
      scripts={scripts}
      onChange={onChange}
      variant="preset"
      owner={{ kind: "preset", id: presetId }}
      sourceUpdatedAt={updatedAt}
      canTransfer={canTransfer}
      transferDisabledReason={transferDisabledReason}
      onTransferComplete={onTransferComplete}
      onCopyFromPreset={onCopyFromPreset}
    />
  )
}
