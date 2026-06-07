# 空间站 Space Station

## 项目概述

一个纯前端的 SillyTavern 工具集（SPA + PWA），用于编辑 SillyTavern 角色卡（character cards）、世界书（world books）和 AI 预设。

- **位置**: `c:\Users\Diluc\Documents\杂物堆放\角色卡编辑器\`
- **需求文档**: `c:\Users\Diluc\Documents\杂物堆放\角色卡编辑器\需求文档.md`
- **参考范例**: `c:\Users\Diluc\Documents\杂物堆放\Mine\`

## 技术栈

- React 18 + TypeScript
- Vite（构建工具）
- Tailwind CSS
- shadcn/ui（组件库）
- Dexie.js（IndexedDB 封装）
- 仅中文界面

## 分阶段开发

### 第一阶段：编辑器
- 角色卡编辑
- 世界书编辑
- 导入/导出 JSON 格式
- 导入/导出 PNG 格式（SillyTavern 规范）

### 第二阶段：AI 聊天模块
- 写作辅助功能
- 角色卡测试功能

## SillyTavern 角色卡格式

- 规范版本：chara_card_v3（SillyTavern spec v3）
- PNG 格式：图片数据 + base64 编码的 JSON 数据，JSON 附加在 IEND chunk 之后
- AI 预设格式：SillyTavern AI preset 格式，包含 `prompts[]` 数组

## 用户资料

- 角色卡作者：辣白菜 (labaicai0969)
- 用户自己的角色卡存放于：`c:\Users\Diluc\Documents\杂物堆放\卡\`
- 用户自己的预设存放于：`c:\Users\Diluc\Documents\杂物堆放\Mine\白沙织梦\`、`c:\Users\Diluc\Documents\杂物堆放\Mine\新月观察者 留痕\`
- 参考范例：`c:\Users\Diluc\Documents\杂物堆放\Mine\`

## 部署

最终产物为静态站点，可部署到：
- Vercel
- GitHub Pages
- Cloudflare Pages

## 重要约定

- 界面语言仅限中文
- 纯客户端应用，无后端依赖
- 支持 PWA 离线使用
