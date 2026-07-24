import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { CharacterCard, Preset, RegexScript } from "@/types"
import { AppDB } from "@/lib/db"
import { createDefaultCard, createDefaultPreset } from "@/lib/helpers"
import { normalizeRegexScript } from "@/lib/parsers/regex"
import {
  listRegexTransferTargets,
  RegexOperationError,
  transferRegexScripts,
} from "@/lib/regexOperations"

function script(
  id: string,
  extra: Record<string, unknown> = {}
): RegexScript {
  return normalizeRegexScript({
    id,
    scriptName: id,
    ...extra,
  })
}

function card(
  id: string,
  scripts: RegexScript[],
  updatedAt = new Date("2026-07-24T00:00:00.000Z")
): CharacterCard {
  return {
    ...createDefaultCard(),
    id,
    name: `card-${id}`,
    description: `description-${id}`,
    regex_scripts: scripts,
    created_at: new Date("2026-07-23T00:00:00.000Z"),
    updated_at: updatedAt,
  }
}

function preset(
  id: string,
  scripts: RegexScript[],
  updatedAt = new Date("2026-07-24T00:00:00.000Z")
): Preset {
  return {
    ...createDefaultPreset(),
    id,
    name: `preset-${id}`,
    send_if_empty: `keep-${id}`,
    extensions: {
      third_party: { keep: true },
      regex_scripts: scripts,
    },
    created_at: new Date("2026-07-23T00:00:00.000Z"),
    updated_at: updatedAt,
  }
}

describe("Regex 跨对象数据库操作", () => {
  let database: AppDB

  beforeEach(() => {
    database = new AppDB(`RegexTransfer-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await database.delete()
  })

  it("复制到目标时生成新 UUID、保留未知字段且不修改源对象", async () => {
    const sourceUpdatedAt = new Date("2026-07-24T00:00:00.000Z")
    await database.characterCards.put(
      card("source", [
        script("a", { futureField: { keep: true } }),
        script("b"),
      ], sourceUpdatedAt)
    )
    await database.presets.put(
      preset("target", [script("existing")])
    )

    const result = await transferRegexScripts(
      {
        source: { kind: "card", id: "source" },
        target: { kind: "preset", id: "target" },
        scriptIds: ["a", "b"],
        mode: "copy",
        insertion: { type: "top" },
        expectedSourceUpdatedAt: sourceUpdatedAt,
      },
      database
    )

    expect(result.targetScripts.map((item) => item.scriptName)).toEqual([
      "a",
      "b",
      "existing",
    ])
    expect(result.targetScripts[0].id).not.toBe("a")
    expect(result.targetScripts[1].id).not.toBe("b")
    expect(result.targetScripts[0].futureField).toEqual({ keep: true })
    expect(result.sourceScripts.map((item) => item.id)).toEqual(["a", "b"])

    const storedSource = await database.characterCards.get("source")
    expect(storedSource?.updated_at).toEqual(sourceUpdatedAt)
    expect(storedSource?.description).toBe("description-source")
  })

  it("移动会保留 ID、保持源顺序、删除源条目并保留两端其他字段", async () => {
    await database.presets.put(
      preset("source", [script("a"), script("b"), script("c")])
    )
    await database.characterCards.put(
      card("target", [script("existing")])
    )

    const result = await transferRegexScripts(
      {
        source: { kind: "preset", id: "source" },
        target: { kind: "card", id: "target" },
        scriptIds: ["c", "a"],
        mode: "move",
        insertion: { type: "position", position: 2 },
      },
      database
    )

    expect(result.sourceScripts.map((item) => item.id)).toEqual(["b"])
    expect(result.targetScripts.map((item) => item.id)).toEqual([
      "existing",
      "a",
      "c",
    ])

    const storedSource = await database.presets.get("source")
    const storedTarget = await database.characterCards.get("target")
    expect(storedSource?.send_if_empty).toBe("keep-source")
    expect(storedSource?.extensions?.third_party).toEqual({ keep: true })
    expect(storedTarget?.description).toBe("description-target")
    expect(storedSource?.updated_at).toEqual(storedTarget?.updated_at)
  })

  it("移动遇到目标同 ID 冲突时阻止操作并保持两端数据", async () => {
    await database.characterCards.put(card("source", [script("same")]))
    await database.presets.put(preset("target", [script("same")]))

    await expect(
      transferRegexScripts(
        {
          source: { kind: "card", id: "source" },
          target: { kind: "preset", id: "target" },
          scriptIds: ["same"],
          mode: "move",
          insertion: { type: "bottom" },
        },
        database
      )
    ).rejects.toMatchObject({
      code: "TARGET_ID_CONFLICT",
    })

    expect(
      (await database.characterCards.get("source"))?.regex_scripts
    ).toHaveLength(1)
    expect(
      (await database.presets.get("target"))?.extensions?.regex_scripts
    ).toHaveLength(1)
  })

  it("源对象时间戳变化后拒绝用旧页面快照执行转移", async () => {
    await database.characterCards.put(
      card(
        "source",
        [script("a")],
        new Date("2026-07-24T01:00:00.000Z")
      )
    )
    await database.presets.put(preset("target", []))

    await expect(
      transferRegexScripts(
        {
          source: { kind: "card", id: "source" },
          target: { kind: "preset", id: "target" },
          scriptIds: ["a"],
          mode: "copy",
          insertion: { type: "bottom" },
          expectedSourceUpdatedAt: new Date(
            "2026-07-24T00:00:00.000Z"
          ),
        },
        database
      )
    ).rejects.toBeInstanceOf(RegexOperationError)
  })

  it("目标写入失败时移动事务完整回滚源对象", async () => {
    await database.characterCards.put(card("source", [script("a")]))
    await database.presets.put(preset("target", []))
    database.presets.hook("updating", () => {
      throw new Error("forced target failure")
    })

    await expect(
      transferRegexScripts(
        {
          source: { kind: "card", id: "source" },
          target: { kind: "preset", id: "target" },
          scriptIds: ["a"],
          mode: "move",
          insertion: { type: "bottom" },
        },
        database
      )
    ).rejects.toThrow("forced target failure")

    expect(
      (await database.characterCards.get("source"))?.regex_scripts.map(
        (item) => item.id
      )
    ).toEqual(["a"])
    expect(
      (await database.presets.get("target"))?.extensions?.regex_scripts
    ).toEqual([])
  })

  it("目标列表只返回相反类型并带脚本数量", async () => {
    await database.characterCards.bulkPut([
      card("z", []),
      card("a", [script("one")]),
    ])
    await database.presets.bulkPut([
      preset("p2", [script("one"), script("two")]),
      preset("p1", []),
    ])

    const cardTargets = await listRegexTransferTargets("preset", database)
    const presetTargets = await listRegexTransferTargets("card", database)

    expect(cardTargets.every((target) => target.kind === "card")).toBe(true)
    expect(cardTargets.map((target) => target.scriptCount)).toEqual([1, 0])
    expect(presetTargets.every((target) => target.kind === "preset")).toBe(
      true
    )
    expect(presetTargets.map((target) => target.scriptCount)).toEqual([0, 2])
  })
})
