import { db } from "@/lib/db"
import { FONT_STORAGE_KEY } from "@/lib/fontSettings"

export async function clearCreativeData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.characterCards,
      db.worldBooks,
      db.presets,
      db.memos,
      db.chatSessions,
    ],
    async () => {
      await Promise.all([
        db.characterCards.clear(),
        db.worldBooks.clear(),
        db.presets.clear(),
        db.memos.clear(),
        db.chatSessions.clear(),
      ])
    }
  )
}

export async function resetApplicationData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.characterCards,
      db.worldBooks,
      db.presets,
      db.apiConfigs,
      db.chatSessions,
      db.memos,
      db.cloudSync,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.characterCards.clear(),
        db.worldBooks.clear(),
        db.presets.clear(),
        db.apiConfigs.clear(),
        db.chatSessions.clear(),
        db.memos.clear(),
        db.cloudSync.clear(),
        db.settings.clear(),
      ])
    }
  )
}

export function clearApplicationPreferences(): void {
  localStorage.removeItem("theme")
  localStorage.removeItem("accentColor")
  localStorage.removeItem(FONT_STORAGE_KEY)
}

export async function deleteCharacterWithRelations(characterId: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.characterCards, db.memos, db.chatSessions],
    async () => {
      await Promise.all([
        db.characterCards.delete(characterId),
        db.memos.where("character_id").equals(characterId).delete(),
        db.chatSessions.where("character_id").equals(characterId).delete(),
      ])
    }
  )
}

export async function deleteWorldBookWithBindings(worldBookId: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.worldBooks, db.characterCards],
    async () => {
      const now = new Date()
      await db.characterCards
        .filter((card) => card.bound_worldbook_id === worldBookId)
        .modify((card) => {
          delete card.bound_worldbook_id
          card.updated_at = now
        })
      await db.worldBooks.delete(worldBookId)
    }
  )
}
