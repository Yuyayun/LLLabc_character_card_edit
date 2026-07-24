import type { RegexScript } from "@/types"
import { RegexList } from "@/components/regex/RegexList"

interface Props {
  scripts: RegexScript[]
  onChange: (scripts: RegexScript[]) => void
  onCopyFromPreset?: () => void
}

export function PresetRegex({
  scripts,
  onChange,
  onCopyFromPreset,
}: Props) {
  return (
    <RegexList
      scripts={scripts}
      onChange={onChange}
      variant="preset"
      onCopyFromPreset={onCopyFromPreset}
    />
  )
}
