import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { WorldBook, WorldBookEntry } from "@/types"
import {
  buildStandaloneWorldInfo,
  buildStandaloneWorldInfoExportFile,
  normalizeCharacterBook,
  normalizeStandaloneWorldInfo,
  parseStandaloneWorldInfoFile,
  StandaloneWorldInfoImportError,
  validateStandaloneWorldInfo,
} from "@/lib/parsers/worldbook"

function loadFixture(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      new URL(
        "./fixtures/standalone-worldbook.json",
        import.meta.url
      ),
      "utf8"
    )
  ) as Record<string, unknown>
}

function fakeFile(
  name: string,
  content: string,
  type = ""
): File {
  return {
    name,
    type,
    text: async () => content,
  } as File
}

function importedFixture(): WorldBook {
  return normalizeStandaloneWorldInfo(loadFixture(), {
    fileName: "fixture.json",
    now: new Date("2026-07-24T00:00:00.000Z"),
  }).book
}

describe("独立世界书验证与导入", () => {
  it("导入标准 UID 对象并保存来源、时间与独立标记", () => {
    const now = new Date("2026-07-24T00:00:00.000Z")
    const result = normalizeStandaloneWorldInfo(loadFixture(), {
      fileName: "fallback.json",
      now,
    })

    expect(result.book.name).toBe("固定上游世界书")
    expect(result.book.entries.map((entry) => entry.id)).toEqual([
      7, 9,
    ])
    expect(result.book.is_standalone).toBe(true)
    expect(result.book.source_file_name).toBe("fallback.json")
    expect(result.book.created_at).toEqual(now)
    expect(result.book.updated_at).toEqual(now)
    expect(result.repairedUidCount).toBe(0)
  })

  it("兼容 entries 数组并按数组顺序补 UID", () => {
    const result = normalizeStandaloneWorldInfo({
      entries: [
        { key: ["one"], content: "1" },
        { uid: 8, key: ["two"], content: "2" },
      ],
    })

    expect(result.book.entries.map((entry) => entry.id)).toEqual([
      0, 8,
    ])
    expect(result.repairedUidCount).toBe(1)
  })

  it("区分缺少 entries、错误容器和错误条目", () => {
    expect(validateStandaloneWorldInfo({})).toMatchObject({
      valid: false,
      code: "MISSING_ENTRIES",
    })
    expect(
      validateStandaloneWorldInfo({ entries: "wrong" })
    ).toMatchObject({
      valid: false,
      code: "INVALID_ENTRIES",
    })
    expect(
      validateStandaloneWorldInfo({ entries: { 0: null } })
    ).toMatchObject({
      valid: false,
      code: "INVALID_ENTRY",
    })
  })

  it("允许空世界书，但不把错误结构当作空世界书", () => {
    const result = normalizeStandaloneWorldInfo(
      { entries: {} },
      { fileName: "空白书.json" }
    )

    expect(result.book.name).toBe("空白书")
    expect(result.book.entries).toEqual([])
    expect(() =>
      normalizeStandaloneWorldInfo({ entries: null })
    ).toThrow(StandaloneWorldInfoImportError)
  })

  it("名称依次使用顶层名称、文件名和未命名后备", () => {
    expect(
      normalizeStandaloneWorldInfo(
        { name: "  顶层名称  ", entries: {} },
        { fileName: "文件名.json" }
      ).book.name
    ).toBe("顶层名称")
    expect(
      normalizeStandaloneWorldInfo(
        { name: " ", entries: {} },
        { fileName: "文件名.json" }
      ).book.name
    ).toBe("文件名")
    expect(
      normalizeStandaloneWorldInfo({ entries: {} }).book.name
    ).toBe("未命名世界书")
  })

  it("按 uid、对象键、最小空闲值的优先级修复 UID", () => {
    const result = normalizeStandaloneWorldInfo({
      entries: {
        2: { uid: 3, content: "uid wins" },
        4: { content: "key wins" },
        invalid: { uid: -1, content: "allocate" },
        9: { uid: 3, content: "duplicate" },
      },
    })

    expect(result.book.entries.map((entry) => entry.id)).toEqual([
      3, 4, 0, 1,
    ])
    expect(result.repairedUidCount).toBe(3)
  })

  it("分别报告 JSON 解析失败和结构失败", async () => {
    await expect(
      parseStandaloneWorldInfoFile(
        fakeFile("broken.json", "{")
      )
    ).rejects.toMatchObject({ code: "INVALID_JSON" })
    await expect(
      parseStandaloneWorldInfoFile(
        fakeFile("missing.json", "{}")
      )
    ).rejects.toMatchObject({ code: "MISSING_ENTRIES" })
    await expect(
      parseStandaloneWorldInfoFile(
        fakeFile("wrong.txt", "{}")
      )
    ).rejects.toMatchObject({ code: "INVALID_FILE_TYPE" })
  })

  it("接受 application/json MIME 的无扩展名文件", async () => {
    await expect(
      parseStandaloneWorldInfoFile(
        fakeFile(
          "world-info",
          '{"entries":{}}',
          "application/json"
        )
      )
    ).resolves.toMatchObject({
      book: {
        name: "world-info",
        entries: [],
      },
    })
  })
})

