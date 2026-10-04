import type { CharacterCard } from "@/types"
import { blobToDataURL, downloadBlob, downloadFile } from "@/lib/file"
import { generateId } from "@/lib/utils"
import { buildRegexScripts, normalizeRegexScripts } from "./regex"
import {
  booleanValue,
  cloneRecord,
  isRecord,
  numberValue,
  parseDate,
  stringArrayValue,
  stringValue,
} from "./shared"
import { buildCharacterBook, normalizeCharacterBook } from "./worldbook"

export async function importCard(file: File): Promise<CharacterCard> {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".json")) {
    return importFromJSON(await file.text())
  }
  if (fileName.endsWith(".png")) {
    return importFromPNG(file)
  }
  throw new Error("不支持的文件格式，请使用 .json 或 .png")
}

async function importFromJSON(text: string): Promise<CharacterCard> {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) {
    throw new Error("角色卡 JSON 顶层必须是对象")
  }
  const raw = parsed
  return normalizeCard(raw)
}

async function importFromPNG(file: File): Promise<CharacterCard> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const { raw } = extractCardFromPNG(bytes)

  if (!raw) {
    throw new Error("PNG 文件中未找到角色卡数据 (tEXt/chara 或 tEXt/ccv3)")
  }

  const card = normalizeCard(raw)
  card.card_image = await blobToDataURL(new Blob([buffer], { type: "image/png" }))
  return card
}

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function hasPNGSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value)
}

interface PNGChunk {
  length: number
  type: string
  dataStart: number
  end: number
}

function readPNGChunk(bytes: Uint8Array, offset: number): PNGChunk {
  if (offset + 12 > bytes.length) {
    throw new Error("PNG 文件结构损坏")
  }

  const length = new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4
  ).getUint32(0, false)
  const end = offset + 12 + length
  if (end > bytes.length) {
    throw new Error("PNG 文件结构损坏")
  }

  return {
    length,
    type: String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    ),
    dataStart: offset + 8,
    end,
  }
}

export function extractCardFromPNG(bytes: Uint8Array): {
  raw: Record<string, unknown> | null
  rawVersion: string
} {
  if (!hasPNGSignature(bytes)) return { raw: null, rawVersion: "" }

  let offset = 8
  let raw: Record<string, unknown> | null = null
  let rawVersion = ""
  let foundIEND = false

  while (offset < bytes.length) {
    const chunk = readPNGChunk(bytes, offset)

    if (chunk.type === "tEXt") {
      const chunkData = bytes.slice(
        chunk.dataStart,
        chunk.dataStart + chunk.length
      )
      const nullIndex = chunkData.indexOf(0)

      if (nullIndex !== -1) {
        const keyword = new TextDecoder().decode(
          chunkData.slice(0, nullIndex)
        )

        if (keyword === "ccv3" || keyword === "chara") {
          const encoded = new TextDecoder().decode(
            chunkData.slice(nullIndex + 1)
          )

          try {
            const binary = atob(encoded)
            const utf8Bytes = new Uint8Array(binary.length)
            for (let index = 0; index < binary.length; index++) {
              utf8Bytes[index] = binary.charCodeAt(index)
            }

            const parsed: unknown = JSON.parse(
              new TextDecoder().decode(utf8Bytes)
            )

            if (isRecord(parsed) && (keyword === "ccv3" || !raw)) {
              raw = parsed
              rawVersion = keyword === "ccv3" ? "v3" : "v2"
            }
          } catch {
            // Ignore malformed card chunks and keep searching.
          }
        }
      }
    }

    if (chunk.type === "IEND") {
      foundIEND = true
      break
    }
    offset = chunk.end
  }

  if (!foundIEND) {
    throw new Error("PNG 文件结构损坏")
  }

  return { raw, rawVersion }
}

