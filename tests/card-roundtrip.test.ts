import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildCardOutput, importCard, normalizeCard } from "@/lib/parser"

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
  ) as Record<string, unknown>
}

describe("角色卡往返", () => {
  it("保留未知字段并且不新增不存在的兼容镜像", () => {
    const card = normalizeCard(loadFixture("card-v3-roundtrip.json"))
    const output = buildCardOutput(card)
    const data = output.data as Record<string, unknown>
    const extensions = data.extensions as Record<string, unknown>
    const regexScripts = extensions.regex_scripts as Record<string, unknown>[]
    const book = data.character_book as Record<string, unknown>
    const entries = book.entries as Record<string, unknown>[]

    expect(output.future_card_root).toEqual({ keep: "card-root" })
    expect(data.future_data_field).toEqual({ keep: "card-data" })
    expect(extensions.future_card_extension).toEqual({
      keep: "card-extension",
    })
    expect(regexScripts[0].future_regex_field).toEqual({ keep: "regex" })
    expect(book.future_book_field).toEqual({ keep: "book" })
    expect(entries[0].future_entry_field).toEqual({ keep: "entry" })
    expect(
      (entries[0].extensions as Record<string, unknown>).future_entry_extension
    ).toEqual({ keep: "entry-extension" })

    expect(data).not.toHaveProperty("regex_scripts")
    expect(data).not.toHaveProperty("depth_prompt")
    expect(data).not.toHaveProperty("world_book")
    expect(output).not.toHaveProperty("raw_data")
    expect(output).not.toHaveProperty("bound_worldbook_id")
    expect(output).not.toHaveProperty("created_at")
    expect(output).not.toHaveProperty("updated_at")
    expect(book).not.toHaveProperty("raw_data")
    expect(book).not.toHaveProperty("is_standalone")
  })

  it("读取并同步 v3 data.avatar", () => {
    const card = normalizeCard({
      avatar: "none",
      data: {
        name: "头像测试",
        avatar: "avatar.png",
      },
    })

    expect(card.avatar).toBe("avatar.png")
    card.avatar = "updated.png"

    const output = buildCardOutput(card)
    expect(output.avatar).toBe("updated.png")
    expect((output.data as Record<string, unknown>).avatar).toBe("updated.png")
  })

  it("为界面依赖字段补安全默认值", () => {
    const card = normalizeCard({
      name: 123,
      tags: "invalid",
      data: {
        alternate_greetings: "invalid",
        group_only_greetings: ["有效开场"],
      },
    })

    expect(card.name).toBe("")
    expect(card.tags).toEqual([])
    expect(card.alternate_greetings).toEqual([])
    expect(card.group_only_greetings).toEqual(["有效开场"])
  })

  it("接受大小写混合的 JSON 扩展名", async () => {
    const file = {
      name: "Character.JSON",
      text: async () => JSON.stringify({ data: { name: "大写扩展名" } }),
    } as File

    await expect(importCard(file)).resolves.toMatchObject({
      name: "大写扩展名",
    })
  })
})
