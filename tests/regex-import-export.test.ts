import { File } from "node:buffer"
import { describe, expect, it } from "vitest"
import {
  buildRegexBatchExportFile,
  buildRegexExportFile,
  migrateRegexPlacement,
  normalizeRegexScript,
  parseRegexFile,
  parseRegexFiles,
} from "@/lib/parsers/regex"
import partialImportFixture from "./fixtures/regex-import-partial.json"

function jsonFile(name: string, value: unknown): globalThis.File {
  return new File(
    [typeof value === "string" ? value : JSON.stringify(value)],
    name,
    { type: "application/json" }
  ) as unknown as globalThis.File
}

describe("Regex placement 迁移", () => {
  it("缺失、空数组和无有效数字时使用 AI 输出默认值", () => {
    expect(migrateRegexPlacement(undefined).placement).toEqual([2])
    expect(migrateRegexPlacement([]).placement).toEqual([2])
    expect(migrateRegexPlacement(["bad"]).placement).toEqual([2])
  })

  it("旧位置 4 单独出现时迁移为快捷命令 3", () => {
    expect(migrateRegexPlacement([4])).toEqual({
      placement: [3],
      forceFormattingOnly: false,
    })
  })

  it("旧位置 4 混合出现时只移除 4 并保持顺序去重", () => {
    expect(migrateRegexPlacement([5, 4, 2, 5, 6])).toEqual({
      placement: [5, 2, 6],
      forceFormattingOnly: false,
    })
  })

  it("旧位置 0 单独出现时扩展为所有当前作用范围并开启两项格式限制", () => {
    const script = normalizeRegexScript({
      scriptName: "legacy markdown",
      placement: [0],
      markdownOnly: false,
      promptOnly: false,
    })

    expect(script.placement).toEqual([1, 2, 3, 5, 6])
    expect(script.markdownOnly).toBe(true)
    expect(script.promptOnly).toBe(true)
  })

  it("旧位置 0 混合出现时只移除 0，随后按规则处理 4", () => {
    const script = normalizeRegexScript({
      scriptName: "legacy mixed",
      placement: [2, 0, 4, 2, 6],
    })

    expect(script.placement).toEqual([2, 6])
    expect(script.markdownOnly).toBe(true)
    expect(script.promptOnly).toBe(true)
  })
})

describe("Regex 独立文件导入", () => {
  it("导入单对象时生成新 UUID、补默认值并保留未知字段", async () => {
    const result = await parseRegexFile(
      jsonFile("single.json", {
        id: "upstream-id",
        scriptName: "Single",
        futureField: { keep: true },
      })
    )

    expect(result.successCount).toBe(1)
    expect(result.failureCount).toBe(0)
    expect(result.scripts[0]).toMatchObject({
      scriptName: "Single",
      findRegex: "",
      replaceString: "",
      placement: [2],
      futureField: { keep: true },
    })
    expect(result.scripts[0].id).not.toBe("upstream-id")
  })

  it("数组中逐条校验，跳过坏条目并保留有效同级条目顺序", async () => {
    const result = await parseRegexFile(
      jsonFile("partial.json", partialImportFixture)
    )

    expect(result.scripts.map((script) => script.scriptName)).toEqual([
      "imported-four",
      "imported-zero",
    ])
    expect(result.scripts[0].placement).toEqual([3])
    expect(result.scripts[1]).toMatchObject({
      placement: [6],
      markdownOnly: true,
      promptOnly: true,
    })
    expect(result.successCount).toBe(2)
    expect(result.failureCount).toBe(1)
    expect(result.issues.map((issue) => issue.entryIndex)).toEqual([1])
  })

  it("placement 含非数字值时拒绝该条目而不做静默转换", async () => {
    const result = await parseRegexFile(
      jsonFile("invalid-placement.json", {
        scriptName: "invalid",
        placement: [2, "4"],
      })
    )

    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(1)
    expect(result.issues[0].message).toContain("数字数组")
  })

  it("多个文件按文件顺序和各自数组顺序追加", async () => {
    const result = await parseRegexFiles([
      jsonFile("a.json", [
        { scriptName: "a1" },
        { scriptName: "a2" },
      ]),
      jsonFile("b.json", { scriptName: "b1" }),
    ])

    expect(result.scripts.map((script) => script.scriptName)).toEqual([
      "a1",
      "a2",
      "b1",
    ])
    expect(new Set(result.scripts.map((script) => script.id)).size).toBe(3)
  })

  it.each([
    ["bad.json", "{", "JSON 格式无效"],
    ["empty.json", "   ", "文件为空"],
    ["primitive.json", "42", "顶层必须是对象或数组"],
    ["no-objects.json", "[1, null, \"x\"]", "数组中没有可导入的对象"],
  ])("文件级错误会整体拒绝：%s", async (name, content, message) => {
    const result = await parseRegexFile(jsonFile(name, content))

    expect(result).toMatchObject({
      scripts: [],
      successCount: 0,
      failureCount: 1,
    })
    expect(result.issues[0].message).toBe(message)
  })
})

describe("Regex 独立文件导出", () => {
  const script = normalizeRegexScript({
    id: "regex-id",
    scriptName: " My.Script:One ",
    findRegex: "/a/g",
    replaceString: "b",
    futureField: ["keep"],
  })

  it("单条导出是裸对象、4 空格缩进和兼容文件名", () => {
    const file = buildRegexExportFile(script)
    const parsed = JSON.parse(file.content)

    expect(file.filename).toBe("regex-_my_script_one_.json")
    expect(file.content).toContain('\n    "id": "regex-id"')
    expect(Array.isArray(parsed)).toBe(false)
    expect(parsed.futureField).toEqual(["keep"])
  })

  it("批量导出是裸数组、4 空格缩进和 ISO 时间文件名", () => {
    const file = buildRegexBatchExportFile(
      [script, { ...script, id: "second" }],
      new Date("2026-07-24T03:04:05.678Z")
    )

    expect(file.filename).toBe(
      "regex-2026-07-24T03:04:05.678Z.json"
    )
    expect(file.content).toContain('\n        "id": "regex-id"')
    expect(JSON.parse(file.content)).toHaveLength(2)
  })
})
