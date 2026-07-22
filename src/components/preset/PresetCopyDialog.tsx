import { useEffect, useMemo, useState } from "react"
import type { Preset, PresetPrompt, PresetPromptOrder, RegexScript } from "@/types"
import { db } from "@/lib/db"
import { generateId } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Copy } from "lucide-react"
import { getEditablePresetOrder } from "@/lib/presetOrder"
import { isPresetMarkerPrompt } from "@/lib/presetMarkers"

interface CopyPayload {
  prompts: PresetPrompt[]
  promptInsertAfter: string | null
  regexScripts: RegexScript[]
  regexInsertAfter: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPresetId: string
  targetPrompts: PresetPrompt[]
  targetOrder: PresetPromptOrder[]
  targetRegexScripts: RegexScript[]
  onCopy: (payload: CopyPayload) => void
}

function promptKind(prompt: PresetPrompt): string {
  if (isPresetMarkerPrompt(prompt)) return "占位节点"
  if (!prompt.content) return "空内容"
  return "提示词"
}

function promptName(prompt: PresetPrompt): string {
  return prompt.name || "未命名"
}

function regexName(script: RegexScript): string {
  return script.scriptName || "未命名正则"
}

function uniqueCopyName(rawName: string, usedNames: Set<string>): string {
  const base = rawName.trim() || "未命名"
  if (!usedNames.has(base)) {
    usedNames.add(base)
    return base
  }

  let candidate = `${base}副本`
  let index = 2
  while (usedNames.has(candidate)) {
    candidate = `${base}副本${index}`
    index += 1
  }
  usedNames.add(candidate)
  return candidate
}

function presetOrderIdentifiers(preset: Preset): string[] {
  return getEditablePresetOrder(preset).map((entry) => entry.identifier)
}

function orderedPresetPrompts(preset: Preset): PresetPrompt[] {
  const promptMap = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]))
  const seen = new Set<string>()
  const ordered: PresetPrompt[] = []

  for (const identifier of presetOrderIdentifiers(preset)) {
    const prompt = promptMap.get(identifier)
    if (!prompt || seen.has(identifier)) continue
    ordered.push(prompt)
    seen.add(identifier)
  }

  for (const prompt of preset.prompts) {
    if (seen.has(prompt.identifier)) continue
    ordered.push(prompt)
  }

  return ordered
}

