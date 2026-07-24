import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AppDB } from "@/lib/db"
import { createDefaultCard } from "@/lib/helpers"
import { normalizeStandaloneWorldInfo } from "@/lib/parsers/worldbook"
import {
  findStandaloneWorldBookByName,
  storeStandaloneWorldBookImport,
  WorldBookImportConflictError,
} from "@/lib/worldbookOperations"

function importedBook(name = "同名世界书") {
  return normalizeStandaloneWorldInfo(
    {
      name,
      entries: {
        0: {
          uid: 0,
          key: ["new"],
          content: "new content",
        },
      },
    },
    { now: new Date("2026-07-24T01:00:00.000Z") }
  ).book
}

describe("独立世界书导入事务", () => {
  let database: AppDB

  beforeEach(() => {
    database = new AppDB(
      `WorldBookImport-${crypto.randomUUID()}`
    )
  })

  afterEach(async () => {
    await database.delete()
  })

  it("新名称会创建新的独立世界书", async () => {
    const book = importedBook("新世界书")
    const stored = await storeStandaloneWorldBookImport(
      book,
      {},
      database
    )

    expect(stored.id).toBe(book.id)
    expect(
      await findStandaloneWorldBookByName("新世界书", database)
    ).toEqual(stored)
  })

  it("未确认覆盖时拒绝同名写入并保持原记录", async () => {
    const original = {
      ...importedBook(),
      id: "existing",
      entries: [],
      created_at: new Date("2026-07-20T00:00:00.000Z"),
      updated_at: new Date("2026-07-21T00:00:00.000Z"),
    }
    await database.worldBooks.put(original)

    await expect(
      storeStandaloneWorldBookImport(
        importedBook(),
        {},
        database
      )
    ).rejects.toBeInstanceOf(WorldBookImportConflictError)

    expect(await database.worldBooks.get("existing")).toEqual(
      original
    )
  })

  it("同名覆盖保留数据库 ID、创建时间及角色卡绑定", async () => {
    const originalCreatedAt = new Date(
      "2026-07-20T00:00:00.000Z"
    )
    const original = {
      ...importedBook(),
      id: "existing",
      entries: [],
      created_at: originalCreatedAt,
      updated_at: new Date("2026-07-21T00:00:00.000Z"),
    }
    const card = {
      ...createDefaultCard(),
      id: "bound-card",
      name: "绑定角色",
      bound_worldbook_id: "existing",
    }
    await database.worldBooks.put(original)
    await database.characterCards.put(card)

    const stored = await storeStandaloneWorldBookImport(
      importedBook(),
      {
        overwriteId: "existing",
        now: new Date("2026-07-24T02:00:00.000Z"),
      },
      database
    )

    expect(stored.id).toBe("existing")
    expect(stored.created_at).toEqual(originalCreatedAt)
    expect(stored.updated_at).toEqual(
      new Date("2026-07-24T02:00:00.000Z")
    )
    expect(stored.entries[0].content).toBe("new content")
    expect(
      (await database.characterCards.get("bound-card"))
        ?.bound_worldbook_id
    ).toBe("existing")
  })

  it("覆盖事务写入失败时原世界书与角色卡绑定完整回滚", async () => {
    const original = {
      ...importedBook(),
      id: "existing",
      entries: [],
      created_at: new Date("2026-07-20T00:00:00.000Z"),
      updated_at: new Date("2026-07-21T00:00:00.000Z"),
    }
    const card = {
      ...createDefaultCard(),
      id: "bound-card",
      name: "绑定角色",
      bound_worldbook_id: "existing",
    }
    await database.worldBooks.put(original)
    await database.characterCards.put(card)
    database.worldBooks.hook("updating", () => {
      throw new Error("forced overwrite failure")
    })

    await expect(
      storeStandaloneWorldBookImport(
        importedBook(),
        { overwriteId: "existing" },
        database
      )
    ).rejects.toThrow("forced overwrite failure")

    expect(await database.worldBooks.get("existing")).toEqual(
      original
    )
    expect(
      (await database.characterCards.get("bound-card"))
        ?.bound_worldbook_id
    ).toBe("existing")
  })
})
