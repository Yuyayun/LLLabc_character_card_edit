import type { CharacterCard } from "@/types"
import { generateId } from "./utils"

// ========== 导入 ==========

export async function importCard(file: File): Promise<CharacterCard> {
  if (file.name.endsWith(".json")) {
    return importFromJSON(await file.text())
  }
  if (file.name.endsWith(".png")) {
    return importFromPNG(file)
  }
  throw new Error("不支持的文件格式，请使用 .json 或 .png")
}

async function importFromJSON(text: string): Promise<CharacterCard> {
  const raw = JSON.parse(text)
  return normalizeCard(raw)
}

async function importFromPNG(file: File): Promise<CharacterCard> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // 解析 PNG chunks，查找 tEXt chunk (keyword: chara 或 ccv3)
  const { raw } = extractCardFromPNG(bytes)
  if (!raw) {
    throw new Error("PNG 文件中未找到角色卡数据 (tEXt/chara 或 tEXt/ccv3)")
  }

  const card = normalizeCard(raw)

  // 将 PNG 转为 base64 dataURL 存储为卡面
  const blob = new Blob([buffer], { type: "image/png" })
  card.card_image = await blobToDataURL(blob)

  return card
}

function extractCardFromPNG(bytes: Uint8Array): { raw: Record<string, unknown> | null; rawVersion: string } {
  // 验证 PNG header
  if (bytes.length < 8) return { raw: null, rawVersion: "" }
  const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== header[i]) return { raw: null, rawVersion: "" }
  }

  let offset = 8
  let raw: Record<string, unknown> | null = null
  let rawVersion = ""

  while (offset < bytes.length - 8) {
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])

    if (type === "tEXt") {
      const chunkData = bytes.slice(offset + 8, offset + 8 + length)
      const nullIdx = chunkData.indexOf(0)
      if (nullIdx !== -1) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIdx))
        if (keyword === "ccv3" || keyword === "chara") {
          const b64 = new TextDecoder().decode(chunkData.slice(nullIdx + 1))
          try {
            // atob → binary string → Uint8Array → TextDecoder (UTF-8)
            const binaryStr = atob(b64)
            const utf8Bytes = new Uint8Array(binaryStr.length)
            for (let j = 0; j < binaryStr.length; j++) {
              utf8Bytes[j] = binaryStr.charCodeAt(j)
            }
            const jsonStr = new TextDecoder().decode(utf8Bytes)
            const parsed = JSON.parse(jsonStr)
            // 优先使用 ccv3 (spec v3)
            if (keyword === "ccv3" || !raw) {
              raw = parsed
              rawVersion = keyword === "ccv3" ? "v3" : "v2"
            }
          } catch {
            // 跳过无法解析的 chunk
          }
        }
      }
    }

    if (type === "IEND") break
    offset += 12 + length
  }

  return { raw, rawVersion }
}

