import type { RegexScript } from "@/types"
import { generateId } from "@/lib/utils"
import { isRecord } from "./shared"

export function createDefaultRegexScript(): RegexScript {
  return {
    id: generateId(),
    scriptName: "",
    findRegex: "",
    replaceString: "",
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  }
}

export function normalizeRegexScript(raw: unknown): RegexScript {
  const source = isRecord(raw) ? raw : {}
  const defaults = createDefaultRegexScript()

  return {
    ...structuredClone(source),
    id:
      typeof source.id === "string" && source.id
        ? source.id
        : defaults.id,
    scriptName:
      typeof source.scriptName === "string"
        ? source.scriptName
        : defaults.scriptName,
    findRegex:
      typeof source.findRegex === "string"
        ? source.findRegex
        : defaults.findRegex,
    replaceString:
      typeof source.replaceString === "string"
        ? source.replaceString
        : defaults.replaceString,
    trimStrings: Array.isArray(source.trimStrings)
      ? structuredClone(source.trimStrings) as string[]
      : defaults.trimStrings,
    placement: Array.isArray(source.placement)
      ? structuredClone(source.placement) as number[]
      : defaults.placement,
    disabled:
      typeof source.disabled === "boolean"
        ? source.disabled
        : defaults.disabled,
    markdownOnly:
      typeof source.markdownOnly === "boolean"
        ? source.markdownOnly
        : defaults.markdownOnly,
    promptOnly:
      typeof source.promptOnly === "boolean"
        ? source.promptOnly
        : defaults.promptOnly,
    runOnEdit:
      typeof source.runOnEdit === "boolean"
        ? source.runOnEdit
        : defaults.runOnEdit,
    substituteRegex:
      typeof source.substituteRegex === "number"
        ? source.substituteRegex
        : defaults.substituteRegex,
    minDepth:
      typeof source.minDepth === "number" ? source.minDepth : null,
    maxDepth:
      typeof source.maxDepth === "number" ? source.maxDepth : null,
  }
}

export function normalizeRegexScripts(raw: unknown): RegexScript[] {
  return Array.isArray(raw) ? raw.map(normalizeRegexScript) : []
}

export function buildRegexScripts(
  scripts: RegexScript[]
): Record<string, unknown>[] {
  return scripts.map(
    (script) => structuredClone(script) as Record<string, unknown>
  )
}
