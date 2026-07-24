import type { RegexScript } from "@/types"
import { generateId } from "@/lib/utils"
import { isRecord } from "./shared"

const REGEX_PLACEMENTS_WITHOUT_MARKDOWN = [1, 2, 3, 5, 6]
const REGEX_FILENAME_CONTROL_CHARACTERS = [
  ...Array.from({ length: 32 }, (_, index) =>
    String.fromCharCode(index)
  ),
  String.fromCharCode(127),
].join("")
const REGEX_FILENAME_UNSAFE_CHARACTERS = new RegExp(
  `[\\s.<>:"/\\\\|?*${REGEX_FILENAME_CONTROL_CHARACTERS}]`,
  "g"
)

interface NormalizeRegexScriptOptions {
  regenerateId?: boolean
}

export interface RegexImportIssue {
  fileName: string
  entryIndex?: number
  message: string
}

export interface RegexImportResult {
  scripts: RegexScript[]
  successCount: number
  failureCount: number
  issues: RegexImportIssue[]
}

export interface RegexExportFile {
  content: string
  filename: string
}

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

export function migrateRegexPlacement(raw: unknown): {
  placement: number[]
  forceFormattingOnly: boolean
} {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      placement: [2],
      forceFormattingOnly: false,
    }
  }

  let placement = raw.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )
  placement = placement.filter(
    (value, index) => placement.indexOf(value) === index
  )

  if (placement.length === 0) {
    return {
      placement: [2],
      forceFormattingOnly: false,
    }
  }

  const forceFormattingOnly = placement.includes(0)
  if (forceFormattingOnly) {
    placement =
      placement.length === 1
        ? [...REGEX_PLACEMENTS_WITHOUT_MARKDOWN]
        : placement.filter((value) => value !== 0)
  }

  if (placement.includes(4)) {
    placement =
      placement.length === 1
        ? [3]
        : placement.filter((value) => value !== 4)
  }

  placement = placement.filter(
    (value, index) => placement.indexOf(value) === index
  )

  return {
    placement: placement.length > 0 ? placement : [2],
    forceFormattingOnly,
  }
}

export function normalizeRegexScript(
  raw: unknown,
  options: NormalizeRegexScriptOptions = {}
): RegexScript {
  const source = isRecord(raw) ? raw : {}
  const defaults = createDefaultRegexScript()
  const placementMigration = migrateRegexPlacement(source.placement)
  const markdownOnly =
    placementMigration.forceFormattingOnly ||
    (typeof source.markdownOnly === "boolean"
      ? source.markdownOnly
      : defaults.markdownOnly)
  const promptOnly =
    placementMigration.forceFormattingOnly ||
    (typeof source.promptOnly === "boolean"
      ? source.promptOnly
      : defaults.promptOnly)

  return {
    ...structuredClone(source),
    id:
      !options.regenerateId &&
      typeof source.id === "string" &&
      source.id
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
    placement: placementMigration.placement,
    disabled:
      typeof source.disabled === "boolean"
        ? source.disabled
        : defaults.disabled,
    markdownOnly,
    promptOnly,
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
  return Array.isArray(raw)
    ? raw.map((script) => normalizeRegexScript(script))
    : []
}

export function buildRegexScripts(
  scripts: RegexScript[]
): Record<string, unknown>[] {
  return scripts.map(
    (script) => structuredClone(script) as Record<string, unknown>
  )
}

function validateRegexImportEntry(
  raw: unknown
): { valid: true; script: RegexScript } | { valid: false; message: string } {
  if (!isRecord(raw)) {
    return {
      valid: false,
      message: "条目必须是 JSON 对象",
    }
  }

  if (
    typeof raw.scriptName !== "string" ||
    raw.scriptName.trim().length === 0
  ) {
    return {
      valid: false,
      message: "scriptName 必须是非空字符串",
    }
  }

  if ("findRegex" in raw && typeof raw.findRegex !== "string") {
    return {
      valid: false,
      message: "findRegex 必须是字符串",
    }
  }

  if (
    "replaceString" in raw &&
    typeof raw.replaceString !== "string"
  ) {
    return {
      valid: false,
      message: "replaceString 必须是字符串",
    }
  }

  if (
    "placement" in raw &&
    (!Array.isArray(raw.placement) ||
      !raw.placement.every(
        (value) =>
          typeof value === "number" && Number.isFinite(value)
      ))
  ) {
    return {
      valid: false,
      message: "placement 必须是数字数组",
    }
  }

  return {
    valid: true,
    script: normalizeRegexScript(raw, { regenerateId: true }),
  }
}

function rejectedFile(
  fileName: string,
  message: string
): RegexImportResult {
  return {
    scripts: [],
    successCount: 0,
    failureCount: 1,
    issues: [{ fileName, message }],
  }
}

export async function parseRegexFile(
  file: File
): Promise<RegexImportResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return rejectedFile(file.name, "无法读取文件")
  }

  if (text.trim().length === 0) {
    return rejectedFile(file.name, "文件为空")
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return rejectedFile(file.name, "JSON 格式无效")
  }

  if (!isRecord(raw) && !Array.isArray(raw)) {
    return rejectedFile(file.name, "顶层必须是对象或数组")
  }

  if (
    Array.isArray(raw) &&
    !raw.some((entry) => isRecord(entry))
  ) {
    return rejectedFile(file.name, "数组中没有可导入的对象")
  }

  const entries = Array.isArray(raw) ? raw : [raw]
  const scripts: RegexScript[] = []
  const issues: RegexImportIssue[] = []

  entries.forEach((entry, entryIndex) => {
    const result = validateRegexImportEntry(entry)
    if (result.valid) {
      scripts.push(result.script)
      return
    }
    issues.push({
      fileName: file.name,
      entryIndex,
      message: result.message,
    })
  })

  return {
    scripts,
    successCount: scripts.length,
    failureCount: issues.length,
    issues,
  }
}

export async function parseRegexFiles(
  files: Iterable<File>
): Promise<RegexImportResult> {
  const combined: RegexImportResult = {
    scripts: [],
    successCount: 0,
    failureCount: 0,
    issues: [],
  }

  for (const file of files) {
    const result = await parseRegexFile(file)
    combined.scripts.push(...result.scripts)
    combined.successCount += result.successCount
    combined.failureCount += result.failureCount
    combined.issues.push(...result.issues)
  }

  return combined
}

export function sanitizeRegexFilename(name: string): string {
  return name
    .replace(REGEX_FILENAME_UNSAFE_CHARACTERS, "_")
    .toLowerCase()
}

export function buildRegexExportFile(
  script: RegexScript
): RegexExportFile {
  return {
    content: JSON.stringify(structuredClone(script), null, 4),
    filename: `regex-${sanitizeRegexFilename(script.scriptName)}.json`,
  }
}

export function buildRegexBatchExportFile(
  scripts: RegexScript[],
  now = new Date()
): RegexExportFile {
  return {
    content: JSON.stringify(
      scripts.map((script) => structuredClone(script)),
      null,
      4
    ),
    filename: `regex-${now.toISOString()}.json`,
  }
}
