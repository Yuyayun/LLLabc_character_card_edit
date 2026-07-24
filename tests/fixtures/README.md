# 数据回归测试夹具

格式基准：SillyTavern `release` 提交
`8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8`，核对日期 2026-07-24。

这些文件是根据固定上游格式手工构造的最小代表性数据，不包含用户私人角色卡或预设。夹具特意包含编辑器不认识的顶层字段、嵌套字段和扩展字段，用于防止重构时发生静默丢失。

`regex-import-partial.json` 额外覆盖独立 Regex 数组的部分成功导入、未知字段、新 UUID，以及旧 `placement: 0` / `placement: 4` 的迁移显示。
