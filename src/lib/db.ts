import Dexie, { type EntityTable } from "dexie"
import type {
  CharacterCard,
  WorldBook,
  Preset,
  ApiConfig,
  ChatSession,
  Memo,
} from "@/types"

export class AppDB extends Dexie {
  characterCards!: EntityTable<CharacterCard, "id">
  worldBooks!: EntityTable<WorldBook, "id">
  presets!: EntityTable<Preset, "id">
  apiConfigs!: EntityTable<ApiConfig, "id">
  chatSessions!: EntityTable<ChatSession, "id">
  memos!: EntityTable<Memo, "id">

  constructor() {
    super("CharCardEditorDB")

    this.version(1).stores({
      characterCards: "id, name, created_at, updated_at",
      worldBooks: "id, name, is_standalone, created_at",
      presets: "id, name, created_at",
      apiConfigs: "id, name",
      chatSessions: "id, character_id, created_at",
    })

    this.version(2).stores({
      characterCards: "id, name, created_at, updated_at",
      worldBooks: "id, name, is_standalone, created_at",
      presets: "id, name, created_at",
      apiConfigs: "id, name",
      chatSessions: "id, character_id, created_at",
      memos: "id, character_id, created_at, sort_order",
    })
  }
}

export const db = new AppDB()
