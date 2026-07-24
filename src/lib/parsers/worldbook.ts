import type {
  WorldBook,
  WorldBookEntry,
  WorldBookEntryExtensions,
} from "@/types"
import { generateId } from "@/lib/utils"
import { cloneRecord, isRecord } from "./shared"

const WORLD_INFO_FILENAME_CONTROL_CHARACTERS = [
  ...Array.from({ length: 32 }, (_, index) =>
    String.fromCharCode(index)
  ),
  String.fromCharCode(127),
].join("")
const WORLD_INFO_FILENAME_UNSAFE_CHARACTERS = new RegExp(
  `[<>:"/\\\\|?*${WORLD_INFO_FILENAME_CONTROL_CHARACTERS}]`,
  "g"
)

const STANDALONE_EXTENSION_FIELDS = [
  ["position", "position"],
  ["excludeRecursion", "exclude_recursion"],
  ["preventRecursion", "prevent_recursion"],
  ["delayUntilRecursion", "delay_until_recursion"],
  ["displayIndex", "display_index"],
  ["probability", "probability"],
  ["useProbability", "useProbability"],
  ["depth", "depth"],
  ["outletName", "outlet_name"],
  ["group", "group"],
  ["groupOverride", "group_override"],
  ["groupWeight", "group_weight"],
  ["scanDepth", "scan_depth"],
  ["caseSensitive", "case_sensitive"],
  ["matchWholeWords", "match_whole_words"],
  ["useGroupScoring", "use_group_scoring"],
  ["automationId", "automation_id"],
  ["role", "role"],
  ["sticky", "sticky"],
  ["cooldown", "cooldown"],
  ["delay", "delay"],
  ["matchPersonaDescription", "match_persona_description"],
  ["matchCharacterDescription", "match_character_description"],
  ["matchCharacterPersonality", "match_character_personality"],
  ["matchCharacterDepthPrompt", "match_character_depth_prompt"],
  ["matchScenario", "match_scenario"],
  ["matchCreatorNotes", "match_creator_notes"],
  ["triggers", "triggers"],
  ["ignoreBudget", "ignore_budget"],
] as const

export type StandaloneWorldInfoValidationCode =
  | "INVALID_ROOT"
  | "MISSING_ENTRIES"
  | "INVALID_ENTRIES"
  | "INVALID_ENTRY"

export type StandaloneWorldInfoValidationResult =
  | { valid: true }
  | {
      valid: false
      code: StandaloneWorldInfoValidationCode
      message: string
    }

export type StandaloneWorldInfoImportErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_READ_FAILED"
  | "EMPTY_FILE"
  | "INVALID_JSON"
  | StandaloneWorldInfoValidationCode

export class StandaloneWorldInfoImportError extends Error {
  code: StandaloneWorldInfoImportErrorCode

  constructor(
    code: StandaloneWorldInfoImportErrorCode,
    message: string
  ) {
    super(message)
    this.name = "StandaloneWorldInfoImportError"
    this.code = code
  }
}

export interface NormalizeStandaloneWorldInfoOptions {
  fileName?: string
  now?: Date
}

export interface StandaloneWorldInfoImportResult {
  book: WorldBook
  repairedUidCount: number
}

export interface StandaloneWorldInfoBuildOptions {
  source?: "standalone" | "embedded"
}

export interface StandaloneWorldInfoBuildResult {
  data: Record<string, unknown>
  repairedUidCount: number
}

export interface StandaloneWorldInfoExportFile
  extends StandaloneWorldInfoBuildResult {
  content: string
  filename: string
}

type EntrySource = {
  key: string
  entry: Record<string, unknown>
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function numberValue(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback
}

function nullableNumberValue(
  value: unknown,
  fallback: number | null
): number | null {
  if (value === null) return null
  return isFiniteNumber(value) ? value : fallback
}

function nullableBooleanValue(
  value: unknown,
  fallback: boolean | null
): boolean | null {
  if (value === null) return null
  return typeof value === "boolean" ? value : fallback
}

function numberOrBooleanValue(
  value: unknown,
  fallback: number | boolean
): number | boolean {
  return typeof value === "boolean" || isFiniteNumber(value)
    ? value
    : fallback
}

function stringArrayValue(
  value: unknown,
  fallback: string[]
): string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string")
    ? structuredClone(value)
    : structuredClone(fallback)
}

function optionalStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string")
    ? structuredClone(value)
    : undefined
}

function mappedValue(
  entry: Record<string, unknown>,
  extensions: Record<string, unknown>,
  standaloneKey: string,
  extensionKey: string
): unknown {
  if (
    standaloneKey in entry &&
    entry[standaloneKey] !== undefined
  ) {
    return entry[standaloneKey]
  }
  return extensions[extensionKey]
}

function nextFreeUid(used: Set<number>): number {
  let uid = 0
  while (used.has(uid)) uid += 1
  return uid
}

function uidFromObjectKey(key: string): number | undefined {
  if (!/^\d+$/.test(key)) return undefined
  const uid = Number(key)
  return isNonNegativeSafeInteger(uid) ? uid : undefined
}

function stripJsonExtension(fileName: string): string {
  return fileName.replace(/\.json$/i, "").trim()
}

function resolveStandaloneBookName(
  rawName: unknown,
  fileName?: string
): string {
  if (typeof rawName === "string" && rawName.trim()) {
    return rawName.trim()
  }
  if (fileName) {
    const baseName = stripJsonExtension(fileName)
    if (baseName) return baseName
  }
  return "未命名世界书"
}

function entriesFromStandaloneContainer(
  entries: Record<string, unknown> | unknown[]
): EntrySource[] {
  return Object.entries(entries).map(([key, value]) => ({
    key,
    entry: value as Record<string, unknown>,
  }))
}

function characterFilterValues(
  entry: Record<string, unknown>,
  sourceKey: "characterFilter" | "character_filter",
  useEmptyDefaults: boolean
): {
  names: string[] | undefined
  tags: string[] | undefined
  isExclude: boolean | undefined
} {
  const filter = isRecord(entry[sourceKey])
    ? entry[sourceKey]
    : {}
  const defaultArray = useEmptyDefaults ? [] : undefined
  const defaultExclude = useEmptyDefaults ? false : undefined

  return {
    names:
      optionalStringArray(entry.character_filter_names) ??
      optionalStringArray(filter.names) ??
      defaultArray,
    tags:
      optionalStringArray(entry.character_filter_tags) ??
      optionalStringArray(filter.tags) ??
      defaultArray,
    isExclude:
      typeof entry.character_filter_exclude === "boolean"
        ? entry.character_filter_exclude
        : typeof filter.isExclude === "boolean"
          ? filter.isExclude
          : defaultExclude,
  }
}

export function createDefaultEntryExtensions(): WorldBookEntryExtensions {
  return {
    position: 0,
    exclude_recursion: false,
    display_index: 0,
    probability: 100,
    useProbability: true,
    depth: 4,
    outlet_name: "",
    group: "",
    group_override: false,
    group_weight: 100,
    prevent_recursion: false,
    delay_until_recursion: 0,
    scan_depth: null,
    match_whole_words: null,
    use_group_scoring: null,
    case_sensitive: null,
    automation_id: "",
    role: 0,
    vectorized: false,
    sticky: null,
    cooldown: null,
    delay: null,
    match_persona_description: false,
    match_character_description: false,
    match_character_personality: false,
    match_character_depth_prompt: false,
    match_scenario: false,
    match_creator_notes: false,
    triggers: [],
    ignore_budget: false,
  }
}

