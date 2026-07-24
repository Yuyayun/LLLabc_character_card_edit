import { describe, expect, it } from "vitest"
import * as parser from "@/lib/parser"

describe("parser 兼容门面", () => {
  it("继续暴露 1.1.6 的全部公开入口", () => {
    expect(Object.keys(parser).sort()).toEqual([
      "buildCardOutput",
      "buildPresetOutput",
      "exportJSON",
      "exportPNG",
      "exportPresetJSON",
      "importCard",
      "normalizeCard",
      "normalizePreset",
      "parsePresetJSON",
    ])
  })
})
