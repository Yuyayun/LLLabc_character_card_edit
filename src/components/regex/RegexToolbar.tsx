import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  CheckSquare2,
  Copy,
  FileUp,
  Plus,
} from "lucide-react"

interface Props {
  count: number
  importing: boolean
  onAdd: () => void
  onImport: (files: File[]) => void | Promise<void>
  onEnterSelection: () => void
  onCopyFromPreset?: () => void
}

export function RegexToolbar({
  count,
  importing,
  onAdd,
  onImport,
  onEnterSelection,
  onCopyFromPreset,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        共 {count} 条正则脚本
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {onCopyFromPreset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyFromPreset}
          >
            <Copy />
            从预设复制
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            if (files.length > 0) void onImport(files)
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp />
          {importing ? "导入中…" : "导入"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0}
          onClick={onEnterSelection}
        >
          <CheckSquare2 />
          选择
        </Button>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus />
          添加脚本
        </Button>
      </div>
    </div>
  )
}