export function normalizeCard(
  raw: Record<string, unknown>
): CharacterCard {
  const data = isRecord(raw.data) ? raw.data : raw
  const extensions = isRecord(data.extensions) ? data.extensions : {}
  const depthPrompt = isRecord(data.depth_prompt)
    ? data.depth_prompt
    : isRecord(extensions.depth_prompt)
      ? extensions.depth_prompt
      : undefined

  return {
    raw_data: structuredClone(raw),
    id: generateId(),
    name: stringValue(raw.name) || stringValue(data.name),
    description:
      stringValue(raw.description) || stringValue(data.description),
    personality:
      stringValue(raw.personality) || stringValue(data.personality),
    scenario:
      stringValue(raw.scenario) || stringValue(data.scenario),
    first_mes:
      stringValue(raw.first_mes) || stringValue(data.first_mes),
    mes_example:
      stringValue(raw.mes_example) || stringValue(data.mes_example),
    creatorcomment:
      stringValue(raw.creatorcomment) ||
      stringValue(data.creator_notes) ||
      stringValue(data.creatorcomment),
    avatar:
      stringValue(data.avatar) || stringValue(raw.avatar) || "none",
    talkativeness: numberValue(
      raw.talkativeness,
      numberValue(
        extensions.talkativeness,
        numberValue(data.talkativeness, 0.5)
      )
    ),
    fav: booleanValue(
      raw.fav,
      booleanValue(
        extensions.fav,
        booleanValue(data.fav, false)
      )
    ),
    tags: stringArrayValue(
      raw.tags,
      stringArrayValue(data.tags)
    ),
    spec: "chara_card_v3",
    spec_version: "3.0",
    creator: stringValue(data.creator),
    character_version: stringValue(data.character_version),
    alternate_greetings: stringArrayValue(data.alternate_greetings),
    group_only_greetings:
      stringArrayValue(data.group_only_greetings),
    system_prompt: stringValue(data.system_prompt),
    post_history_instructions:
      stringValue(data.post_history_instructions),
    character_book: normalizeCharacterBook(
      data.character_book || data.world_book
    ),
    regex_scripts: normalizeRegexScripts(
      data.regex_scripts || extensions.regex_scripts
    ),
    depth_prompt: normalizeDepthPrompt(depthPrompt),
    created_at:
      parseDate(raw.created_at) ??
      parseDate(data.created_at) ??
      parseDate(data.create_date) ??
      new Date(),
    updated_at:
      parseDate(raw.updated_at) ??
      parseDate(data.updated_at) ??
      new Date(),
  }
}

function normalizeDepthPrompt(
  raw: Record<string, unknown> | undefined
): CharacterCard["depth_prompt"] {
  const role = raw?.role
  return {
    prompt: stringValue(raw?.prompt),
    depth: numberValue(raw?.depth, 4),
    role: role === "user" || role === "assistant" ? role : "system",
  }
}

async function resolveCharacterBook(
  card: CharacterCard
): Promise<CharacterCard> {
  if (card.character_book) return card

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
  const output = buildCardOutput(await resolveCharacterBook(card))
  downloadFile(
    JSON.stringify(output, null, 2),
    `${card.name || "character"}.json`,
    "application/json"
  )
}

export async function exportPNG(card: CharacterCard): Promise<void> {
  if (!card.card_image) throw new Error("无卡面图片")

  let pngBinary: Uint8Array

  if (card.card_image.startsWith("data:")) {
    const encoded = card.card_image.split(",")[1]
    const binary = atob(encoded)
    pngBinary = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) {
      pngBinary[index] = binary.charCodeAt(index)
    }
  } else {
    let response: Response
    try {
      response = await fetch(card.card_image)
    } catch {
      throw new Error(
        "无法获取卡面图片：网络错误或 CORS 限制（图片可能来自外部 URL，无法跨域访问）"
      )
    }

    if (!response.ok) {
      throw new Error(`获取卡面图片失败 (HTTP ${response.status})`)
    }
    pngBinary = new Uint8Array(await response.arrayBuffer())
  }

  const output = buildCardOutput(await resolveCharacterBook(card))
  const jsonBytes = new TextEncoder().encode(JSON.stringify(output))
  const encoded = uint8ToBase64(jsonBytes)
  const result = injectCardChunkIntoPNG(pngBinary, encoded, "ccv3")

  downloadBlob(
    new Blob([result.buffer as ArrayBuffer], { type: "image/png" }),
    `${card.name || "character"}.png`
  )
}

function mergeDepthPrompt(
  raw: unknown,
  current: CharacterCard["depth_prompt"]
): Record<string, unknown> {
  return {
    ...cloneRecord(raw),
    ...structuredClone(current),
  }
}

