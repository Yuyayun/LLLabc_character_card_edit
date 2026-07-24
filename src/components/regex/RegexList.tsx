import { useState } from "react"
import type { RegexScript } from "@/types"
import { downloadFile } from "@/lib/file"
import {
  buildRegexBatchExportFile,
  buildRegexExportFile,
  createDefaultRegexScript,
  parseRegexFiles,
} from "@/lib/parsers/regex"
import {
  reorderRegexScript,
  selectRegexScriptsInSourceOrder,
  type RegexOwnerRef,
  type RegexReorderTarget,
  type RegexTransferMode,
  type TransferRegexScriptsResult,
} from "@/lib/regexOperations"
import { toast } from "sonner"
import type { RegexListVariant } from "./constants"
import { RegexItem } from "./RegexItem"
import { RegexPositionDialog } from "./RegexPositionDialog"
import { RegexSelectionBar } from "./RegexSelectionBar"
import { RegexToolbar } from "./RegexToolbar"
import { RegexTransferDialog } from "./RegexTransferDialog"

interface TransferState {
  mode: RegexTransferMode
  scriptIds: string[]
}

interface Props {
  scripts: RegexScript[]
  onChange: (scripts: RegexScript[]) => void
  variant: RegexListVariant
  owner?: RegexOwnerRef
  sourceUpdatedAt?: Date
  canTransfer?: boolean
  transferDisabledReason?: string
  onTransferComplete?: (
    result: TransferRegexScriptsResult,
    mode: RegexTransferMode
  ) => void
  onCopyFromPreset?: () => void
}