export function normalizeEntryExtensions(
  raw: unknown,
  entry?: Record<string, unknown>
): WorldBookEntryExtensions {
  const defaults = createDefaultEntryExtensions()
  const source = isRecord(raw) ? raw : {}

  function get<T>(key: string, defaultValue: T): T {
    if (key in source && source[key] !== undefined) {
      return source[key] as T
    }
    if (entry && key in entry && entry[key] !== undefined) {
      return entry[key] as T
    }
    return defaultValue
  }

  function getNullable<T>(key: string, defaultValue: T): T {
    if (key in source) return source[key] as T
    if (entry && key in entry) return entry[key] as T
    return defaultValue
  }

  return {
    ...structuredClone(source),
    position: get<number>("position", defaults.position),
    exclude_recursion: get<boolean>(
      "exclude_recursion",
      defaults.exclude_recursion
    ),
    display_index: get<number>("display_index", defaults.display_index),
    probability: get<number>("probability", defaults.probability),
    useProbability: get<boolean>(
      "useProbability",
      defaults.useProbability
    ),
    depth: get<number>("depth", defaults.depth),
    outlet_name: get<string>("outlet_name", defaults.outlet_name),
    group: get<string>("group", defaults.group),
    group_override: get<boolean>(
      "group_override",
      defaults.group_override
    ),
    group_weight: get<number>("group_weight", defaults.group_weight),
    prevent_recursion: get<boolean>(
      "prevent_recursion",
      defaults.prevent_recursion
    ),
    delay_until_recursion: get<number | boolean>(
      "delay_until_recursion",
      defaults.delay_until_recursion
    ),
    scan_depth: getNullable<number | null>(
      "scan_depth",
      defaults.scan_depth
    ),
    match_whole_words: getNullable<boolean | null>(
      "match_whole_words",
      defaults.match_whole_words
    ),
    use_group_scoring: getNullable<boolean | null>(
      "use_group_scoring",
      defaults.use_group_scoring
    ),
    case_sensitive: getNullable<boolean | null>(
      "case_sensitive",
      defaults.case_sensitive
    ),
    automation_id: get<string>("automation_id", defaults.automation_id),
    role: get<number>("role", defaults.role),
    vectorized: get<boolean>("vectorized", defaults.vectorized),
    sticky: getNullable<number | null>("sticky", defaults.sticky),
    cooldown: getNullable<number | null>("cooldown", defaults.cooldown),
    delay: getNullable<number | null>("delay", defaults.delay),
    match_persona_description: get<boolean>(
      "match_persona_description",
      defaults.match_persona_description
    ),
    match_character_description: get<boolean>(
      "match_character_description",
      defaults.match_character_description
    ),
    match_character_personality: get<boolean>(
      "match_character_personality",
      defaults.match_character_personality
    ),
    match_character_depth_prompt: get<boolean>(
      "match_character_depth_prompt",
      defaults.match_character_depth_prompt
    ),
    match_scenario: get<boolean>(
      "match_scenario",
      defaults.match_scenario
    ),
    match_creator_notes: get<boolean>(
      "match_creator_notes",
      defaults.match_creator_notes
    ),
    triggers: get<string[]>("triggers", defaults.triggers),
    ignore_budget: get<boolean>(
      "ignore_budget",
      defaults.ignore_budget
    ),
  }
}

function normalizeCharacterBookEntry(
  raw: unknown,
  index: number
): WorldBookEntry {
  const entry = isRecord(raw) ? raw : {}
  const extensions = normalizeEntryExtensions(entry.extensions, entry)
  const characterFilter = characterFilterValues(
    entry,
    "character_filter",
    false
  )
  const vectorized = booleanValue(
    entry.vectorized,
    booleanValue(extensions.vectorized, false)
  )
  const selectiveLogic = numberValue(
    entry.selectiveLogic,
    numberValue(extensions.selectiveLogic, 0)
  )

  extensions.vectorized = vectorized
  extensions.selectiveLogic = selectiveLogic

  return {
    ...structuredClone(entry),
    id: isFiniteNumber(entry.id) ? entry.id : index,
    keys: stringArrayValue(entry.keys, []),
    secondary_keys: stringArrayValue(entry.secondary_keys, []),
    comment: stringValue(entry.comment, ""),
    content: stringValue(entry.content, ""),
    constant: booleanValue(entry.constant, false),
    vectorized,
    selective: booleanValue(entry.selective, true),
    selectiveLogic,
    insertion_order: numberValue(entry.insertion_order, 100),
    enabled: booleanValue(entry.enabled, true),
    addMemo: booleanValue(entry.addMemo, false),
    character_filter_names: characterFilter.names,
    character_filter_tags: characterFilter.tags,
    character_filter_exclude: characterFilter.isExclude,
    extensions,
  }
}

