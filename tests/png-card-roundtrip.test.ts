import { Buffer } from "node:buffer"
import { describe, expect, it } from "vitest"
import {
  extractCardFromPNG,
  injectCardChunkIntoPNG,
} from "@/lib/parsers/card"

const TRANSPARENT_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

describe("PNG 角色卡 chunk 往返", () => {
  it("写入并读取 UTF-8 ccv3 数据", () => {
    const raw = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "中文角色",
        future_data_field: {
          keep: true,
        },
      },
    }
    const png = new Uint8Array(
      Buffer.from(TRANSPARENT_PNG, "base64")
    )
    const encoded = Buffer.from(
      JSON.stringify(raw),
      "utf8"
    ).toString("base64")

    const injected = injectCardChunkIntoPNG(
      png,
      encoded,
      "ccv3"
    )
    const extracted = extractCardFromPNG(injected)

    expect(extracted.rawVersion).toBe("v3")
    expect(extracted.raw).toEqual(raw)
  })

  it("重复写入时替换旧角色卡 chunk", () => {
    const png = new Uint8Array(
      Buffer.from(TRANSPARENT_PNG, "base64")
    )
    const first = injectCardChunkIntoPNG(
      png,
      Buffer.from(
        JSON.stringify({ data: { name: "旧数据" } }),
        "utf8"
      ).toString("base64"),
      "chara"
    )
    const secondRaw = { data: { name: "新数据" } }
    const second = injectCardChunkIntoPNG(
      first,
      Buffer.from(JSON.stringify(secondRaw), "utf8").toString(
        "base64"
      ),
      "ccv3"
    )

    expect(extractCardFromPNG(second)).toEqual({
      raw: secondRaw,
      rawVersion: "v3",
    })
  })
})
