import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildPresetOutput, normalizePreset } from "@/lib/parser"
import {
  getEditablePresetOrder,
  updateEditablePresetOrder,
} from "@/lib/presetOrder"

function loadFixture(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      new URL("./fixtures/preset-roundtrip.json", import.meta.url),
      "utf8"
    )
  ) as Record<string, unknown>
}

describe("预设往返", () => {
  it("保留顶层、扩展、提示词、Regex 和所有 prompt_order 角色组", () => {
    const preset = normalizePreset(loadFixture())
    const output = buildPresetOutput(preset)
    const extensions = output.extensions as Record<string, unknown>
    const regexScripts = extensions.regex_scripts as Record<string, unknown>[]
    const promptOrder = output.prompt_order as Record<string, unknown>[]

    expect(output.future_preset_root).toEqual({ keep: "preset-root" })
    expect(extensions.future_preset_extension).toEqual({
      keep: "preset-extension",
    })
    expect(regexScripts[0].future_regex_field).toBe("keep-preset-regex")
    expect((output.prompts as Record<string, unknown>[])[0].future_prompt_field)
      .toBe("keep")
    expect(promptOrder).toHaveLength(2)
    expect(promptOrder[1].future_group_field).toBe("keep-other-group")
    expect(extensions).not.toHaveProperty("prompt_order")
    expect(extensions).not.toHaveProperty("preferred_char_id")
    expect(output).not.toHaveProperty("raw_data")
    expect(output).not.toHaveProperty("id")
    expect(output).not.toHaveProperty("created_at")
    expect(output).not.toHaveProperty("updated_at")
  })

  it("只修改 100001 角色组并保留其他角色组", () => {
    const preset = normalizePreset(loadFixture())
    const originalOtherGroup = structuredClone(
      (preset.prompt_order as Record<string, unknown>[])[1]
    )

    expect(getEditablePresetOrder(preset)).toEqual([
      {
        identifier: "main",
        enabled: true,
        future_order_field: "keep-main",
      },
    ])

    const updated = updateEditablePresetOrder(preset, [
      {
        identifier: "main",
        enabled: false,
      },
    ])

    expect(updated[0]).toMatchObject({
      character_id: 100001,
      future_group_field: "keep-editable",
      order: [
        {
          identifier: "main",
          enabled: false,
        },
      ],
    })
    expect(updated[1]).toEqual(originalOtherGroup)
  })

  it("使用公共 Regex 规范化补全字段并保留未知数据", () => {
    const preset = normalizePreset({
      extensions: {
        regex_scripts: [
          {
            scriptName: "最小预设脚本",
            future_regex_field: "keep",
          },
        ],
      },
    })
    const scripts = preset.extensions?.regex_scripts as
      | Record<string, unknown>[]
      | undefined

    expect(scripts?.[0]).toMatchObject({
      scriptName: "最小预设脚本",
      placement: [2],
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      future_regex_field: "keep",
    })
    expect(scripts?.[0].id).toEqual(expect.any(String))
  })
})