function normalizeStandaloneEntry(
  source: Record<string, unknown>,
  uid: number
): WorldBookEntry {
  const extensionSource = cloneRecord(source.extensions)
  const defaults = createDefaultEntryExtensions()
  const vectorized = booleanValue(
    source.vectorized,
    booleanValue(extensionSource.vectorized, defaults.vectorized)
  )
  const selectiveLogic = numberValue(
    source.selectiveLogic,
    numberValue(extensionSource.selectiveLogic, 0)
  )
  const characterFilter = characterFilterValues(
    source,
    "characterFilter",
    true
  )

  const extensions: WorldBookEntryExtensions = {
    ...extensionSource,
    position: numberValue(
      mappedValue(
        source,
        extensionSource,
        "position",
        "position"
      ),
      defaults.position
    ),
    exclude_recursion: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "excludeRecursion",
        "exclude_recursion"
      ),
      defaults.exclude_recursion
    ),
    display_index: numberValue(
      mappedValue(
        source,
        extensionSource,
        "displayIndex",
        "display_index"
      ),
      defaults.display_index
    ),
    probability: numberValue(
      mappedValue(
        source,
        extensionSource,
        "probability",
        "probability"
      ),
      defaults.probability
    ),
    useProbability: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "useProbability",
        "useProbability"
      ),
      defaults.useProbability
    ),
    depth: numberValue(
      mappedValue(source, extensionSource, "depth", "depth"),
      defaults.depth
    ),
    outlet_name: stringValue(
      mappedValue(
        source,
        extensionSource,
        "outletName",
        "outlet_name"
      ),
      defaults.outlet_name
    ),
    group: stringValue(
      mappedValue(source, extensionSource, "group", "group"),
      defaults.group
    ),
    group_override: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "groupOverride",
        "group_override"
      ),
      defaults.group_override
    ),
    group_weight: numberValue(
      mappedValue(
        source,
        extensionSource,
        "groupWeight",
        "group_weight"
      ),
      defaults.group_weight
    ),
    prevent_recursion: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "preventRecursion",
        "prevent_recursion"
      ),
      defaults.prevent_recursion
    ),
    delay_until_recursion: numberOrBooleanValue(
      mappedValue(
        source,
        extensionSource,
        "delayUntilRecursion",
        "delay_until_recursion"
      ),
      defaults.delay_until_recursion
    ),
    scan_depth: nullableNumberValue(
      mappedValue(
        source,
        extensionSource,
        "scanDepth",
        "scan_depth"
      ),
      defaults.scan_depth
    ),
    match_whole_words: nullableBooleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchWholeWords",
        "match_whole_words"
      ),
      defaults.match_whole_words
    ),
    use_group_scoring: nullableBooleanValue(
      mappedValue(
        source,
        extensionSource,
        "useGroupScoring",
        "use_group_scoring"
      ),
      defaults.use_group_scoring
    ),
    case_sensitive: nullableBooleanValue(
      mappedValue(
        source,
        extensionSource,
        "caseSensitive",
        "case_sensitive"
      ),
      defaults.case_sensitive
    ),
    automation_id: stringValue(
      mappedValue(
        source,
        extensionSource,
        "automationId",
        "automation_id"
      ),
      defaults.automation_id
    ),
    role: numberValue(
      mappedValue(source, extensionSource, "role", "role"),
      defaults.role
    ),
    vectorized,
    sticky: nullableNumberValue(
      mappedValue(source, extensionSource, "sticky", "sticky"),
      defaults.sticky
    ),
    cooldown: nullableNumberValue(
      mappedValue(
        source,
        extensionSource,
        "cooldown",
        "cooldown"
      ),
      defaults.cooldown
    ),
    delay: nullableNumberValue(
      mappedValue(source, extensionSource, "delay", "delay"),
      defaults.delay
    ),
    match_persona_description: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchPersonaDescription",
        "match_persona_description"
      ),
      defaults.match_persona_description
    ),
    match_character_description: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchCharacterDescription",
        "match_character_description"
      ),
      defaults.match_character_description
    ),
    match_character_personality: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchCharacterPersonality",
        "match_character_personality"
      ),
      defaults.match_character_personality
    ),
    match_character_depth_prompt: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchCharacterDepthPrompt",
        "match_character_depth_prompt"
      ),
      defaults.match_character_depth_prompt
    ),
    match_scenario: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchScenario",
        "match_scenario"
      ),
      defaults.match_scenario
    ),
    match_creator_notes: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "matchCreatorNotes",
        "match_creator_notes"
      ),
      defaults.match_creator_notes
    ),
    triggers: stringArrayValue(
      mappedValue(
        source,
        extensionSource,
        "triggers",
        "triggers"
      ),
      defaults.triggers
    ),
    ignore_budget: booleanValue(
      mappedValue(
        source,
        extensionSource,
        "ignoreBudget",
        "ignore_budget"
      ),
      defaults.ignore_budget
    ),
  }
  extensions.selectiveLogic = selectiveLogic

  return {
    ...structuredClone(source),
    id: uid,
    keys: stringArrayValue(source.key, []),
    secondary_keys: stringArrayValue(source.keysecondary, []),
    comment: stringValue(source.comment, ""),
    content: stringValue(source.content, ""),
    constant: booleanValue(source.constant, false),
    vectorized,
    selective: booleanValue(source.selective, true),
    selectiveLogic,
    insertion_order: numberValue(source.order, 100),
    enabled: !booleanValue(source.disable, false),
    addMemo: booleanValue(source.addMemo, false),
    character_filter_names: characterFilter.names,
    character_filter_tags: characterFilter.tags,
    character_filter_exclude: characterFilter.isExclude,
    extensions,
  }
}

