import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { CloudData } from "@/types"
import { AppDB } from "@/lib/db"
import { importAllData } from "@/lib/cloudSync"
import { createDefaultCard, createDefaultPreset } from "@/lib/helpers"

function serializedCloudData(
  overrides: Partial<CloudData> = {}
): CloudData {
  return JSON.parse(JSON.stringify({
    version: 1,
    exported_at: "2026-10-04T00:00:00.000Z",
    characterCards: [],
    worldBooks: [],
    presets: [],
    apiConfigs: [],
    chatSessions: [],
    memos: [],
    settings: [],
    ...overrides,
  })) as CloudData
}

describe("云同步合并导入", () => {
  let database: AppDB

  beforeEach(() => {
    database = new AppDB(`CloudSyncImport-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await database.delete()
  })

  it("更新同 ID 数据、保留本地独有数据并恢复日期", async () => {
    const localOnly = {
      ...createDefaultCard(),
      id: "local-only",
      name: "仅本地",
    }
    const oldShared = {
      ...createDefaultCard(),
      id: "shared",
      name: "旧名称",
    }
    const cloudShared = {
      ...oldShared,
      name: "云端名称",
      created_at: new Date("2026-10-01T00:00:00.000Z"),
      updated_at: new Date("2026-10-02T00:00:00.000Z"),
    }
    await database.characterCards.bulkPut([localOnly, oldShared])

    await importAllData(
      serializedCloudData({ characterCards: [cloudShared] }),
      undefined,
      database
    )

    expect(await database.characterCards.get("local-only"))
      .toMatchObject({ name: "仅本地" })
    const stored = await database.characterCards.get("shared")
    expect(stored).toMatchObject({ name: "云端名称" })
    expect(stored?.created_at).toBeInstanceOf(Date)
    expect(stored?.updated_at).toBeInstanceOf(Date)
  })

  it("任一表写入失败时整体回滚", async () => {
    const original = {
      ...createDefaultCard(),
      id: "shared",
      name: "原始名称",
    }
    const changed = {
      ...original,
      name: "不应保留的名称",
    }
    const preset = {
      ...createDefaultPreset(),
      id: "failing-preset",
    }
    await database.characterCards.put(original)
    database.presets.hook("creating", () => {
      throw new Error("forced preset failure")
    })

    await expect(
      importAllData(
        serializedCloudData({
          characterCards: [changed],
          presets: [preset],
        }),
        undefined,
        database
      )
    ).rejects.toThrow("forced preset failure")

    expect(await database.characterCards.get("shared"))
      .toMatchObject({ name: "原始名称" })
    expect(await database.presets.get("failing-preset")).toBeUndefined()
  })
})
