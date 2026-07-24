import { describe, expect, it } from "vitest"
import { normalizeCard } from "@/lib/parser"

describe("Regex 规范化", () => {
  it("补全现有默认值并保留未知字段和数组顺序", () => {
    const card = normalizeCard({
      data: {
        extensions: {
          regex_scripts: [
            {
              scriptName: "最小脚本",
              future_regex_field: {
                keep: true,
              },
            },
          ],
        },
      },
    })

    expect(card.regex_scripts).toHaveLength(1)
    expect(card.regex_scripts[0]).toMatchObject({
      scriptName: "最小脚本",
      findRegex: "",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      future_regex_field: {
        keep: true,
      },
    })
    expect(card.regex_scripts[0].id).toEqual(expect.any(String))
  })
})
