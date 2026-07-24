export type RegexListVariant = "card" | "preset"

export const REGEX_PLACEMENT_OPTIONS: {
  value: number
  label: string
}[] = [
  { value: 1, label: "用户输入" },
  { value: 2, label: "AI 输出" },
  { value: 3, label: "快捷命令" },
  { value: 4, label: "世界信息 (前)" },
  { value: 5, label: "世界信息" },
  { value: 6, label: "推理" },
]
