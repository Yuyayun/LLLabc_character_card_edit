import type { CharacterCard, Preset, RegexScript } from "@/types"
import { db, type AppDB } from "@/lib/db"
import {
  normalizeRegexScript,
  normalizeRegexScripts,
} from "@/lib/parsers/regex"
import { generateId } from "@/lib/utils"

export type RegexOwnerKind = "card" | "preset"
export type RegexTransferMode = "copy" | "move"

export interface RegexOwnerRef {
  kind: RegexOwnerKind
  id: string
}

export interface RegexTransferTarget extends RegexOwnerRef {
  name: string
  scriptCount: number
}

export type RegexInsertLocation =
  | { type: "top" }
  | { type: "bottom" }
  | { type: "position"; position: number }

export type RegexReorderTarget =
  | "top"
  | "up"
  | "down"
  | "bottom"
  | number

export type RegexOperationErrorCode =
  | "INVALID_DIRECTION"
  | "OWNER_NOT_FOUND"
  | "SOURCE_CHANGED"
  | "SCRIPT_NOT_FOUND"
  | "TARGET_ID_CONFLICT"

export class RegexOperationError extends Error {
  code: RegexOperationErrorCode

  constructor(code: RegexOperationErrorCode, message: string) {
    super(message)
    this.name = "RegexOperationError"
    this.code = code
  }
}

export interface TransferRegexScriptsRequest {
  source: RegexOwnerRef
  target: RegexOwnerRef
  scriptIds: string[]
  mode: RegexTransferMode
  insertion: RegexInsertLocation
  sourceScripts?: RegexScript[]
  expectedSourceUpdatedAt?: Date | string | number
}

export interface TransferRegexScriptsResult {
  sourceScripts: RegexScript[]
  targetScripts: RegexScript[]
  sourceUpdatedAt: Date
  targetUpdatedAt: Date
  transferredCount: number
}

type RegexOwnerRecord = CharacterCard | Preset

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function reorderRegexScript(
  scripts: RegexScript[],
  scriptId: string,
  target: RegexReorderTarget
): RegexScript[] {
  const currentIndex = scripts.findIndex((script) => script.id === scriptId)
  if (currentIndex < 0 || scripts.length < 2) return [...scripts]

  let targetIndex: number
  if (typeof target === "number") {
    const position = Number.isFinite(target) ? Math.trunc(target) : 1
    targetIndex = clamp(position, 1, scripts.length) - 1
  } else {
    switch (target) {
      case "top":
        targetIndex = 0
        break
      case "up":
        targetIndex = currentIndex - 1
        break
      case "down":
        targetIndex = currentIndex + 1
        break
      case "bottom":
        targetIndex = scripts.length - 1
        break
    }
    targetIndex = clamp(targetIndex, 0, scripts.length - 1)
  }

  if (targetIndex === currentIndex) return [...scripts]

  const updated = [...scripts]
  const [moved] = updated.splice(currentIndex, 1)
  updated.splice(targetIndex, 0, moved)
  return updated
}

export function selectRegexScriptsInSourceOrder(
  scripts: RegexScript[],
  selectedIds: Iterable<string>
): RegexScript[] {
  const selected = new Set(selectedIds)
  return scripts.filter((script) => selected.has(script.id))
}

function resolveInsertIndex(
  targetLength: number,
  insertion: RegexInsertLocation
): number {
  if (insertion.type === "top") return 0
  if (insertion.type === "bottom") return targetLength
  if (!Number.isFinite(insertion.position)) return targetLength
  return clamp(
    Math.trunc(insertion.position) - 1,
    0,
    targetLength
  )
}

export function insertRegexScripts(
  targetScripts: RegexScript[],
  scriptsToInsert: RegexScript[],
  insertion: RegexInsertLocation
): RegexScript[] {
  if (scriptsToInsert.length === 0) return [...targetScripts]

  const updated = [...targetScripts]
  const insertIndex = resolveInsertIndex(updated.length, insertion)
  updated.splice(insertIndex, 0, ...scriptsToInsert)
  return updated
}

function getPresetRegexScripts(preset: Preset): RegexScript[] {
  return normalizeRegexScripts(preset.extensions?.regex_scripts)
}

function getOwnerRegexScripts(
  owner: RegexOwnerRecord,
  kind: RegexOwnerKind
): RegexScript[] {
  return kind === "card"
    ? normalizeRegexScripts((owner as CharacterCard).regex_scripts)
    : getPresetRegexScripts(owner as Preset)
}

function withRegexScripts(
  owner: RegexOwnerRecord,
  kind: RegexOwnerKind,
  scripts: RegexScript[],
  updatedAt: Date
): RegexOwnerRecord {
  if (kind === "card") {
    return {
      ...(owner as CharacterCard),
      regex_scripts: scripts,
      updated_at: updatedAt,
    }
  }

  const preset = owner as Preset
  return {
    ...preset,
    extensions: {
      ...(preset.extensions ?? {}),
      regex_scripts: scripts,
    },
    updated_at: updatedAt,
  }
}

async function readOwner(
  database: AppDB,
  owner: RegexOwnerRef
): Promise<RegexOwnerRecord | undefined> {
  return owner.kind === "card"
    ? database.characterCards.get(owner.id)
    : database.presets.get(owner.id)
}

