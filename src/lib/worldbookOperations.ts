import { db, type AppDB } from "@/lib/db"
import type { WorldBook } from "@/types"

export type WorldBookImportConflictCode =
  | "NAME_CONFLICT"
  | "STALE_CONFLICT"
  | "INVALID_BOOK"

export class WorldBookImportConflictError extends Error {
  code: WorldBookImportConflictCode
  existing?: WorldBook

  constructor(
    code: WorldBookImportConflictCode,
    message: string,
    existing?: WorldBook
  ) {
    super(message)
    this.name = "WorldBookImportConflictError"
    this.code = code
    this.existing = existing
  }
}

export interface StoreStandaloneWorldBookOptions {
  overwriteId?: string
  now?: Date
}

export async function findStandaloneWorldBookByName(
  name: string,
  database: AppDB = db
): Promise<WorldBook | undefined> {
  return database.worldBooks
    .filter(
      (book) =>
        book.is_standalone === true && book.name === name
    )
    .first()
}

export async function storeStandaloneWorldBookImport(
  importedBook: WorldBook,
  options: StoreStandaloneWorldBookOptions = {},
  database: AppDB = db
): Promise<WorldBook> {
  if (!importedBook.is_standalone) {
    throw new WorldBookImportConflictError(
      "INVALID_BOOK",
      "只能将独立世界书写入独立世界书列表"
    )
  }

  return database.transaction(
    "rw",
    [database.worldBooks, database.characterCards],
    async () => {
      const sameName = await findStandaloneWorldBookByName(
        importedBook.name,
        database
      )

      if (!options.overwriteId && sameName) {
        throw new WorldBookImportConflictError(
          "NAME_CONFLICT",
          `已存在同名世界书「${importedBook.name}」`,
          sameName
        )
      }

      if (options.overwriteId) {
        const existing = await database.worldBooks.get(
          options.overwriteId
        )
        if (
          !existing ||
          !existing.is_standalone ||
          existing.name !== importedBook.name ||
          (sameName && sameName.id !== existing.id)
        ) {
          throw new WorldBookImportConflictError(
            "STALE_CONFLICT",
            "同名世界书已发生变化，请重新选择文件"
          )
        }

        // 将角色卡表纳入同一事务快照；覆盖只原位更新世界书，
        // 不删除记录，也不改写任何 bound_worldbook_id。
        await database.characterCards
          .filter(
            (card) => card.bound_worldbook_id === existing.id
          )
          .count()

        const stored: WorldBook = {
          ...structuredClone(importedBook),
          id: existing.id,
          created_at: existing.created_at,
          updated_at: options.now
            ? new Date(options.now)
            : new Date(),
        }
        await database.worldBooks.put(stored)
        return stored
      }

      const stored = structuredClone(importedBook)
      await database.worldBooks.put(stored)
      return stored
    }
  )
}
