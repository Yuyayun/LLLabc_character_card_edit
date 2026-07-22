import type {
  Preset,
  PresetPromptOrder,
  PresetPromptOrderGroup,
} from "@/types"

const EDITABLE_CHARACTER_ID = "100001"

function storedPromptOrder(
  preset: Preset
): PresetPromptOrderGroup[] | PresetPromptOrder[] | undefined {
  if (Array.isArray(preset.prompt_order)) return preset.prompt_order
  const legacy = preset.extensions?.prompt_order
  return Array.isArray(legacy)
    ? legacy as PresetPromptOrderGroup[] | PresetPromptOrder[]
    : undefined
}

function isFlatOrder(
  value: PresetPromptOrderGroup[] | PresetPromptOrder[]
): value is PresetPromptOrder[] {
  const first = value[0]
  return Boolean(first && "identifier" in first && !("character_id" in first))
}

export function getEditablePresetOrder(preset: Preset): PresetPromptOrder[] {
  const stored = storedPromptOrder(preset)
  if (stored?.length) {
    if (isFlatOrder(stored)) return structuredClone(stored)

    const target = stored.find(
      (group) => String(group.character_id) === EDITABLE_CHARACTER_ID
    )
    if (target && Array.isArray(target.order)) {
      return structuredClone(target.order)
    }
  }

  return preset.prompts
    .filter((prompt) => prompt.identifier)
    .sort((a, b) => a.injection_order - b.injection_order)
    .map((prompt) => ({
      identifier: prompt.identifier,
      enabled: prompt.enabled,
    }))
}

export function updateEditablePresetOrder(
  preset: Preset,
  order: PresetPromptOrder[]
): PresetPromptOrderGroup[] {
  const stored = storedPromptOrder(preset)
  const groups = stored && !isFlatOrder(stored)
    ? structuredClone(stored)
    : []
  const targetIndex = groups.findIndex(
    (group) => String(group.character_id) === EDITABLE_CHARACTER_ID
  )

  if (targetIndex >= 0) {
    groups[targetIndex] = {
      ...groups[targetIndex],
      order: structuredClone(order),
    }
  } else if (order.length > 0) {
    groups.push({
      character_id: 100001,
      order: structuredClone(order),
    })
  }

  return groups
}