async function writeOwner(
  database: AppDB,
  owner: RegexOwnerRef,
  record: RegexOwnerRecord
): Promise<void> {
  if (owner.kind === "card") {
    await database.characterCards.put(record as CharacterCard)
    return
  }
  await database.presets.put(record as Preset)
}

function timestamp(value: Date | string | number): number {
  return value instanceof Date
    ? value.getTime()
    : new Date(value).getTime()
}

function assertSourceVersion(
  record: RegexOwnerRecord,
  expected: Date | string | number | undefined
): void {
  if (expected === undefined) return
  if (
    timestamp(record.updated_at) !== timestamp(expected)
  ) {
    throw new RegexOperationError(
      "SOURCE_CHANGED",
      "源对象已在其他位置发生变化，请重新加载后再试"
    )
  }
}

function createCopies(
  scripts: RegexScript[],
  reservedIds: Set<string>
): RegexScript[] {
  return scripts.map((script) => {
    const copy = normalizeRegexScript(script, {
      regenerateId: true,
    })
    while (reservedIds.has(copy.id)) {
      copy.id = generateId()
    }
    reservedIds.add(copy.id)
    return copy
  })
}

export async function listRegexTransferTargets(
  sourceKind: RegexOwnerKind,
  database: AppDB = db
): Promise<RegexTransferTarget[]> {
  if (sourceKind === "card") {
    const presets = await database.presets.toArray()
    return presets
      .map((preset) => ({
        kind: "preset" as const,
        id: preset.id,
        name: preset.name || "未命名预设",
        scriptCount: getPresetRegexScripts(preset).length,
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN")
      )
  }

  const cards = await database.characterCards.toArray()
  return cards
    .map((card) => ({
      kind: "card" as const,
      id: card.id,
      name: card.name || "未命名角色卡",
      scriptCount: normalizeRegexScripts(card.regex_scripts).length,
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name, "zh-CN")
    )
}

export async function transferRegexScripts(
  request: TransferRegexScriptsRequest,
  database: AppDB = db
): Promise<TransferRegexScriptsResult> {
  if (request.source.kind === request.target.kind) {
    throw new RegexOperationError(
      "INVALID_DIRECTION",
      "Regex 只能在角色卡与预设之间转移"
    )
  }

  return database.transaction(
    "rw",
    database.characterCards,
    database.presets,
    async () => {
      const [sourceRecord, targetRecord] = await Promise.all([
        readOwner(database, request.source),
        readOwner(database, request.target),
      ])

      if (!sourceRecord || !targetRecord) {
        throw new RegexOperationError(
          "OWNER_NOT_FOUND",
          "源对象或目标对象不存在"
        )
      }

      assertSourceVersion(
        sourceRecord,
        request.expectedSourceUpdatedAt
      )

      const sourceScripts = request.sourceScripts
        ? normalizeRegexScripts(request.sourceScripts)
        : getOwnerRegexScripts(sourceRecord, request.source.kind)
      const targetScripts = getOwnerRegexScripts(
        targetRecord,
        request.target.kind
      )
      const selectedScripts = selectRegexScriptsInSourceOrder(
        sourceScripts,
        request.scriptIds
      )
      const selectedIds = new Set(
        selectedScripts.map((script) => script.id)
      )
      const missingScript = request.scriptIds.some(
        (scriptId) => !selectedIds.has(scriptId)
      )

      if (selectedScripts.length === 0 || missingScript) {
        throw new RegexOperationError(
          "SCRIPT_NOT_FOUND",
          "至少一条待转移的 Regex 已不存在"
        )
      }

      const targetIds = new Set(
        targetScripts.map((script) => script.id)
      )
      if (
        request.mode === "move" &&
        selectedScripts.some((script) => targetIds.has(script.id))
      ) {
        throw new RegexOperationError(
          "TARGET_ID_CONFLICT",
          "目标中存在同 ID 的 Regex，移动已取消"
        )
      }

      const transferredScripts =
        request.mode === "copy"
          ? createCopies(selectedScripts, targetIds)
          : selectedScripts.map((script) =>
              structuredClone(script)
            )
      const nextTargetScripts = insertRegexScripts(
        targetScripts,
        transferredScripts,
        request.insertion
      )
      const nextSourceScripts =
        request.mode === "move"
          ? sourceScripts.filter(
              (script) => !selectedIds.has(script.id)
            )
          : sourceScripts
      const now = new Date()

      if (request.mode === "move") {
        await writeOwner(
          database,
          request.source,
          withRegexScripts(
            sourceRecord,
            request.source.kind,
            nextSourceScripts,
            now
          )
        )
      }

      await writeOwner(
        database,
        request.target,
        withRegexScripts(
          targetRecord,
          request.target.kind,
          nextTargetScripts,
          now
        )
      )

      return {
        sourceScripts: nextSourceScripts,
        targetScripts: nextTargetScripts,
        sourceUpdatedAt:
          request.mode === "move" ? now : sourceRecord.updated_at,
        targetUpdatedAt: now,
        transferredCount: selectedScripts.length,
      }
    }
  )
}