export function buildCardOutput(
  card: CharacterCard
): Record<string, unknown> {
  const output = cloneRecord(card.raw_data)
  delete output.json_data

  Object.assign(output, {
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
  })

  const data = cloneRecord(output.data)
  Object.assign(data, {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.first_mes,
    mes_example: card.mes_example,
    creator_notes: card.creatorcomment,
    avatar: card.avatar,
    system_prompt: card.system_prompt,
    post_history_instructions: card.post_history_instructions,
    tags: card.tags,
    creator: card.creator,
    character_version: card.character_version,
    alternate_greetings: card.alternate_greetings,
    group_only_greetings: card.group_only_greetings,
  })

  const regexScripts = buildRegexScripts(card.regex_scripts)
  const extensions = cloneRecord(data.extensions)
  Object.assign(extensions, {
    talkativeness: card.talkativeness,
    fav: card.fav,
    world: card.character_book?.name || "",
    depth_prompt: mergeDepthPrompt(
      extensions.depth_prompt,
      card.depth_prompt
    ),
    regex_scripts: regexScripts,
  })
  data.extensions = extensions

  if ("depth_prompt" in data) {
    data.depth_prompt = mergeDepthPrompt(
      data.depth_prompt,
      card.depth_prompt
    )
  }
  if ("regex_scripts" in data) {
    data.regex_scripts = regexScripts
  }

  if (card.character_book) {
    const characterBook = buildCharacterBook(card.character_book)
    data.character_book = characterBook
    if ("world_book" in data) {
      data.world_book = structuredClone(characterBook)
    }
  } else {
    delete data.character_book
    delete data.world_book
  }

  output.data = data
  return output
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}

export function injectCardChunkIntoPNG(
  pngBytes: Uint8Array,
  base64Data: string,
  keyword: "ccv3" | "chara"
): Uint8Array {
  if (!hasPNGSignature(pngBytes)) {
    throw new Error("PNG 文件结构损坏")
  }

  const keywordBytes = new TextEncoder().encode(keyword)
  const dataBytes = new TextEncoder().encode(base64Data)
  const chunkData = new Uint8Array(
    keywordBytes.length + 1 + dataBytes.length
  )
  chunkData.set(keywordBytes)
  chunkData[keywordBytes.length] = 0
  chunkData.set(dataBytes, keywordBytes.length + 1)

  const length = chunkData.length
  const typeBytes = new TextEncoder().encode("tEXt")
  const crcData = new Uint8Array(4 + length)
  crcData.set(typeBytes)
  crcData.set(chunkData, 4)
  const crc = crc32(crcData)

  const newChunk = new Uint8Array(12 + length)
  const view = new DataView(newChunk.buffer)
  view.setUint32(0, length, false)
  newChunk.set(typeBytes, 4)
  newChunk.set(chunkData, 8)
  view.setUint32(8 + length, crc, false)

  const parts: Uint8Array[] = [pngBytes.slice(0, 8)]
  let offset = 8
  let foundIEND = false

  while (offset < pngBytes.length) {
    const chunk = readPNGChunk(pngBytes, offset)

    if (chunk.type === "tEXt") {
      const data = pngBytes.slice(
        chunk.dataStart,
        chunk.dataStart + chunk.length
      )
      const nullIndex = data.indexOf(0)
      if (nullIndex !== -1) {
        const existingKeyword = new TextDecoder().decode(
          data.slice(0, nullIndex)
        )
        if (
          existingKeyword === "chara" ||
          existingKeyword === "ccv3"
        ) {
          offset = chunk.end
          continue
        }
      }
    }

    if (chunk.type === "IEND") {
      parts.push(newChunk)
      parts.push(pngBytes.slice(offset))
      foundIEND = true
      break
    }

    parts.push(pngBytes.slice(offset, chunk.end))
    offset = chunk.end
  }

  if (!foundIEND) {
    throw new Error("PNG 文件结构损坏")
  }

  const totalLength = parts.reduce(
    (sum, part) => sum + part.length,
    0
  )
  const merged = new Uint8Array(totalLength)
  let position = 0
  for (const part of parts) {
    merged.set(part, position)
    position += part.length
  }
  return merged
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let index = 0; index < data.length; index++) {
    crc ^= data[index]
    for (let bit = 0; bit < 8; bit++) {
      crc =
        crc & 1
          ? (crc >>> 1) ^ 0xedb88320
          : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