function normalizeCard(raw: Record<string, unknown>): CharacterCard {
  // 兼容 data 字段 (spec v3, v2)
  const data = (raw.data as Record<string, unknown>) || raw
  const extensions = (data.extensions as Record<string, unknown>) || {}

  return {
    id: generateId(),
    name: (raw.name as string) || (data.name as string) || "",
    description: (raw.description as string) || (data.description as string) || "",
    personality: (raw.personality as string) || (data.personality as string) || "",
    scenario: (raw.scenario as string) || (data.scenario as string) || "",
    first_mes: (raw.first_mes as string) || (data.first_mes as string) || "",
    mes_example: (raw.mes_example as string) || (data.mes_example as string) || "",
    creatorcomment:
      (raw.creatorcomment as string) ||
      (data.creator_notes as string) ||
      (data.creatorcomment as string) ||
      "",
    avatar: (raw.avatar as string) || "none",
    talkativeness: (raw.talkativeness as number) ?? (extensions.talkativeness as number) ?? (data.talkativeness as number) ?? 0.5,
    fav: (raw.fav as boolean) ?? (extensions.fav as boolean) ?? (data.fav as boolean) ?? false,
    tags: (raw.tags as string[]) ?? (data.tags as string[]) ?? [],
    spec: "chara_card_v3",
    spec_version: "3.0",

    creator: (data.creator as string) || "",
    character_version: (data.character_version as string) || "",
    alternate_greetings:
      (data.alternate_greetings as string[]) || [],
    group_only_greetings:
      (data.group_only_greetings as string[]) || [],
    system_prompt: (data.system_prompt as string) || "",
    post_history_instructions: (data.post_history_instructions as string) || "",

    character_book: normalizeWorldBook(
      ((data.character_book as Record<string, unknown>) || (data.world_book as Record<string, unknown>))
    ),

    regex_scripts: getRegexScripts(data),
    depth_prompt: normalizeDepthPrompt(
      (data.depth_prompt as Record<string, unknown>) ||
        (data.extensions as Record<string, unknown>)?.depth_prompt as Record<string, unknown>
    ),

    created_at: parseDate(raw.created_at) ?? parseDate(data.created_at) ?? parseDate(data.create_date) ?? new Date(),
    updated_at: parseDate(raw.updated_at) ?? parseDate(data.updated_at) ?? new Date(),
  }
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function getRegexScripts(data: Record<string, unknown>): ReturnType<typeof normalizeRegex>[] {
  const extensions = data.extensions as Record<string, unknown> | undefined
  const scripts = (data.regex_scripts || extensions?.regex_scripts) as Record<string, unknown>[] | undefined
  return scripts?.map(normalizeRegex) || []
}

function normalizeWorldBook(raw: Record<string, unknown> | undefined) {
  if (!raw || !raw.entries) return undefined
  const entries = raw.entries as Record<string, unknown>[]
  return {
    id: generateId(),
    name: (raw.name as string) || "未命名世界书",
    description: (raw.description as string) || "",
    entries: entries.map((entry, idx) => ({
      id: (entry.id as number) ?? idx,
      keys: (entry.keys as string[]) || [],
      secondary_keys: (entry.secondary_keys as string[]) || [],
      comment: (entry.comment as string) || "",
      content: (entry.content as string) || "",
      constant: (entry.constant as boolean) ?? false,
      vectorized: (entry.vectorized as boolean) ?? false,
      selective: entry.selective !== undefined ? (entry.selective as boolean) : true,
      selectiveLogic: (entry.selectiveLogic as number) ?? 0,
      insertion_order: (entry.insertion_order as number) ?? 100,
      enabled: entry.enabled !== undefined ? (entry.enabled as boolean) : true,
      addMemo: (entry.addMemo as boolean) ?? false,
      character_filter_names: entry.character_filter_names as string[] | undefined,
      character_filter_tags: entry.character_filter_tags as string[] | undefined,
      character_filter_exclude: entry.character_filter_exclude as boolean | undefined,
      extensions: normalizeEntryExtensions(
        entry.extensions as Record<string, unknown> | undefined,
        entry
      ),
    })),
    is_standalone: false,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

function defaultEntryExtensions() {
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
    scan_depth: null as number | null,
    match_whole_words: null as boolean | null,
    use_group_scoring: null as boolean | null,
    case_sensitive: null as boolean | null,
    automation_id: "",
    role: 0,
    vectorized: false,
    sticky: null as number | null,
    cooldown: null as number | null,
    delay: null as number | null,
    match_persona_description: false,
    match_character_description: false,
    match_character_personality: false,
    match_character_depth_prompt: false,
    match_scenario: false,
    match_creator_notes: false,
    triggers: [] as string[],
    ignore_budget: false,
  }
}

function normalizeEntryExtensions(
  raw: Record<string, unknown> | undefined,
  entry?: Record<string, unknown>
) {
  const def = defaultEntryExtensions()
  const src = (raw ?? {}) as Record<string, unknown>
  function get<T>(key: string, defVal: T): T {
    // Prefer extensions sub-object, fallback to entry level
    if (key in src && src[key] !== undefined) return src[key] as T
    if (entry && key in entry && entry[key] !== undefined) return entry[key] as T
    return defVal
  }
  function getNullable<T>(key: string, defVal: T): T {
    // For fields where null is a valid override of the default
    if (key in src) return src[key] as T
    if (entry && key in entry) return entry[key] as T
    return defVal
  }
  return {
    position: get<number>("position", def.position),
    exclude_recursion: get<boolean>("exclude_recursion", def.exclude_recursion),
    display_index: get<number>("display_index", def.display_index),
    probability: get<number>("probability", def.probability),
    useProbability: get<boolean>("useProbability", def.useProbability),
    depth: get<number>("depth", def.depth),
    outlet_name: src.outlet_name !== undefined ? (src.outlet_name as string) : (entry?.outlet_name as string) ?? def.outlet_name,
    group: src.group !== undefined ? (src.group as string) : (entry?.group as string) ?? def.group,
    group_override: get<boolean>("group_override", def.group_override),
    group_weight: get<number>("group_weight", def.group_weight),
    prevent_recursion: get<boolean>("prevent_recursion", def.prevent_recursion),
    delay_until_recursion: get<number>("delay_until_recursion", def.delay_until_recursion),
    scan_depth: getNullable<number | null>("scan_depth", def.scan_depth),
    match_whole_words: getNullable<boolean | null>("match_whole_words", def.match_whole_words),
    use_group_scoring: getNullable<boolean | null>("use_group_scoring", def.use_group_scoring),
    case_sensitive: getNullable<boolean | null>("case_sensitive", def.case_sensitive),
    automation_id: src.automation_id !== undefined ? (src.automation_id as string) : (entry?.automation_id as string) ?? def.automation_id,
    role: get<number>("role", def.role),
    vectorized: get<boolean>("vectorized", def.vectorized),
    sticky: getNullable<number | null>("sticky", def.sticky),
    cooldown: getNullable<number | null>("cooldown", def.cooldown),
    delay: getNullable<number | null>("delay", def.delay),
    match_persona_description: get<boolean>("match_persona_description", def.match_persona_description),
    match_character_description: get<boolean>("match_character_description", def.match_character_description),
    match_character_personality: get<boolean>("match_character_personality", def.match_character_personality),
    match_character_depth_prompt: get<boolean>("match_character_depth_prompt", def.match_character_depth_prompt),
    match_scenario: get<boolean>("match_scenario", def.match_scenario),
    match_creator_notes: get<boolean>("match_creator_notes", def.match_creator_notes),
    triggers: src.triggers !== undefined ? (src.triggers as string[]) : (entry?.triggers as string[]) ?? [],
    ignore_budget: get<boolean>("ignore_budget", def.ignore_budget),
  }
}

function normalizeRegex(raw: Record<string, unknown>) {
  return {
    id: (raw.id as string) || generateId(),
    scriptName: (raw.scriptName as string) || "",
    findRegex: (raw.findRegex as string) || "",
    replaceString: (raw.replaceString as string) || "",
    trimStrings: (raw.trimStrings as string[]) || [],
    placement: (raw.placement as number[]) || [2],
    disabled: (raw.disabled as boolean) ?? false,
    markdownOnly: (raw.markdownOnly as boolean) ?? true,
    promptOnly: (raw.promptOnly as boolean) ?? false,
    runOnEdit: (raw.runOnEdit as boolean) ?? true,
    substituteRegex: (raw.substituteRegex as number) ?? 0,
    minDepth: (raw.minDepth as number) ?? null,
    maxDepth: (raw.maxDepth as number) ?? null,
  }
}

function normalizeDepthPrompt(raw: Record<string, unknown> | undefined) {
  return {
    prompt: (raw?.prompt as string) || "",
    depth: (raw?.depth as number) ?? 4,
    role: (raw?.role as "system" | "user" | "assistant") || "system",
  }
}

// ========== 导出 ==========

async function resolveCharacterBook(card: CharacterCard): Promise<CharacterCard> {
  // 如果已有内嵌世界书，直接返回
  if (card.character_book) return card
  // 如果绑定了独立世界书，从 DB 取出嵌入
  if (card.bound_worldbook_id) {
    const { db } = await import("@/lib/db")
    const book = await db.worldBooks.get(card.bound_worldbook_id)
    if (book) {
      return { ...card, character_book: structuredClone(book) }
    }
  }
  return card
}

export async function exportJSON(card: CharacterCard): Promise<void> {
  const resolved = await resolveCharacterBook(card)
  const specData = buildSpecData(resolved)

  const output: Record<string, unknown> = {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.first_mes,
    mes_example: card.mes_example,
    creatorcomment: card.creatorcomment,
    avatar: card.avatar,
    talkativeness: card.talkativeness,
    fav: card.fav,
    tags: card.tags,
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: specData,
  }

  const json = JSON.stringify(output, null, 2)
  downloadFile(json, `${card.name || "character"}.json`, "application/json")
}

export async function exportPNG(card: CharacterCard): Promise<void> {
  if (!card.card_image) throw new Error("无卡面图片")

  // 从 dataURL 提取 PNG 二进制
  let pngBinary: Uint8Array

  if (card.card_image.startsWith("data:")) {
    const b64 = card.card_image.split(",")[1]
    const binaryStr = atob(b64)
    pngBinary = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      pngBinary[i] = binaryStr.charCodeAt(i)
    }
  } else {
    let resp: Response
    try {
      resp = await fetch(card.card_image)
    } catch {
      throw new Error("无法获取卡面图片：网络错误或 CORS 限制（图片可能来自外部 URL，无法跨域访问）")
    }
    if (!resp.ok) {
      throw new Error(`获取卡面图片失败 (HTTP ${resp.status})`)
    }
    pngBinary = new Uint8Array(await resp.arrayBuffer())
  }

  // 构建完整的 SillyTavern 角色卡 JSON（含绑定的世界书）
  const resolved = await resolveCharacterBook(card)
  const specData = buildSpecData(resolved)
  const output: Record<string, unknown> = {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.first_mes,
    mes_example: card.mes_example,
    creatorcomment: card.creatorcomment,
    avatar: card.avatar,
    talkativeness: card.talkativeness,
    fav: card.fav,
    tags: card.tags,
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: specData,
  }

  const jsonStr = JSON.stringify(output)
  const jsonBytes = new TextEncoder().encode(jsonStr)
  const base64 = uint8ToBase64(jsonBytes)

  // 将 JSON 作为 ccv3 tEXt chunk 注入 PNG
  const result = injectCardChunkIntoPNG(pngBinary, base64, "ccv3")

  const blob = new Blob([result.buffer as ArrayBuffer], { type: "image/png" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${card.name || "character"}.png`
  a.click()
  URL.revokeObjectURL(url)
}

function buildSpecData(card: CharacterCard): Record<string, unknown> {
  return {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.first_mes,
    mes_example: card.mes_example,
    creator_notes: card.creatorcomment,
    system_prompt: card.system_prompt,
    post_history_instructions: card.post_history_instructions,
    tags: card.tags,
    creator: card.creator,
    character_version: card.character_version,
    alternate_greetings: card.alternate_greetings,
    group_only_greetings: card.group_only_greetings,
    depth_prompt: card.depth_prompt,
    extensions: {
      talkativeness: card.talkativeness,
      fav: card.fav,
      world: card.character_book?.name || "",
      depth_prompt: card.depth_prompt,
      regex_scripts: card.regex_scripts,
    },
    character_book: card.character_book
      ? {
          name: card.character_book.name,
          description: card.character_book.description || "",
          entries: card.character_book.entries,
        }
      : undefined,
  }
}

// ========== PNG chunk 操作 ==========

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function injectCardChunkIntoPNG(pngBytes: Uint8Array, base64Data: string, keyword: "ccv3" | "chara"): Uint8Array {
  // 构建 tEXt chunk 数据: keyword + \0 + base64
  const kwBytes = new TextEncoder().encode(keyword)
  const dataBytes = new TextEncoder().encode(base64Data)
  const chunkData = new Uint8Array(kwBytes.length + 1 + dataBytes.length)
  chunkData.set(kwBytes)
  chunkData[kwBytes.length] = 0
  chunkData.set(dataBytes, kwBytes.length + 1)

  // 构建完整的新 chunk
  const length = chunkData.length
  const typeBytes = new TextEncoder().encode("tEXt")
  const crcData = new Uint8Array(4 + length)
  crcData.set(typeBytes)
  crcData.set(chunkData, 4)
  const crc = crc32(crcData)

  const newChunk = new Uint8Array(4 + 4 + length + 4)
  const view = new DataView(newChunk.buffer)
  view.setUint32(0, length, false)        // length (big-endian)
  newChunk.set(typeBytes, 4)               // type "tEXt"
  newChunk.set(chunkData, 8)               // keyword\0data
  view.setUint32(8 + length, crc, false)   // CRC (big-endian)

  // 解析原始 PNG，在 IEND 之前插入新 chunk，跳过旧的 chara/ccv3 tEXt chunks
  const headerEnd = 8
  const result: Uint8Array[] = [pngBytes.slice(0, headerEnd)]

  let offset = headerEnd
  while (offset < pngBytes.length - 8) {
    const chunkLen = (pngBytes[offset] << 24) | (pngBytes[offset + 1] << 16) | (pngBytes[offset + 2] << 8) | pngBytes[offset + 3]
    const chunkType = String.fromCharCode(pngBytes[offset + 4], pngBytes[offset + 5], pngBytes[offset + 6], pngBytes[offset + 7])
    const chunkTotalLen = 12 + chunkLen

    // 跳过旧的 chara/ccv3 tEXt chunks
    if (chunkType === "tEXt") {
      const data = pngBytes.slice(offset + 8, offset + 8 + chunkLen)
      const nullIdx = data.indexOf(0)
      if (nullIdx !== -1) {
        const kw = new TextDecoder().decode(data.slice(0, nullIdx))
        if (kw === "chara" || kw === "ccv3") {
          offset += chunkTotalLen
          continue
        }
      }
    }

    // 在 IEND 之前插入新 chunk
    if (chunkType === "IEND") {
      result.push(newChunk)
    }

    result.push(pngBytes.slice(offset, offset + chunkTotalLen))
    offset += chunkTotalLen
  }

  // 合并所有 parts
  const totalLen = result.reduce((sum, arr) => sum + arr.length, 0)
  const merged = new Uint8Array(totalLen)
  let pos = 0
  for (const arr of result) {
    merged.set(arr, pos)
    pos += arr.length
  }
  return merged
}

// PNG CRC-32 (IEEE 802.3 polynomial)
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320
      } else {
        crc = crc >>> 1
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ========== 预设导入/导出 ==========

// 酒馆预设 JSON 中作为内部字段的键（导出时跳过）
const PRESET_INTERNAL_KEYS = new Set([
  "id", "created_at", "updated_at",
])

export async function parsePresetJSON(file: File): Promise<import("@/types").Preset> {
  const text = await file.text()
  const raw = JSON.parse(text) as Record<string, unknown>
  const preset = normalizePreset(raw)
  // 酒馆预设 JSON 没有顶层 name，用文件名代替
  if (!preset.name) {
    preset.name = file.name.replace(/\.json$/i, "")
  }
  return preset
}

function normalizePreset(raw: Record<string, unknown>): import("@/types").Preset {

  // 已知字段直接取
  const known = new Set([
    "name", "temperature", "frequency_penalty", "presence_penalty",
    "top_p", "top_k", "top_a", "min_p", "repetition_penalty",
    "openai_max_context", "openai_max_tokens",
    "impersonation_prompt", "new_chat_prompt", "new_group_chat_prompt",
    "new_example_chat_prompt", "continue_nudge_prompt", "group_nudge_prompt",
    "wi_format", "scenario_format", "personality_format",
    "assistant_prefill", "assistant_impersonation",
    "stream_openai", "names_behavior", "wrap_in_quotes", "send_if_empty",
    "seed", "n", "squash_system_messages", "continue_prefill",
    "continue_postfix", "function_calling", "show_thoughts",
    "reasoning_effort", "max_context_unlocked", "bias_preset_selected",
    "prompts", "extensions",
  ])

  const knownPreset: Record<string, unknown> = {}
  const unknown: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (known.has(key)) {
      knownPreset[key] = value
    } else {
      unknown[key] = value
    }
  }

  // 合并 extensions
  const existingExt = (knownPreset.extensions ?? {}) as Record<string, unknown>
  const mergedExt = { ...existingExt, ...unknown }

  return {
    id: (raw.id as string) ?? generateId(),
    name: (knownPreset.name as string) ?? "",
    temperature: (knownPreset.temperature as number) ?? 1,
    frequency_penalty: (knownPreset.frequency_penalty as number) ?? 0,
    presence_penalty: (knownPreset.presence_penalty as number) ?? 0,
    top_p: (knownPreset.top_p as number) ?? 0.9,
    top_k: (knownPreset.top_k as number) ?? 1,
    top_a: (knownPreset.top_a as number) ?? 0,
    min_p: (knownPreset.min_p as number) ?? 0,
    repetition_penalty: (knownPreset.repetition_penalty as number) ?? 1,
    openai_max_context: (knownPreset.openai_max_context as number) ?? 128000,
    openai_max_tokens: (knownPreset.openai_max_tokens as number) ?? 4096,
    impersonation_prompt: knownPreset.impersonation_prompt as string | undefined,
    new_chat_prompt: knownPreset.new_chat_prompt as string | undefined,
    new_group_chat_prompt: knownPreset.new_group_chat_prompt as string | undefined,
    new_example_chat_prompt: knownPreset.new_example_chat_prompt as string | undefined,
    continue_nudge_prompt: knownPreset.continue_nudge_prompt as string | undefined,
    group_nudge_prompt: knownPreset.group_nudge_prompt as string | undefined,
    wi_format: knownPreset.wi_format as string | undefined,
    scenario_format: knownPreset.scenario_format as string | undefined,
    personality_format: knownPreset.personality_format as string | undefined,
    assistant_prefill: knownPreset.assistant_prefill as string | undefined,
    assistant_impersonation: knownPreset.assistant_impersonation as string | undefined,
    stream_openai: knownPreset.stream_openai as boolean | undefined,
    names_behavior: knownPreset.names_behavior as number | undefined,
    wrap_in_quotes: knownPreset.wrap_in_quotes as boolean | undefined,
    send_if_empty: knownPreset.send_if_empty as string | undefined,
    seed: knownPreset.seed as number | undefined,
    n: knownPreset.n as number | undefined,
    squash_system_messages: knownPreset.squash_system_messages as boolean | undefined,
    continue_prefill: knownPreset.continue_prefill as boolean | undefined,
    continue_postfix: knownPreset.continue_postfix as string | undefined,
    function_calling: knownPreset.function_calling as boolean | undefined,
    show_thoughts: knownPreset.show_thoughts as boolean | undefined,
    reasoning_effort: knownPreset.reasoning_effort as string | undefined,
    max_context_unlocked: knownPreset.max_context_unlocked as boolean | undefined,
    bias_preset_selected: knownPreset.bias_preset_selected as string | undefined,
    prompts: Array.isArray(knownPreset.prompts)
      ? (knownPreset.prompts as unknown as import("@/types").PresetPrompt[])
      : [],
    extensions: Object.keys(mergedExt).length > 0 ? mergedExt : undefined,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function exportPresetJSON(preset: import("@/types").Preset): void {
  // 组装酒馆兼容输出：跳过内部字段，展开 extensions
  const output: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(preset)) {
    if (PRESET_INTERNAL_KEYS.has(key)) continue
    if (key === "extensions") {
      // 展开到顶层
      const ext = value as Record<string, unknown> | undefined
      if (ext) Object.assign(output, ext)
      continue
    }
    output[key] = value
  }

  const json = JSON.stringify(output, null, 2)
  const name = preset.name || "preset"
  downloadFile(json, `${name}.json`, "application/json")
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
