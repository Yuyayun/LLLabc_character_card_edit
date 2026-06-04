// ========== 角色卡 (SillyTavern spec v3) ==========

export interface CharacterCard {
  id: string
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creatorcomment: string
  avatar: string
  talkativeness: number
  fav: boolean
  tags: string[]
  spec: "chara_card_v3"
  spec_version: "3.0"

  // 扩展
  creator: string
  character_version: string
  alternate_greetings: string[]
  group_only_greetings: string[]
  system_prompt: string
  post_history_instructions: string

  // 内嵌世界书
  character_book?: WorldBook

  // Regex 脚本
  regex_scripts: RegexScript[]

  // 深度提示
  depth_prompt: DepthPrompt

  // 卡面图片
  card_image?: string
  card_image_file?: string // 原始文件名

  // 绑定的独立世界书 ID
  bound_worldbook_id?: string

  created_at: Date
  updated_at: Date
}

export interface DepthPrompt {
  prompt: string
  depth: number
  role: "system" | "user" | "assistant"
}

export interface RegexScript {
  id: string
  scriptName: string
  findRegex: string
  replaceString: string
  trimStrings: string[]
  placement: number[]
  disabled: boolean
  markdownOnly: boolean
  promptOnly: boolean
  runOnEdit: boolean
  substituteRegex: number
  minDepth: number | null
  maxDepth: number | null
}

// ========== 世界书 ==========

export interface WorldBook {
  id: string
  name: string
  description?: string
  entries: WorldBookEntry[]
  is_standalone: boolean
  recursive_scanning?: boolean

  created_at: Date
  updated_at: Date
}

export interface WorldBookEntry {
  id: number
  keys: string[]
  secondary_keys: string[]
  comment: string
  content: string
  constant: boolean
  vectorized: boolean
  selective: boolean
  selectiveLogic: number
  insertion_order: number
  enabled: boolean
  addMemo: boolean
  character_filter_names?: string[]
  character_filter_tags?: string[]
  character_filter_exclude?: boolean
  extensions: WorldBookEntryExtensions
}

export interface WorldBookEntryExtensions {
  position: number
  exclude_recursion: boolean
  display_index: number
  probability: number
  useProbability: boolean
  depth: number
  outlet_name: string
  group: string
  group_override: boolean
  group_weight: number
  prevent_recursion: boolean
  delay_until_recursion: number
  scan_depth: number | null
  match_whole_words: boolean | null
  use_group_scoring: boolean | null
  case_sensitive: boolean | null
  automation_id: string
  role: number
  vectorized: boolean
  sticky: number | null
  cooldown: number | null
  delay: number | null
  match_persona_description: boolean
  match_character_description: boolean
  match_character_personality: boolean
  match_character_depth_prompt: boolean
  match_scenario: boolean
  match_creator_notes: boolean
  triggers: string[]
  ignore_budget: boolean
}

// ========== AI 预设 (酒馆格式) ==========

export interface Preset {
  id: string
  name: string

  // 采样参数
  temperature: number
  frequency_penalty: number
  presence_penalty: number
  top_p: number
  top_k: number
  top_a: number
  min_p: number
  repetition_penalty: number
  openai_max_context: number
  openai_max_tokens: number

  // 提示词列表
  prompts: PresetPrompt[]

  created_at: Date
  updated_at: Date
}

export interface PresetPrompt {
  identifier: string
  name: string
  enabled: boolean
  injection_position: number
  injection_depth: number
  injection_order: number
  role: "system" | "user" | "assistant"
  content: string
  system_prompt: boolean
  marker: boolean
  forbid_overrides: boolean
  injection_trigger?: string[]
}

// ========== API 配置 ==========

export type ApiProvider = "openai_compatible" | "google" | "anthropic" | "deepseek"

export interface ApiConfig {
  id: string
  provider: ApiProvider
  name: string
  base_url: string
  api_key: string
  default_model: string
  available_models: string[]
}

// ========== AI 对话 ==========

export interface ChatSession {
  id: string
  character_id: string
  preset_id: string
  api_config_id: string
  title: string
  messages: ChatMessage[]
  created_at: Date
  updated_at: Date
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  hidden: boolean
  created_at: Date
}

// ========== 灵感笔记 ==========

export interface Memo {
  id: string
  character_id: string
  content: string
  created_at: Date
  updated_at: Date
  sort_order: number
  edit_sessions: { start: number; end: number }[]
}

// ========== 云同步 ==========

export interface CloudSyncConfig {
  id: "cloud_sync"
  enabled: boolean
  gistId: string
  gistFilename: string
  githubToken: string
  autoUpload: boolean
  lastSyncAt: Date | null
  conflictStrategy: "force_push" | "force_pull"
}

export interface CloudData {
  version: 1
  exported_at: string
  characterCards: CharacterCard[]
  worldBooks: WorldBook[]
  presets: Preset[]
  apiConfigs: ApiConfig[]
  chatSessions: ChatSession[]
  memos: Memo[]
}
