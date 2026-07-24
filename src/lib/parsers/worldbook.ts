import type {
  WorldBook,
  WorldBookEntry,
  WorldBookEntryExtensions,
} from "@/types"
import { generateId } from "@/lib/utils"
import { cloneRecord, isRecord } from "./shared"

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

function normalizeEntry(
  raw: unknown,
  index: number
): WorldBookEntry {
  const entry = isRecord(raw) ? raw : {}

  return {
    ...structuredClone(entry),
    id: (entry.id as number) ?? index,
    keys: (entry.keys as string[]) || [],
    secondary_keys: (entry.secondary_keys as string[]) || [],
    comment: (entry.comment as string) || "",
    content: (entry.content as string) || "",
    constant: (entry.constant as boolean) ?? false,
    vectorized: (entry.vectorized as boolean) ?? false,
    selective:
      entry.selective !== undefined ? (entry.selective as boolean) : true,
    selectiveLogic: (entry.selectiveLogic as number) ?? 0,
    insertion_order: (entry.insertion_order as number) ?? 100,
    enabled: entry.enabled !== undefined ? (entry.enabled as boolean) : true,
    addMemo: (entry.addMemo as boolean) ?? false,
    character_filter_names:
      entry.character_filter_names as string[] | undefined,
    character_filter_tags:
      entry.character_filter_tags as string[] | undefined,
    character_filter_exclude:
      entry.character_filter_exclude as boolean | undefined,
    extensions: normalizeEntryExtensions(entry.extensions, entry),
  }
}

export function normalizeCharacterBook(raw: unknown): WorldBook | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return undefined

  return {
    ...structuredClone(raw),
    raw_data: structuredClone(raw),
    id: generateId(),
    name: (raw.name as string) || "未命名世界书",
    description: (raw.description as string) || "",
    entries: raw.entries.map(normalizeEntry),
    is_standalone: false,
    recursive_scanning: raw.recursive_scanning as boolean | undefined,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function buildCharacterBookEntry(
  entry: WorldBookEntry
): Record<string, unknown> {
  return structuredClone(entry) as Record<string, unknown>
}

export function buildCharacterBook(
  book: WorldBook
): Record<string, unknown> {
  const output = cloneRecord(book.raw_data)
  output.name = book.name
  output.description = book.description ?? ""
  output.entries = book.entries.map(buildCharacterBookEntry)
  if (book.recursive_scanning !== undefined) {
    output.recursive_scanning = book.recursive_scanning
  }
  return output
}
