import { describe, expect, it } from "vitest"
import type { RegexScript } from "@/types"
import { normalizeRegexScript } from "@/lib/parsers/regex"
import {
  insertRegexScripts,
  reorderRegexScript,
  selectRegexScriptsInSourceOrder,
} from "@/lib/regexOperations"

function script(id: string): RegexScript {
  return normalizeRegexScript({
    id,
    scriptName: id,
    futureField: `future-${id}`,
  })
}

describe("Regex 列表纯操作", () => {
  const scripts = [script("a"), script("b"), script("c"), script("d")]

  it("支持置顶、上移、下移和置底，且脚本对象本身不变", () => {
    expect(
      reorderRegexScript(scripts, "c", "top").map((item) => item.id)
    ).toEqual(["c", "a", "b", "d"])
    expect(
      reorderRegexScript(scripts, "c", "up").map((item) => item.id)
    ).toEqual(["a", "c", "b", "d"])
    expect(
      reorderRegexScript(scripts, "b", "down").map((item) => item.id)
    ).toEqual(["a", "c", "b", "d"])
    const bottom = reorderRegexScript(scripts, "b", "bottom")
    expect(bottom.map((item) => item.id)).toEqual(["a", "c", "d", "b"])
    expect(bottom[3]).toBe(scripts[1])
  })

  it("指定位置采用 1-based 并将越界输入夹到有效范围", () => {
    expect(
      reorderRegexScript(scripts, "c", -10).map((item) => item.id)
    ).toEqual(["c", "a", "b", "d"])
    expect(
      reorderRegexScript(scripts, "b", 99).map((item) => item.id)
    ).toEqual(["a", "c", "d", "b"])
  })

  it("选择结果始终按源列表顺序，而不是勾选顺序", () => {
    expect(
      selectRegexScriptsInSourceOrder(scripts, ["d", "b"]).map(
        (item) => item.id
      )
    ).toEqual(["b", "d"])
  })

  it("批量插入支持顶部、底部和指定位置并保持批次顺序", () => {
    const incoming = [script("x"), script("y")]
    expect(
      insertRegexScripts(scripts, incoming, { type: "top" }).map(
        (item) => item.id
      )
    ).toEqual(["x", "y", "a", "b", "c", "d"])
    expect(
      insertRegexScripts(scripts, incoming, { type: "bottom" }).map(
        (item) => item.id
      )
    ).toEqual(["a", "b", "c", "d", "x", "y"])
    expect(
      insertRegexScripts(scripts, incoming, {
        type: "position",
        position: 3,
      }).map((item) => item.id)
    ).toEqual(["a", "b", "x", "y", "c", "d"])
  })
})
