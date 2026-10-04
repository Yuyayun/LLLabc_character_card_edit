import type {
  Preset,
  PresetPrompt,
  PresetPromptOrder,
  PresetPromptOrderGroup,
} from "@/types"
import { downloadFile } from "@/lib/file"
import { generateId } from "@/lib/utils"
import { normalizeRegexScripts } from "./regex"
import {
  booleanValue,
  cloneRecord,
  isRecord,
  numberValue,
  parseDate,
  stringArrayValue,
  stringValue,
} from "./shared"

const PRESET_INTERNAL_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "raw_data",
])

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

export async function parsePresetJSON(file: File): Promise<Preset> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) {
    throw new Error("预设 JSON 顶层必须是对象")
  }
  const raw = parsed
  const preset = normalizePreset(raw)
  if (!preset.name) {
    preset.name = file.name.replace(/\.json$/i, "")
  }
  return preset
}

function normalizePresetPrompt(value: unknown): PresetPrompt | null {
  if (!isRecord(value)) return null

  const role = value.role
  return {
    ...structuredClone(value),
    identifier: stringValue(value.identifier) || generateId(),
    name: stringValue(value.name),
    enabled: booleanValue(value.enabled, true),
    injection_position: numberValue(value.injection_position, 0),
    injection_depth: numberValue(value.injection_depth, 4),
    injection_order: numberValue(value.injection_order, 100),
    role: role === "user" || role === "assistant" ? role : "system",
    content: stringValue(value.content),
    system_prompt: booleanValue(value.system_prompt, false),
    marker: booleanValue(value.marker, false),
    forbid_overrides: booleanValue(value.forbid_overrides, false),
    injection_trigger: stringArrayValue(value.injection_trigger),
  }
}

export function normalizePresetPrompts(value: unknown): PresetPrompt[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizePresetPrompt)
    .filter((prompt): prompt is PresetPrompt => prompt !== null)
}

export function normalizePreset(raw: Record<string, unknown>): Preset {
  const extensions = cloneRecord(raw.extensions)
  if (Array.isArray(extensions.regex_scripts)) {
    extensions.regex_scripts = normalizeRegexScripts(
      extensions.regex_scripts
    )
  }
  const rawPromptOrder = Array.isArray(raw.prompt_order)
    ? raw.prompt_order
    : Array.isArray(extensions.prompt_order)
      ? extensions.prompt_order
      : undefined

  return {
    raw_data: structuredClone(raw),
    id: stringValue(raw.id) || generateId(),
    name: stringValue(raw.name),
    temperature: numberValue(raw.temperature, 1),
    frequency_penalty: numberValue(raw.frequency_penalty, 0),
    presence_penalty: numberValue(raw.presence_penalty, 0),
    top_p: numberValue(raw.top_p, 0.9),
    top_k: numberValue(raw.top_k, 1),
    top_a: numberValue(raw.top_a, 0),
    min_p: numberValue(raw.min_p, 0),
    repetition_penalty: numberValue(raw.repetition_penalty, 1),
    openai_max_context: numberValue(raw.openai_max_context, 128000),
    openai_max_tokens: numberValue(raw.openai_max_tokens, 4096),
    impersonation_prompt: optionalString(raw.impersonation_prompt),
    new_chat_prompt: optionalString(raw.new_chat_prompt),
    new_group_chat_prompt: optionalString(raw.new_group_chat_prompt),
    new_example_chat_prompt: optionalString(raw.new_example_chat_prompt),
    continue_nudge_prompt: optionalString(raw.continue_nudge_prompt),
    group_nudge_prompt: optionalString(raw.group_nudge_prompt),
    wi_format: optionalString(raw.wi_format),
    scenario_format: optionalString(raw.scenario_format),
    personality_format: optionalString(raw.personality_format),
    assistant_prefill: optionalString(raw.assistant_prefill),
    assistant_impersonation: optionalString(raw.assistant_impersonation),
    stream_openai: optionalBoolean(raw.stream_openai),
    names_behavior: optionalNumber(raw.names_behavior),
    wrap_in_quotes: optionalBoolean(raw.wrap_in_quotes),
    send_if_empty: optionalString(raw.send_if_empty),
    seed: optionalNumber(raw.seed),
    n: optionalNumber(raw.n),
    squash_system_messages: optionalBoolean(raw.squash_system_messages),
    continue_prefill: optionalBoolean(raw.continue_prefill),
    continue_postfix: optionalString(raw.continue_postfix),
    function_calling: optionalBoolean(raw.function_calling),
    show_thoughts: optionalBoolean(raw.show_thoughts),
    reasoning_effort: optionalString(raw.reasoning_effort),
    max_context_unlocked: optionalBoolean(raw.max_context_unlocked),
    bias_preset_selected: optionalString(raw.bias_preset_selected),
    prompts: normalizePresetPrompts(raw.prompts),
    prompt_order: rawPromptOrder
      ? structuredClone(rawPromptOrder) as
        | PresetPromptOrderGroup[]
        | PresetPromptOrder[]
      : undefined,
    extensions:
      Object.keys(extensions).length > 0 ? extensions : undefined,
    created_at: parseDate(raw.created_at) ?? new Date(),
    updated_at: parseDate(raw.updated_at) ?? new Date(),
  }
}

export function buildPresetOutput(
  preset: Preset
): Record<string, unknown> {
  const output = cloneRecord(preset.raw_data)

  for (const [key, value] of Object.entries(preset)) {
    if (PRESET_INTERNAL_KEYS.has(key)) continue
    if (key === "extensions") {
      const extensions = cloneRecord(output.extensions)
      delete extensions.prompt_order
      delete extensions.preferred_char_id
      const currentExtensions = cloneRecord(value)
      delete currentExtensions.prompt_order
      delete currentExtensions.preferred_char_id
      Object.assign(extensions, currentExtensions)
      if (Object.keys(extensions).length > 0) {
        output.extensions = extensions
      } else {
        delete output.extensions
      }
      continue
    }
    if (key === "prompt_order") continue
    if (value !== undefined) output[key] = structuredClone(value)
  }

  const legacyPromptOrder = preset.extensions?.prompt_order
  const promptOrder = preset.prompt_order ?? (
    Array.isArray(legacyPromptOrder)
      ? legacyPromptOrder as
        | PresetPromptOrderGroup[]
        | PresetPromptOrder[]
      : undefined
  )
  if (promptOrder !== undefined) {
    output.prompt_order = structuredClone(promptOrder)
  }

  return output
}

export function exportPresetJSON(preset: Preset): void {
  const output = buildPresetOutput(preset)
  const json = JSON.stringify(output, null, 2)
  const name = preset.name || "preset"
  downloadFile(json, `${name}.json`, "application/json")
}
