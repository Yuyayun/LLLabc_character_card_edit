import { generateId } from "@/lib/utils"

export const FONT_STORAGE_KEY = "space-station-font-settings-v1"
export const APP_FONT_VARIABLE = "--app-font-family"
export const FONT_PREVIEW_TEXT = "中文字体预览 ABC 123"

export const DEFAULT_FONT_FAMILY =
  '"Huiwen-Fangsong", -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'

export type FontSource = "builtin" | "custom"

export interface FontOption {
  id: string
  label: string
  family: string
  source: FontSource
  url: string
}

export interface CustomFont extends FontOption {
  source: "custom"
}

export interface FontPreferences {
  currentFontFamily: string
  customFonts: CustomFont[]
}

export interface CustomFontInput {
  label: string
  family: string
  url: string
}

export const builtInFonts: FontOption[] = [
  {
    id: "huiwen-fangsong",
    label: "汇文仿宋",
    family: DEFAULT_FONT_FAMILY,
    source: "builtin",
    url: "",
  },
  {
    id: "dy-ming-a",
    label: "澹雅明体",
    family: '"DYmingA", "Songti SC", "STSong", "SimSun", serif',
    source: "builtin",
    url: "https://fontsapi.zeoseven.com/35/main/result.css",
  },
  {
    id: "han-chan-rounded",
    label: "寒蝉全圆体",
    family:
      '"寒蝉全圆体", "PingFang SC", "Microsoft YaHei", sans-serif',
    source: "builtin",
    url: "https://fontsapi.zeoseven.com/3/main/result.css",
  },
  {
    id: "system-sans",
    label: "系统黑体",
    family:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    source: "builtin",
    url: "",
  },
  {
    id: "system-serif",
    label: "系统宋体",
    family:
      'ui-serif, "Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif',
    source: "builtin",
    url: "",
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(
  source: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

export function normalizeFamilyName(
  input: string,
  fallback = "sans-serif",
): string {
  const value = input.trim()
  if (!value) return ""
  if (value.includes(",")) return value

  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value
      : `"${value.replaceAll('"', '\\"')}"`

  return `${quoted}, ${fallback}`
}

export function getPrimaryFontFamily(family: string): string {
  const match = family.match(/^\s*("[^"]+"|'[^']+'|[^,]+)/)
  return match?.[1]?.trim() ?? family.trim()
}

export function validateFontStylesheetUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return "请填写字体 CSS 地址"

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "字体 CSS 地址只支持 http 或 https"
    }
  } catch {
    return "字体 CSS 地址格式不正确"
  }

  return null
}

function normalizeCustomFonts(value: unknown): CustomFont[] {
  if (!Array.isArray(value)) return []

  const normalized = value.flatMap((item, index) => {
    if (!isRecord(item)) return []

    const label = readString(item, ["label", "name", "displayName"])
    const familyInput = readString(item, ["family", "familyName"])
    const family = normalizeFamilyName(familyInput)
    const url = readString(item, ["url"])

    if (!label || !family || validateFontStylesheetUrl(url)) return []

    return [
      {
        id: readString(item, ["id"]) || `custom-font-${index}-${generateId()}`,
        label,
        family,
        source: "custom" as const,
        url,
      },
    ]
  })

  const seenFamilies = new Set<string>()
  return normalized.filter((font) => {
    if (seenFamilies.has(font.family)) return false
    seenFamilies.add(font.family)
    return true
  })
}

function findMatchingBuiltIn(font: CustomFont): FontOption | undefined {
  const primaryFamily = getPrimaryFontFamily(font.family)
  return builtInFonts.find(
    (builtIn) =>
      getPrimaryFontFamily(builtIn.family) === primaryFamily ||
      (Boolean(builtIn.url) && builtIn.url === font.url),
  )
}

export function createDefaultFontPreferences(): FontPreferences {
  return {
    currentFontFamily: DEFAULT_FONT_FAMILY,
    customFonts: [],
  }
}

export function loadFontPreferences(): FontPreferences {
  if (typeof window === "undefined") return createDefaultFontPreferences()

  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY)
    if (!raw) return createDefaultFontPreferences()

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return createDefaultFontPreferences()

    const normalizedCustomFonts = normalizeCustomFonts(parsed.customFonts)
    const savedFamily =
      typeof parsed.currentFontFamily === "string"
        ? parsed.currentFontFamily
        : ""
    const selectedSavedCustomFont = normalizedCustomFonts.find(
      (font) => font.family === savedFamily,
    )
    const promotedBuiltIn = selectedSavedCustomFont
      ? findMatchingBuiltIn(selectedSavedCustomFont)
      : undefined
    const customFonts = normalizedCustomFonts.filter(
      (font) => !findMatchingBuiltIn(font),
    )
    const availableFonts = [...builtInFonts, ...customFonts]
    const preferredFamily = promotedBuiltIn?.family ?? savedFamily
    const currentFontFamily = availableFonts.some(
      (font) => font.family === preferredFamily,
    )
      ? preferredFamily
      : DEFAULT_FONT_FAMILY

    return { currentFontFamily, customFonts }
  } catch (error) {
    console.warn("读取字体设置失败，已恢复默认字体", error)
    return createDefaultFontPreferences()
  }
}

export function saveFontPreferences(preferences: FontPreferences): void {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn("保存字体设置失败", error)
  }
}

export function createCustomFont(input: CustomFontInput): CustomFont {
  return {
    id: generateId(),
    label: input.label.trim(),
    family: normalizeFamilyName(input.family),
    source: "custom",
    url: input.url.trim(),
  }
}
