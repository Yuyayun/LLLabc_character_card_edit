import type { CharacterCard, Memo, Preset, PresetPrompt } from "@/types"
import { generateId } from "./utils"

export function createDefaultMemo(characterId: string): Memo {
  return {
    id: generateId(),
    character_id: characterId,
    content: "",
    created_at: new Date(),
    updated_at: new Date(),
    sort_order: Date.now(),
    edit_sessions: [],
  }
}

export function createDefaultCard(): CharacterCard {
  return {
    id: generateId(),
    name: "",
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    creatorcomment: "",
    avatar: "none",
    talkativeness: 0.5,
    fav: false,
    tags: [],
    spec: "chara_card_v3",
    spec_version: "3.0",
    creator: "",
    character_version: "",
    alternate_greetings: [],
    group_only_greetings: [],
    system_prompt: "",
    post_history_instructions: "",
    character_book: undefined,
    regex_scripts: [],
    depth_prompt: {
      prompt: "",
      depth: 4,
      role: "system",
    },
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function createDefaultPreset(): Preset {
  return {
    id: generateId(),
    name: "",
    temperature: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 0.9,
    top_k: 1,
    top_a: 0,
    min_p: 0,
    repetition_penalty: 1,
    openai_max_context: 128000,
    openai_max_tokens: 4096,
    prompts: [],
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function createDefaultPresetPrompt(): PresetPrompt {
  return {
    identifier: generateId(),
    name: "新建提示词",
    enabled: true,
    injection_position: 0,
    injection_depth: 4,
    injection_order: 100,
    role: "system",
    content: "",
    system_prompt: false,
    marker: false,
    forbid_overrides: false,
    injection_trigger: [],
  }
}

export function createDefaultWorldBookEntry(id: number) {
  return {
    id,
    keys: [],
    secondary_keys: [],
    comment: "",
    content: "",
    constant: false,
    vectorized: false,
    selective: true,
    selectiveLogic: 0,
    addMemo: false,
    insertion_order: 100,
    enabled: true,
    extensions: {
      position: 0,
      exclude_recursion: false,
      display_index: id,
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
    },
  }
}