describe("独立世界书字段转换", () => {
  it("完整映射基础字段、禁用反转和 camelCase 扩展", () => {
    const [entry] = importedFixture().entries

    expect(entry).toMatchObject({
      id: 7,
      keys: ["alpha", "beta"],
      secondary_keys: ["secondary"],
      insertion_order: 321,
      enabled: true,
      vectorized: true,
      selectiveLogic: 3,
      addMemo: true,
    })
    expect(entry.extensions).toMatchObject({
      position: 4,
      exclude_recursion: true,
      prevent_recursion: true,
      delay_until_recursion: 3,
      display_index: 12,
      probability: 73,
      depth: 8,
      outlet_name: "archive",
      group_override: true,
      group_weight: 88,
      scan_depth: null,
      case_sensitive: null,
      match_whole_words: false,
      use_group_scoring: true,
      automation_id: "fixture-auto",
      role: 2,
      cooldown: 5,
      match_persona_description: true,
      match_character_depth_prompt: true,
      match_creator_notes: true,
      triggers: ["normal", "continue"],
      ignore_budget: true,
    })
    expect(importedFixture().entries[1].enabled).toBe(false)
  })

  it("角色名称、标签、排除模式和过滤器未知字段双向保留", () => {
    const book = importedFixture()
    const entry = book.entries[0]

    expect(entry.character_filter_names).toEqual(["Alice.png"])
    expect(entry.character_filter_tags).toEqual(["tag-id"])
    expect(entry.character_filter_exclude).toBe(true)

    entry.character_filter_names = ["Bob.png"]
    const output = buildStandaloneWorldInfo(book).data
    const outputEntry = (
      output.entries as Record<string, Record<string, unknown>>
    )["7"]
    const filter = outputEntry.characterFilter as Record<
      string,
      unknown
    >
    const compatibilityFilter =
      outputEntry.character_filter as Record<string, unknown>

    expect(filter).toMatchObject({
      names: ["Bob.png"],
      tags: ["tag-id"],
      isExclude: true,
      future_filter_field: "keep",
    })
    expect(compatibilityFilter).toMatchObject({
      names: ["Bob.png"],
      tags: ["tag-id"],
      isExclude: true,
    })
  })

  it("null 三态和数字递归层级不会坍缩", () => {
    const book = importedFixture()
    const first = book.entries[0]
    const second = book.entries[1]

    expect(first.extensions.scan_depth).toBeNull()
    expect(first.extensions.case_sensitive).toBeNull()
    expect(first.extensions.delay_until_recursion).toBe(3)
    expect(second.extensions.match_whole_words).toBeNull()
    expect(second.extensions.use_group_scoring).toBeNull()
    expect(second.extensions.delay_until_recursion).toBe(false)

    const output = buildStandaloneWorldInfo(book).data
    const entries = output.entries as Record<
      string,
      Record<string, unknown>
    >
    expect(entries["7"].delayUntilRecursion).toBe(3)
    expect(entries["7"].caseSensitive).toBeNull()
    expect(entries["9"].matchWholeWords).toBeNull()
  })

  it("保留未知顶层、条目、extensions 与已有 originalData", () => {
    const output = buildStandaloneWorldInfo(importedFixture()).data
    const entries = output.entries as Record<
      string,
      Record<string, unknown>
    >
    const extensions = entries["7"].extensions as Record<
      string,
      unknown
    >

    expect(output.future_top_level).toEqual({
      keep: "top-level",
    })
    expect(output.originalData).toEqual({
      legacy_marker: "preserve-without-nesting",
    })
    expect(entries["7"].future_entry_field).toEqual({
      keep: "entry",
    })
    expect(extensions.future_entry_extension).toEqual({
      keep: "extension",
    })
  })

  it("独立格式往返后语义字段保持一致并同步兼容副本", () => {
    const firstPass = importedFixture()
    firstPass.entries[0].vectorized = false
    firstPass.entries[0].selectiveLogic = 2
    const output = buildStandaloneWorldInfo(firstPass).data
    const secondPass = normalizeStandaloneWorldInfo(output).book
    const entry = secondPass.entries[0]
    const extensions = (
      (output.entries as Record<
        string,
        Record<string, unknown>
      >)["7"].extensions as Record<string, unknown>
    )

    expect(entry.keys).toEqual(firstPass.entries[0].keys)
    expect(entry.insertion_order).toBe(321)
    expect(entry.enabled).toBe(true)
    expect(entry.vectorized).toBe(false)
    expect(entry.selectiveLogic).toBe(2)
    expect(extensions.vectorized).toBe(false)
    expect(extensions.selectiveLogic).toBe(2)
    expect(extensions.delay_until_recursion).toBe(3)
  })
})

