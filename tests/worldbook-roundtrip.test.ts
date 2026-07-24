import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildCardOutput, normalizeCard } from "@/lib/parser"

function loadCardFixture(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      new URL("./fixtures/card-v3-roundtrip.json", import.meta.url),
      "utf8"
    )
  ) as Record<string, unknown>
}

describe("内嵌世界书往返", () => {
  it("保留条目顺序、ID、未知字段和递归延迟层级", () => {
    const card = normalizeCard(loadCardFixture())
    const book = card.character_book

    expect(book?.entries.map((entry) => entry.id)).toEqual([7, 9])
    expect(book?.entries[0].extensions.delay_until_recursion).toBe(true)
    expect(book?.entries[1].extensions.delay_until_recursion).toBe(3)

    const output = buildCardOutput(card)
    const data = output.data as Record<string, unknown>
    const outputBook = data.character_book as Record<string, unknown>
    const entries = outputBook.entries as Record<string, unknown>[]
    const firstExtensions = entries[0].extensions as Record<string, unknown>
    const secondExtensions = entries[1].extensions as Record<string, unknown>

    expect(entries.map((entry) => entry.id)).toEqual([7, 9])
    expect(firstExtensions.delay_until_recursion).toBe(true)
    expect(secondExtensions.delay_until_recursion).toBe(3)
    expect(firstExtensions.future_entry_extension).toEqual({
      keep: "entry-extension",
    })
  })
})
