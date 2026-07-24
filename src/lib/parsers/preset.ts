import type {
  Preset,
  PresetPromptOrder,
  PresetPromptOrderGroup,
} from "@/types"
import { downloadFile } from "@/lib/file"
import { generateId } from "@/lib/utils"
import { normalizeRegexScripts } from "./regex"
import { cloneRecord } from "./shared"

const PRESET_INTERNAL_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "raw_data",
])

export async function parsePresetJSON(file: File): Promise<Preset> {
  const text = await file.text()
  const raw = JSON.parse(text) as Record<string, unknown>
  const preset = normalizePreset(raw)
  if (!preset.name) {
    preset.name = file.name.replace(/\.json$/i, "")
  }
  return preset
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
    id: (raw.id as string) ?? generateId(),
    name: (raw.name as string) ?? "",
    temperature: (raw.temperature as number) ?? 1,
    frequency_penalty: (raw.frequency_penalty as number) ?? 0,
    presence_penalty: (raw.presence_penalty as number) ?? 0,
    top_p: (raw.top_p as number) ?? 0.9,
    top_k: (raw.top_k as number) ?? 1,
    top_a: (raw.top_a as number) ?? 0,
    min_p: (raw.min_p as number) ?? 0,
    repetition_penalty: (raw.repetition_penalty as number) ?? 1,
    openai_max_context: (raw.openai_max_context as number) ?? 128000,
    openai_max_tokens: (raw.openai_max_tokens as number) ?? 4096,
    impersonation_prompt: raw.impersonation_prompt as string | undefined,
    new_chat_prompt: raw.new_chat_prompt as string | undefined,
    new_group_chat_prompt: raw.new_group_chat_prompt as string | undefined,
    new_example_chat_prompt:
      raw.new_example_chat_prompt as string | undefined,
    continue_nudge_prompt: raw.continue_nudge_prompt as string | undefined,
    group_nudge_prompt: raw.group_nudge_prompt as string | undefined,
    wi_format: raw.wi_format as string | undefined,
    scenario_format: raw.scenario_format as string | undefined,
    personality_format: raw.personality_format as string | undefined,
    assistant_prefill: raw.assistant_prefill as string | undefined,
    assistant_impersonation:
      raw.assistant_impersonation as string | undefined,
    stream_openai: raw.stream_openai as boolean | undefined,
    names_behavior: raw.names_behavior as number | undefined,
    wrap_in_quotes: raw.wrap_in_quotes as boolean | undefined,
    send_if_empty: raw.send_if_empty as string | undefined,
    seed: raw.seed as number | undefined,
    n: raw.n as number | undefined,
    squash_system_messages:
      raw.squash_system_messages as boolean | undefined,
    continue_prefill: raw.continue_prefill as boolean | undefined,
    continue_postfix: raw.continue_postfix as string | undefined,
    function_calling: raw.function_calling as boolean | undefined,
    show_thoughts: raw.show_thoughts as boolean | undefined,
    reasoning_effort: raw.reasoning_effort as string | undefined,
    max_context_unlocked: raw.max_context_unlocked as boolean | undefined,
    bias_preset_selected: raw.bias_preset_selected as string | undefined,
    prompts: Array.isArray(raw.prompts)
      ? structuredClone(raw.prompts) as Preset["prompts"]
      : [],
    prompt_order: rawPromptOrder
      ? structuredClone(rawPromptOrder) as
        | PresetPromptOrderGroup[]
        | PresetPromptOrder[]
      : undefined,
    extensions:
      Object.keys(extensions).length > 0 ? extensions : undefined,
    created_at: new Date(),
    updated_at: new Date(),
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
