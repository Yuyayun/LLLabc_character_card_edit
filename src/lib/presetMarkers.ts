import type { PresetPrompt } from "@/types"

const MARKER_IDENTIFIERS = new Set([
  "main",
  "worldInfoBefore",
  "worldInfoAfter",
  "charDescription",
  "charPersonality",
  "scenario",
  "dialogueExamples",
  "chatHistory",
  "personaDescription",
])

export function isPresetMarkerPrompt(prompt: PresetPrompt): boolean {
  return prompt.marker || MARKER_IDENTIFIERS.has(prompt.identifier)
}