export function PresetCopyDialog({
  open,
  onOpenChange,
  currentPresetId,
  targetPrompts,
  targetOrder,
  targetRegexScripts,
  onCopy,
}: Props) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [sourceId, setSourceId] = useState("")
  const [tab, setTab] = useState<"prompts" | "regex">("prompts")
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set())
  const [selectedRegexIds, setSelectedRegexIds] = useState<Set<string>>(new Set())
  const [promptInsertAfter, setPromptInsertAfter] = useState("__start")
  const [regexInsertAfter, setRegexInsertAfter] = useState("__start")

  useEffect(() => {
    if (!open) return
    db.presets.toArray().then((all) => {
      const sorted = all
        .filter((preset) => preset.id !== currentPresetId)
        .sort((a, b) => a.name.localeCompare(b.name))
      setPresets(sorted)
      setSourceId((prev) => {
        if (prev && sorted.some((preset) => preset.id === prev)) return prev
        return sorted[0]?.id ?? ""
      })
      setSelectedPromptIds(new Set())
      setSelectedRegexIds(new Set())
    })
  }, [currentPresetId, open])

  const sourcePreset = presets.find((preset) => preset.id === sourceId)
  const sourcePrompts = useMemo(
    () => (sourcePreset ? orderedPresetPrompts(sourcePreset) : []),
    [sourcePreset]
  )
  const sourceRegexScripts =
    (sourcePreset?.extensions?.regex_scripts as RegexScript[] | undefined) ?? []
  const targetPromptMap = new Map(targetPrompts.map((prompt) => [prompt.identifier, prompt]))
  const selectedCount = selectedPromptIds.size + selectedRegexIds.size

  function resetSelectionForSource(source: string) {
    setSourceId(source)
    setSelectedPromptIds(new Set())
    setSelectedRegexIds(new Set())
  }

  function togglePrompt(prompt: PresetPrompt, checked: boolean) {
    if (isPresetMarkerPrompt(prompt)) return
    setSelectedPromptIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(prompt.identifier)
      else next.delete(prompt.identifier)
      return next
    })
  }

  function toggleRegex(script: RegexScript, checked: boolean) {
    setSelectedRegexIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(script.id)
      else next.delete(script.id)
      return next
    })
  }

  function handleCopy() {
    if (!sourcePreset) return

    const usedPromptNames = new Set(targetPrompts.map((prompt) => promptName(prompt)))
    const copiedPrompts = sourcePrompts
      .filter((prompt) => selectedPromptIds.has(prompt.identifier) && !isPresetMarkerPrompt(prompt))
      .map((prompt) => ({
        ...structuredClone(prompt),
        identifier: generateId(),
        name: uniqueCopyName(promptName(prompt), usedPromptNames),
      }))

    const usedRegexNames = new Set(targetRegexScripts.map(regexName))
    const copiedRegex = sourceRegexScripts
      .filter((script) => selectedRegexIds.has(script.id))
      .map((script) => ({
        ...structuredClone(script),
        id: generateId(),
        scriptName: uniqueCopyName(regexName(script), usedRegexNames),
      }))

    onCopy({
      prompts: copiedPrompts,
      promptInsertAfter: promptInsertAfter === "__start" ? null : promptInsertAfter,
      regexScripts: copiedRegex,
      regexInsertAfter: regexInsertAfter === "__start" ? null : regexInsertAfter,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Copy className="h-4 w-4" />
            从其他预设复制
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">来源预设</label>
            <select
              value={sourceId}
              onChange={(event) => resetSelectionForSource(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {presets.length === 0 ? (
                <option value="">没有其他预设</option>
              ) : (
                presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name || "未命名预设"}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex w-fit items-center gap-0.5 rounded-md bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => setTab("prompts")}
              className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${
                tab === "prompts"
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              提示词 ({selectedPromptIds.size})
            </button>
            <button
              type="button"
              onClick={() => setTab("regex")}
              className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${
                tab === "regex"
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              正则 ({selectedRegexIds.size})
            </button>
          </div>

          {tab === "prompts" ? (
            <section className="space-y-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">插入位置</label>
                <select
                  value={promptInsertAfter}
                  onChange={(event) => setPromptInsertAfter(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="__start">预设最前</option>
                  {targetOrder.map((entry) => {
                    const prompt = targetPromptMap.get(entry.identifier)
                    return (
                      <option key={entry.identifier} value={entry.identifier}>
                        放到 {prompt?.name || "未命名"} 后面
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="max-h-[380px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {sourcePrompts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    来源预设没有提示词条目
                  </p>
                ) : (
                  sourcePrompts.map((prompt) => {
                    const disabled = isPresetMarkerPrompt(prompt)
                    return (
                      <label
                        key={prompt.identifier}
                        className={`flex items-start gap-2 rounded-md px-2 py-2 ${
                          disabled ? "opacity-55" : "cursor-pointer hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedPromptIds.has(prompt.identifier)}
                          disabled={disabled}
                          onCheckedChange={(checked) => togglePrompt(prompt, !!checked)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal break-words text-xs font-medium leading-relaxed">
                            {promptName(prompt)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant={disabled ? "outline" : "secondary"} className="h-4 px-1.5 text-[10px]">
                              {promptKind(prompt)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {prompt.content?.length ?? 0} 字符
                            </span>
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">插入位置</label>
                <select
                  value={regexInsertAfter}
                  onChange={(event) => setRegexInsertAfter(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="__start">正则最前</option>
                  {targetRegexScripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      放到 {regexName(script)} 后面
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-[380px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {sourceRegexScripts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    来源预设没有正则脚本
                  </p>
                ) : (
                  sourceRegexScripts.map((script) => (
                    <label
                      key={script.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedRegexIds.has(script.id)}
                        onCheckedChange={(checked) => toggleRegex(script, !!checked)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words text-xs font-medium leading-relaxed">
                          {regexName(script)}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {script.disabled ? "已禁用" : "已启用"} · {script.placement.length} 个作用范围
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCopy} disabled={!sourcePreset || selectedCount === 0}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            复制 {selectedCount} 项
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