describe("独立世界书导出", () => {
  it("内嵌世界书导出 UID 对象并包含当前 Character Book originalData", () => {
    const embedded = normalizeCharacterBook({
      name: "内嵌书",
      future_book_field: "keep",
      entries: [
        {
          id: 4,
          keys: ["key"],
          secondary_keys: [],
          comment: "entry",
          content: "content",
          constant: false,
          vectorized: true,
          selective: true,
          selectiveLogic: 3,
          insertion_order: 90,
          enabled: true,
          character_filter: {
            names: ["Alice.png"],
            tags: ["tag"],
            isExclude: false,
            unknown: "keep",
          },
          extensions: {
            position: 0,
            delay_until_recursion: 2,
            unknown_extension: "keep",
          },
        },
      ],
    })
    expect(embedded).toBeDefined()
    embedded!.entries[0].content = "edited in memory"

    const output = buildStandaloneWorldInfo(embedded!, {
      source: "embedded",
    }).data
    const entries = output.entries as Record<
      string,
      Record<string, unknown>
    >
    const originalData = output.originalData as Record<
      string,
      unknown
    >
    const originalEntries = originalData.entries as Record<
      string,
      unknown
    >[]
    const originalExtensions =
      originalEntries[0].extensions as Record<string, unknown>

    expect(Array.isArray(output.entries)).toBe(false)
    expect(entries["4"].content).toBe("edited in memory")
    expect(originalEntries[0].content).toBe("edited in memory")
    expect(originalEntries[0].character_filter).toMatchObject({
      names: ["Alice.png"],
      tags: ["tag"],
      isExclude: false,
      unknown: "keep",
    })
    expect(originalExtensions).toMatchObject({
      vectorized: true,
      selectiveLogic: 3,
      delay_until_recursion: 2,
      unknown_extension: "keep",
    })
  })

  it("重复或非法内部 ID 按稳定规则修复且不修改原对象", () => {
    const book = importedFixture()
    const entries = book.entries.map((entry) =>
      structuredClone(entry)
    )
    entries.push(structuredClone(entries[1]))
    entries[0].id = Number.NaN
    entries[1].id = 5
    entries[2].id = 5
    book.entries = entries

    const first = buildStandaloneWorldInfo(book)
    const second = buildStandaloneWorldInfo(book)

    expect(Object.keys(first.data.entries as object)).toEqual([
      "0", "1", "5",
    ])
    const outputEntries = first.data.entries as Record<
      string,
      Record<string, unknown>
    >
    expect(outputEntries["0"].uid).toBe(0)
    expect(outputEntries["5"].uid).toBe(5)
    expect(outputEntries["1"].uid).toBe(1)
    expect(first.repairedUidCount).toBe(2)
    expect(second.data).toEqual(first.data)
    expect(Number.isNaN(book.entries[0].id)).toBe(true)
    expect(book.entries[2].id).toBe(5)
  })

  it("使用四空格 JSON 和安全文件名", () => {
    const book = importedFixture()
    book.name = "测试/世界书:*?"
    const exported = buildStandaloneWorldInfoExportFile(book)

    expect(exported.content).toContain('\n    "name"')
    expect(JSON.parse(exported.content)).toEqual(exported.data)
    expect(exported.filename).toBe("测试_世界书___.json")
  })

  it("导出不会修改当前内存世界书或条目", () => {
    const book = importedFixture()
    const snapshot = structuredClone(book)
    buildStandaloneWorldInfoExportFile(book)

    expect(book).toEqual(snapshot)
  })

  it("非法 characterFilter 子字段只回退对应字段并保留同级未知值", () => {
    const result = normalizeStandaloneWorldInfo({
      entries: {
        0: {
          uid: 0,
          characterFilter: {
            names: "invalid",
            tags: ["valid-tag"],
            isExclude: "invalid",
            unknown: "keep",
          },
        },
      },
    })
    const entry = result.book.entries[0]

    expect(entry.character_filter_names).toEqual([])
    expect(entry.character_filter_tags).toEqual(["valid-tag"])
    expect(entry.character_filter_exclude).toBe(false)

    const output = buildStandaloneWorldInfo(result.book).data
    const outputEntry = (
      output.entries as Record<string, Record<string, unknown>>
    )["0"]
    expect(outputEntry.characterFilter).toMatchObject({
      names: [],
      tags: ["valid-tag"],
      isExclude: false,
      unknown: "keep",
    })
  })

  it("转换函数接受编辑器中可能出现的非法 ID 类型", () => {
    const entry = importedFixture().entries[0] as WorldBookEntry
    ;(entry as unknown as { id: unknown }).id = "invalid"
    const book = importedFixture()
    book.entries = [entry]

    const result = buildStandaloneWorldInfo(book)
    expect(Object.keys(result.data.entries as object)).toEqual(["0"])
  })
})