export function normalizeCharacterBook(
  raw: unknown
): WorldBook | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return undefined

  return {
    ...structuredClone(raw),
    raw_data: structuredClone(raw),
    id: generateId(),
    name: stringValue(raw.name, "未命名世界书"),
    description: stringValue(raw.description, ""),
    entries: raw.entries.map(normalizeCharacterBookEntry),
    is_standalone: false,
    recursive_scanning:
      typeof raw.recursive_scanning === "boolean"
        ? raw.recursive_scanning
        : undefined,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function validateStandaloneWorldInfo(
  raw: unknown
): StandaloneWorldInfoValidationResult {
  if (!isRecord(raw)) {
    return {
      valid: false,
      code: "INVALID_ROOT",
      message: "顶层必须是 JSON 对象",
    }
  }
  if (!Object.hasOwn(raw, "entries")) {
    return {
      valid: false,
      code: "MISSING_ENTRIES",
      message: "缺少 entries，文件不是有效的独立世界书",
    }
  }
  if (!isRecord(raw.entries) && !Array.isArray(raw.entries)) {
    return {
      valid: false,
      code: "INVALID_ENTRIES",
      message: "entries 必须是 UID 对象或条目数组",
    }
  }

  for (const [key, entry] of Object.entries(raw.entries)) {
    if (!isRecord(entry)) {
      return {
        valid: false,
        code: "INVALID_ENTRY",
        message: `条目「${key}」必须是 JSON 对象`,
      }
    }
  }

  return { valid: true }
}

export function normalizeStandaloneWorldInfo(
  raw: unknown,
  options: NormalizeStandaloneWorldInfoOptions = {}
): StandaloneWorldInfoImportResult {
  const validation = validateStandaloneWorldInfo(raw)
  if (!validation.valid) {
    throw new StandaloneWorldInfoImportError(
      validation.code,
      validation.message
    )
  }

  const source = raw as Record<string, unknown>
  const entrySources = entriesFromStandaloneContainer(
    source.entries as Record<string, unknown> | unknown[]
  )
  const used = new Set<number>()
  let repairedUidCount = 0
  const entries = entrySources.map(({ key, entry }) => {
    const sourceUid = entry.uid
    let uid = isNonNegativeSafeInteger(sourceUid)
      ? sourceUid
      : uidFromObjectKey(key)

    if (uid === undefined || used.has(uid)) {
      uid = nextFreeUid(used)
    }
    if (!isNonNegativeSafeInteger(sourceUid) || sourceUid !== uid) {
      repairedUidCount += 1
    }
    used.add(uid)
    return normalizeStandaloneEntry(entry, uid)
  })
  const now = options.now
    ? new Date(options.now)
    : new Date()
  const book: WorldBook = {
    ...structuredClone(source),
    raw_data: structuredClone(source),
    id: generateId(),
    name: resolveStandaloneBookName(
      source.name,
      options.fileName
    ),
    description: stringValue(source.description, ""),
    entries,
    is_standalone: true,
    recursive_scanning:
      typeof source.recursive_scanning === "boolean"
        ? source.recursive_scanning
        : undefined,
    source_file_name: options.fileName,
    created_at: now,
    updated_at: new Date(now),
  }

  return { book, repairedUidCount }
}

export async function parseStandaloneWorldInfoFile(
  file: File,
  options: Omit<NormalizeStandaloneWorldInfoOptions, "fileName"> = {}
): Promise<StandaloneWorldInfoImportResult> {
  const hasJsonExtension = file.name.toLowerCase().endsWith(".json")
  const hasJsonMime = file.type.toLowerCase() === "application/json"
  if (!hasJsonExtension && !hasJsonMime) {
    throw new StandaloneWorldInfoImportError(
      "INVALID_FILE_TYPE",
      "只支持 .json 格式的独立世界书"
    )
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new StandaloneWorldInfoImportError(
      "FILE_READ_FAILED",
      "无法读取所选文件"
    )
  }
  if (!text.trim()) {
    throw new StandaloneWorldInfoImportError(
      "EMPTY_FILE",
      "文件为空，未导入任何内容"
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new StandaloneWorldInfoImportError(
      "INVALID_JSON",
      "JSON 解析失败，请检查文件内容"
    )
  }

  return normalizeStandaloneWorldInfo(raw, {
    ...options,
    fileName: file.name,
  })
}

function syncedCharacterFilter(
  output: Record<string, unknown>,
  entry: WorldBookEntry,
  key: "characterFilter" | "character_filter"
): Record<string, unknown> {
  const base = cloneRecord(output[key])
  return {
    ...base,
    names: structuredClone(entry.character_filter_names ?? []),
    tags: structuredClone(entry.character_filter_tags ?? []),
    isExclude: entry.character_filter_exclude ?? false,
  }
}

function hasCharacterFilter(
  output: Record<string, unknown>,
  entry: WorldBookEntry
): boolean {
  return (
    entry.character_filter_names !== undefined ||
    entry.character_filter_tags !== undefined ||
    entry.character_filter_exclude !== undefined ||
    isRecord(output.characterFilter) ||
    isRecord(output.character_filter)
  )
}

export function buildCharacterBookEntry(
  entry: WorldBookEntry
): Record<string, unknown> {
  const output = structuredClone(entry) as Record<string, unknown>
  const extensions = normalizeEntryExtensions(
    entry.extensions,
    output
  ) as Record<string, unknown>

  extensions.vectorized = entry.vectorized
  extensions.selectiveLogic = entry.selectiveLogic
  output.extensions = extensions

  if (hasCharacterFilter(output, entry)) {
    output.character_filter = syncedCharacterFilter(
      output,
      entry,
      "character_filter"
    )
  }
  delete output.character_filter_names
  delete output.character_filter_tags
  delete output.character_filter_exclude

  return output
}

export function buildCharacterBook(
  book: WorldBook
): Record<string, unknown> {
  const output = cloneRecord(book.raw_data)
  const currentBook = book as unknown as Record<string, unknown>
  delete output.id
  delete output.is_standalone
  delete output.raw_data
  delete output.source_file_name
  delete output.created_at
  delete output.updated_at

  output.name = book.name
  output.description = book.description ?? ""
  if (Object.hasOwn(currentBook, "extensions")) {
    output.extensions = structuredClone(currentBook.extensions)
  }
  output.entries = book.entries.map(buildCharacterBookEntry)
  if (book.recursive_scanning !== undefined) {
    output.recursive_scanning = book.recursive_scanning
  }
  return output
}

function buildStandaloneEntry(
  entry: WorldBookEntry,
  uid: number
): Record<string, unknown> {
  const output = structuredClone(entry) as Record<string, unknown>
  const extensions = normalizeEntryExtensions(
    entry.extensions,
    output
  ) as Record<string, unknown>

  extensions.vectorized = entry.vectorized
  extensions.selectiveLogic = entry.selectiveLogic
  output.extensions = extensions

  delete output.id
  delete output.keys
  delete output.secondary_keys
  delete output.insertion_order
  delete output.enabled
  delete output.character_filter_names
  delete output.character_filter_tags
  delete output.character_filter_exclude

  output.uid = uid
  output.key = structuredClone(entry.keys)
  output.keysecondary = structuredClone(entry.secondary_keys)
  output.comment = entry.comment
  output.content = entry.content
  output.constant = entry.constant
  output.vectorized = entry.vectorized
  output.selective = entry.selective
  output.selectiveLogic = entry.selectiveLogic
  output.order = entry.insertion_order
  output.disable = !entry.enabled
  output.addMemo = entry.addMemo

  for (const [standaloneKey, extensionKey] of
    STANDALONE_EXTENSION_FIELDS) {
    output[standaloneKey] = structuredClone(
      extensions[extensionKey]
    )
  }

  if (hasCharacterFilter(output, entry)) {
    output.characterFilter = syncedCharacterFilter(
      output,
      entry,
      "characterFilter"
    )
    output.character_filter = syncedCharacterFilter(
      output,
      entry,
      "character_filter"
    )
  }

  return output
}

function stableExportUids(entries: WorldBookEntry[]): {
  uids: number[]
  repairedUidCount: number
} {
  const used = new Set<number>()
  let repairedUidCount = 0
  const uids = entries.map((entry) => {
    let uid = isNonNegativeSafeInteger(entry.id)
      ? entry.id
      : undefined
    if (uid === undefined || used.has(uid)) {
      uid = nextFreeUid(used)
      repairedUidCount += 1
    }
    used.add(uid)
    return uid
  })

  return { uids, repairedUidCount }
}

export function buildStandaloneWorldInfo(
  book: WorldBook,
  options: StandaloneWorldInfoBuildOptions = {}
): StandaloneWorldInfoBuildResult {
  const output = cloneRecord(book.raw_data)
  const currentBook = book as unknown as Record<string, unknown>
  const source =
    options.source ??
    (book.is_standalone ? "standalone" : "embedded")
  const { uids, repairedUidCount } = stableExportUids(book.entries)
  const entries: Record<string, Record<string, unknown>> = {}

  book.entries.forEach((entry, index) => {
    const uid = uids[index]
    entries[String(uid)] = buildStandaloneEntry(entry, uid)
  })

  delete output.id
  delete output.is_standalone
  delete output.raw_data
  delete output.source_file_name
  delete output.created_at
  delete output.updated_at

  output.name = book.name
  output.description = book.description ?? ""
  if (Object.hasOwn(currentBook, "extensions")) {
    output.extensions = structuredClone(currentBook.extensions)
  }
  output.entries = entries
  if (book.recursive_scanning !== undefined) {
    output.recursive_scanning = book.recursive_scanning
  }
  if (source === "embedded") {
    output.originalData = buildCharacterBook(book)
  }

  return { data: output, repairedUidCount }
}

export function sanitizeWorldInfoFilename(name: string): string {
  const sanitized = name
    .trim()
    .replace(WORLD_INFO_FILENAME_UNSAFE_CHARACTERS, "_")
    .replace(/[.\s]+$/g, "")
  return sanitized || "未命名世界书"
}

export function buildStandaloneWorldInfoExportFile(
  book: WorldBook,
  options: StandaloneWorldInfoBuildOptions = {}
): StandaloneWorldInfoExportFile {
  const result = buildStandaloneWorldInfo(book, options)
  return {
    ...result,
    content: JSON.stringify(result.data, null, 4),
    filename: `${sanitizeWorldInfoFilename(book.name)}.json`,
  }
}