export function RegexList({
  scripts,
  onChange,
  variant,
  owner,
  sourceUpdatedAt,
  canTransfer = false,
  transferDisabledReason,
  onTransferComplete,
  onCopyFromPreset,
}: Props) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [storedSelectedIds, setStoredSelectedIds] = useState<Set<string>>(
    new Set()
  )
  const [importing, setImporting] = useState(false)
  const [positionScriptId, setPositionScriptId] = useState<string | null>(
    null
  )
  const [transferState, setTransferState] =
    useState<TransferState | null>(null)

  const currentIds = new Set(scripts.map((script) => script.id))
  const selectedIds = new Set(
    [...storedSelectedIds].filter((id) => currentIds.has(id))
  )
  const selectedScripts = selectRegexScriptsInSourceOrder(
    scripts,
    selectedIds
  )
  const transferReady = Boolean(
    canTransfer && owner && sourceUpdatedAt
  )
  const disabledReason =
    transferDisabledReason ??
    "请先保存当前对象，再复制或移动 Regex。"
  const positionScript = scripts.find(
    (script) => script.id === positionScriptId
  )

  function addScript() {
    onChange([...scripts, createDefaultRegexScript()])
  }

  function updateScript(
    id: string,
    updates: Partial<RegexScript>
  ) {
    onChange(
      scripts.map((script) =>
        script.id === id ? { ...script, ...updates } : script
      )
    )
  }

  function removeScript(id: string) {
    const target = scripts.find((script) => script.id === id)
    if (
      !window.confirm(
        `确认删除 Regex「${target?.scriptName || "未命名脚本"}」？`
      )
    ) {
      return
    }
    onChange(scripts.filter((script) => script.id !== id))
    setStoredSelectedIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  function moveScript(id: string, target: RegexReorderTarget) {
    onChange(reorderRegexScript(scripts, id, target))
  }

  async function importFiles(files: File[]) {
    setImporting(true)
    try {
      const result = await parseRegexFiles(files)
      if (result.scripts.length > 0) {
        onChange([...scripts, ...result.scripts])
      }

      const issueSummary = result.issues
        .slice(0, 3)
        .map((issue) => {
          const entry =
            issue.entryIndex === undefined
              ? ""
              : ` 第 ${issue.entryIndex + 1} 项`
          return `${issue.fileName}${entry}：${issue.message}`
        })
        .join("；")

      if (result.successCount > 0 && result.failureCount > 0) {
        toast.warning(
          `已导入 ${result.successCount} 条，跳过 ${result.failureCount} 条`,
          { description: issueSummary }
        )
      } else if (result.successCount > 0) {
        toast.success(`已导入 ${result.successCount} 条 Regex`)
      } else {
        toast.error("没有可导入的 Regex", {
          description: issueSummary,
        })
      }
    } finally {
      setImporting(false)
    }
  }

  function exportSingle(script: RegexScript) {
    const file = buildRegexExportFile(script)
    downloadFile(file.content, file.filename, "application/json")
    toast.success("Regex 已导出")
  }

  function exportSelection() {
    if (selectedScripts.length === 0) return
    const file = buildRegexBatchExportFile(selectedScripts)
    downloadFile(file.content, file.filename, "application/json")
    toast.success(`已导出 ${selectedScripts.length} 条 Regex`)
    exitSelection()
  }

  function exitSelection() {
    setSelectionMode(false)
    setStoredSelectedIds(new Set())
  }

  function beginTransfer(
    mode: RegexTransferMode,
    scriptIds: string[]
  ) {
    if (!transferReady) {
      toast.info(disabledReason)
      return
    }
    setTransferState({ mode, scriptIds })
  }

  function handleTransferComplete(
    result: TransferRegexScriptsResult,
    mode: RegexTransferMode
  ) {
    if (onTransferComplete) {
      onTransferComplete(result, mode)
    } else if (mode === "move") {
      onChange(result.sourceScripts)
    }
    exitSelection()
  }

  return (
    <div className="space-y-4">
      {selectionMode ? (
        <RegexSelectionBar
          selectedCount={selectedIds.size}
          total={scripts.length}
          canTransfer={transferReady}
          transferDisabledReason={disabledReason}
          onSelectAll={() =>
            setStoredSelectedIds(
              new Set(scripts.map((script) => script.id))
            )
          }
          onClear={() => setStoredSelectedIds(new Set())}
          onExport={exportSelection}
          onCopy={() =>
            beginTransfer(
              "copy",
              selectedScripts.map((script) => script.id)
            )
          }
          onMove={() =>
            beginTransfer(
              "move",
              selectedScripts.map((script) => script.id)
            )
          }
          onCancel={exitSelection}
        />
      ) : (
        <RegexToolbar
          count={scripts.length}
          importing={importing}
          onAdd={addScript}
          onImport={importFiles}
          onEnterSelection={() => setSelectionMode(true)}
          onCopyFromPreset={onCopyFromPreset}
        />
      )}

      {scripts.length === 0 ? (
        <div className="rounded-lg border border-dashed py-14 text-center">
          <p className="text-sm text-muted-foreground">
            当前{variant === "card" ? "角色卡" : "预设"}暂无正则脚本
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            可以新建脚本，或导入 SillyTavern Regex JSON。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scripts.map((script, index) => (
            <RegexItem
              key={script.id}
              script={script}
              index={index}
              total={scripts.length}
              selectionMode={selectionMode}
              selected={selectedIds.has(script.id)}
              canTransfer={transferReady}
              transferDisabledReason={disabledReason}
              onSelectedChange={(selected) => {
                setStoredSelectedIds((current) => {
                  const next = new Set(current)
                  if (selected) next.add(script.id)
                  else next.delete(script.id)
                  return next
                })
              }}
              onUpdate={(updates) =>
                updateScript(script.id, updates)
              }
              onRemove={() => removeScript(script.id)}
              onMove={(target) => moveScript(script.id, target)}
              onRequestPosition={() =>
                setPositionScriptId(script.id)
              }
              onExport={() => exportSingle(script)}
              onTransfer={(mode) =>
                beginTransfer(mode, [script.id])
              }
            />
          ))}
        </div>
      )}

      {positionScript && (
        <RegexPositionDialog
          key={positionScript.id}
          open
          onOpenChange={(open) => {
            if (!open) setPositionScriptId(null)
          }}
          currentPosition={
            scripts.findIndex(
              (script) => script.id === positionScript.id
            ) + 1
          }
          total={scripts.length}
          onConfirm={(position) =>
            moveScript(positionScript.id, position)
          }
        />
      )}

      {owner && sourceUpdatedAt && transferState && (
        <RegexTransferDialog
          open
          onOpenChange={(open) => {
            if (!open) setTransferState(null)
          }}
          mode={transferState.mode}
          source={owner}
          sourceScripts={scripts}
          sourceUpdatedAt={sourceUpdatedAt}
          scriptIds={transferState.scriptIds}
          onComplete={handleTransferComplete}
        />
      )}
    </div>
  )
}
