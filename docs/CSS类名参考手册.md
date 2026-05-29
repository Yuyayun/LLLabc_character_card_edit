# 角色卡编辑器 — CSS 类名参考手册

> 本文档列出项目中所有自定义 CSS 类名（Tailwind 工具类），按功能区域分组，每类附中文注释。方便使用外部工具编写 CSS 后重新导入。

---

## 一、CSS 自定义属性 (src/index.css)

### 1.1 亮色主题 (:root) — Apple Style

```css
/* 苹果经典底层灰（衬托卡片纯白） */
--background: #F5F5F7;
/* 页面前景/文字色 */
--foreground: #1D1D1F;
/* 卡片/面板背景 — 纯白 + 悬浮阴影 */
--card: #FFFFFF;
--card-foreground: #1D1D1F;
/* 弹出层背景 — 毛玻璃半透明 */
--popover: rgba(255, 255, 255, 0.85);
--popover-foreground: #1D1D1F;
/* 主色调 — Apple 系统蓝 */
--primary: #007AFF;
--primary-foreground: #FFFFFF;
/* 次要色 */
--secondary: #E8E8ED;
--secondary-foreground: #1D1D1F;
/* 静音/弱化色 */
--muted: #E5E5EA;
--muted-foreground: #86868B;
/* 悬停强调色 */
--accent: #F2F2F7;
--accent-foreground: #1D1D1F;
/* 危险/删除色 — Apple 红 */
--destructive: #FF3B30;
--destructive-foreground: #FFFFFF;
/* 极浅边框，模拟 Retina 细线 */
--border: rgba(60, 60, 67, 0.12);
--input: rgba(60, 60, 67, 0.12);
/* 焦点外环 */
--ring: rgba(0, 122, 255, 0.3);
/* 苹果风大圆角 */
--radius: 0.85rem;
```

### 1.2 暗色主题 (.dark) — Apple Style

```css
.dark {
  /* 纯黑底层 */
  --background: #000000;
  --foreground: #F5F5F7;
  /* 深空灰卡片 */
  --card: #1C1C1E;
  --card-foreground: #F5F5F7;
  --popover: rgba(28, 28, 30, 0.75);
  --popover-foreground: #F5F5F7;
  --primary: #0A84FF;
  --primary-foreground: #FFFFFF;
  --secondary: #2C2C2E;
  --secondary-foreground: #F5F5F7;
  --muted: #2C2C2E;
  --muted-foreground: #98989D;
  --accent: #3A3A3C;
  --accent-foreground: #F5F5F7;
  --destructive: #FF453A;
  --destructive-foreground: #FFFFFF;
  --border: rgba(84, 84, 88, 0.65);
  --input: rgba(84, 84, 88, 0.65);
  --ring: rgba(10, 132, 255, 0.3);
}
```

### 1.3 强调色主题 (运行时动态)

`--primary` 和 `--ring` 由 ThemeProvider 通过 JS 动态设置（`documentElement.style.setProperty`），覆盖 CSS 默认值。用户可在「设置 → 界面风格」中选择。

| 主题名       | 亮色 primary | 暗色 primary |
| ------------ | ------------ | ------------ |
| Apple 蓝 indigo | `#007AFF`    | `#0A84FF`    |
| 天蓝 sky     | `#0ea5e9`    | `#38bdf8`    |
| 翠绿 emerald | `#10b981`    | `#34d399`    |
| 玫瑰 rose    | `#f43f5e`    | `#fb7185`    |
| 琥珀 amber   | `#f59e0b`    | `#fbbf24`    |
| 岩黑 slate   | `#1e293b`    | `#94a3b8`    |

偏好存储在 `localStorage.accentColor`，值为上述英文 key。

### 1.4 全局基础规则

```css
* {
  border-color: var(--border);
  -webkit-tap-highlight-color: transparent;  /* 禁止移动端默认高亮 */
}
body {
  background-color: var(--background);
  color: var(--foreground);
  /* SF + 苹方原生字体栈，抗锯齿渲染 */
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 1.5 Apple 风格覆写规则

```css
/* 卡片悬浮阴影（弥散阴影） */
.bg-card {
  box-shadow: 0 4px 24px -8px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.dark .bg-card { box-shadow: 0 4px 24px -8px rgba(0,0,0,0.3); }

/* 按钮点击缩放反馈（类似 iOS 回弹） */
button { transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important; }
button:active:not(:disabled) { transform: scale(0.96); }

/* 输入框质感 — 内阴影 + 焦点外发光 */
input, textarea {
  transition: all 0.2s ease !important;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.02) !important;
}
input:focus, textarea:focus {
  box-shadow: 0 0 0 3px var(--ring), inset 0 1px 2px rgba(0,0,0,0.02) !important;
}

/* 顶栏毛玻璃（Frosted Glass） */
header.sticky {
  background-color: rgba(245,245,247,0.72) !important;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 0.5px solid var(--border);
}
.dark header.sticky { background-color: rgba(0,0,0,0.72) !important; }

/* 弹出层毛玻璃 */
.bg-popover, [role="dialog"] div > div.bg-card {
  background-color: var(--popover) !important;
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px var(--border);
}

/* Mac 风格细滚动条 */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: rgba(134,134,139,0.3);
  border-radius: 9999px;
  border: 2px solid var(--background);
}
::-webkit-scrollbar-thumb:hover { background-color: rgba(134,134,139,0.5); }
```

---

## 二、页面布局 (Layout)

### 2.1 AppLayout — 整体壳

| 类名                                               | 说明                         |
| -------------------------------------------------- | ---------------------------- |
| `min-h-screen flex flex-col`                       | 全屏高度，纵向弹性布局       |
| `border-b`                                         | 顶栏底部边框                 |
| `fixed top-0 left-0 right-0 z-50 bg-background`    | 顶栏固定吸顶                 |
| `h-14 flex items-center justify-between px-4`      | 顶栏高度 56px，flex 两端对齐 |
| `flex items-center gap-3`                          | 左侧 logo + 导航容器         |
| `font-bold text-lg`                                | Logo 文字                    |
| `flex items-center gap-1`                          | 导航链接容器                 |
| `text-sm px-3 py-1.5 rounded-md transition-colors` | 导航链接基础样式             |
| `hover:bg-muted`                                   | 导航链接悬停态               |
| `bg-primary/10 text-primary font-medium`           | 导航链接激活态               |
| `flex items-center gap-2`                          | 右侧操作区容器               |
| `flex-1 min-h-0`                                   | 主内容区撑满剩余空间         |

### 2.2 Editor — 编辑器页面

| 类名                                                              | 说明                        |
| ----------------------------------------------------------------- | --------------------------- |
| `h-[calc(100vh-3.5rem)] flex flex-col`                            | 编辑器全高（减去顶栏 56px） |
| `flex items-center justify-between px-4 py-2.5 border-b shrink-0` | 编辑器顶栏                  |
| `flex items-center gap-3 min-w-0`                                 | 顶栏左侧（返回+名称）       |
| `shrink-0`                                                        | 防止弹性压缩                |
| `min-w-0`                                                         | 允许文字截断                |
| `text-sm font-semibold border-none px-0 h-auto max-w-[200px]`     | 角色名输入框                |
| `text-[10px] text-muted-foreground`                               | 版本号小字                  |
| `flex items-center gap-1.5 shrink-0`                              | 顶栏右侧按钮区              |
| `h-8 text-xs`                                                     | 小型按钮标准尺寸            |
| `flex flex-1 min-h-0`                                             | 主内容区（侧栏+编辑区）     |

### 2.3 Editor 侧边导航栏

| 类名                                                                                                      | 说明                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `shrink-0 border-r bg-muted/30 flex flex-col py-2 gap-0.5 transition-all duration-200 overflow-hidden`    | 侧栏容器（含动画过渡）          |
| `w-[120px]`                                                                                               | 侧栏展开宽度                    |
| `w-0 border-r-0`                                                                                          | 侧栏收起（零宽+隐藏边框）       |
| `flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors mx-1 rounded-sm whitespace-nowrap` | 导航项基础（禁止换行）          |
| `bg-background text-foreground font-medium shadow-sm`                                                     | 导航项选中态                    |
| `text-muted-foreground hover:text-foreground hover:bg-background/50`                                      | 导航项默认态                    |
| `flex flex-1 flex-col min-w-0`                                                                            | 编辑区容器（侧栏切换按钮+内容） |
| `px-2 pt-1 shrink-0`                                                                                      | 侧栏切换按钮行                  |
| `h-7 w-7`                                                                                                 | 侧栏切换按钮尺寸                |

### 2.4 Editor 编辑内容区

| 类名            | 说明                  |
| --------------- | --------------------- |
| `flex-1`        | 编辑区撑满            |
| `p-6 max-w-4xl` | 内边距 + 最大宽度限制 |

### 2.5 Dashboard — 首页

| 类名                                                                                     | 说明                          |
| ---------------------------------------------------------------------------------------- | ----------------------------- |
| `max-w-6xl mx-auto px-4 py-8`                                                            | 页面容器                      |
| `flex flex-wrap items-center justify-between gap-2 mb-8`                                 | 顶栏（标题+按钮，移动端换行） |
| `flex items-center gap-2 flex-wrap`                                                      | 按钮组（移动端换行）          |
| `text-2xl font-bold`                                                                     | 页面标题                      |
| `relative mb-6`                                                                          | 搜索框容器（相对定位锚点）    |
| `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`                 | 搜索图标绝对居中              |
| `pl-9 max-w-sm`                                                                          | 搜索框左内边距（给图标留空）  |
| `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4`     | 卡片网格（响应式列数）        |
| `group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative`        | 角色卡片容器                  |
| `p-3`                                                                                    | 卡片内边距                    |
| `aspect-[2/3] rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center` | 卡面预览容器（2:3比例）       |
| `w-full h-full object-cover`                                                             | 卡面图片填充                  |
| `h-8 w-8 text-muted-foreground opacity-30`                                               | 空卡面占位图标                |
| `font-medium text-sm truncate`                                                           | 角色名（单行截断）            |
| `flex items-center gap-1 flex-wrap`                                                      | 标签容器                      |
| `text-[10px] px-1.5 py-0`                                                                | 标签文字                      |
| `text-[10px] text-muted-foreground`                                                      | 次级信息小字                  |
| `absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity`    | 悬停显示删除按钮              |
| `flex flex-col items-center justify-center py-20 text-muted-foreground`                  | 空状态占位                    |

### 2.6 Settings — 设置页

| 类名                                                                                        | 说明                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------- |
| `max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8`                                               | 页面容器（响应式内边距）                |
| `flex items-center gap-2 mb-6`                                                              | 顶栏（标题+分段按钮）                   |
| `text-xl sm:text-2xl font-bold mr-2`                                                        | 页面标题                                |
| `flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5`                                    | 分段控件容器（同 EditorMemos 视图切换） |
| `px-2.5 py-1 text-xs sm:text-sm rounded-sm transition-colors whitespace-nowrap`             | 分段按钮基础                            |
| `bg-background text-foreground font-medium shadow-sm`                                       | 分段按钮选中态                          |
| `text-muted-foreground hover:text-foreground`                                               | 分段按钮默认态                          |
| `space-y-4 sm:space-y-6`                                                                    | 设置卡片间距（响应式）                  |
| `pb-2 sm:pb-4`                                                                              | 卡片头部下方间距（响应式）              |
| `text-sm sm:text-base flex items-center gap-2`                                              | 卡片标题（响应式字号）                  |
| `flex items-center justify-between gap-3`                                                   | 亮暗模式行（带间距防溢出）              |
| `flex items-center gap-2 sm:gap-3 min-w-0`                                                  | 模式图标+说明（允许文字截断）           |
| `h-4 sm:h-5 w-4 sm:w-5 shrink-0`                                                            | 模式图标（响应式尺寸）                  |
| `hidden sm:block`                                                                           | 移动端隐藏说明文字                      |
| `text-xs text-muted-foreground mb-3 sm:mb-4`                                                | 强调色说明文字                          |
| `grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3`                                            | 色块网格（3列→6列）                     |
| `flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all` | 色块按钮（响应式内边距）                |
| `border-primary shadow-sm`                                                                  | 色块选中态                              |
| `border-transparent hover:border-muted-foreground/30`                                       | 色块默认态                              |
| `w-7 h-7 sm:w-8 sm:h-8 rounded-full`                                                        | 色块圆点（响应式尺寸）                  |
| `text-[10px] sm:text-xs`                                                                    | 色块标签（响应式字号）                  |

---

## 三、编辑器面板 (Editor Sections)

### 3.1 EditorBasic — 基本信息

| 类名                                                                                                                                                 | 说明                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `grid grid-cols-1 lg:grid-cols-3 gap-8`                                                                                                              | 主布局：移动端单列，桌面端 1:2 |
| `space-y-3`                                                                                                                                          | 卡面区纵向间距                 |
| `aspect-[2/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all` | 卡面预览区（可点击上传）       |
| `w-full h-full object-cover`                                                                                                                         | 卡面图片                       |
| `h-10 w-10 opacity-30`                                                                                                                               | 空卡面图标                     |
| `text-xs`                                                                                                                                            | 提示文字                       |
| `hidden`                                                                                                                                             | 隐藏文件选择 input             |
| `w-full text-xs`                                                                                                                                     | 移除卡面按钮                   |
| `lg:col-span-2 space-y-8`                                                                                                                            | 右侧字段区                     |
| `text-sm font-semibold mb-3 pb-1.5 border-b`                                                                                                         | 段落标题（带下划线）           |
| `grid grid-cols-2 gap-x-6 gap-y-4`                                                                                                                   | 字段双列网格                   |
| `space-y-1.5`                                                                                                                                        | 单个字段容器                   |
| `max-w-xs`                                                                                                                                           | 标签输入框最大宽度             |
| `flex gap-2 mb-3`                                                                                                                                    | 标签输入+按钮行                |
| `flex flex-wrap gap-1.5`                                                                                                                             | 标签列表                       |
| `gap-1 pr-1`                                                                                                                                         | 单个标签（Badge）              |
| `hover:text-destructive`                                                                                                                             | 标签删除按钮悬停               |

### 3.2 EditorDefinition — 角色定义

| 类名                                                                                 | 说明                |
| ------------------------------------------------------------------------------------ | ------------------- |
| `space-y-8`                                                                          | 段落间距            |
| `flex items-center justify-between mb-2`                                             | 标题行（标题+字数） |
| `text-sm font-semibold`                                                              | 字段标签            |
| `text-[11px] text-muted-foreground`                                                  | 字数统计            |
| `font-sans text-sm leading-relaxed h-[400px] overflow-y-auto resize-y min-h-[200px]` | 角色描述 textarea   |
| `text-sm font-semibold mb-2 block`                                                   | 独立标签            |
| `font-sans text-sm leading-relaxed h-[160px] overflow-y-auto resize-y min-h-[100px]` | 性格/场景 textarea  |
| `font-sans text-sm leading-relaxed h-[240px] overflow-y-auto resize-y min-h-[150px]` | 第一条消息 textarea |
| `font-sans text-sm leading-relaxed h-[260px] overflow-y-auto resize-y min-h-[150px]` | 对话示例 textarea   |

### 3.3 EditorGreetings — 开场白

| 类名                                                                                 | 说明                       |
| ------------------------------------------------------------------------------------ | -------------------------- |
| `space-y-10`                                                                         | 两个 GreetingList 之间间距 |
| `space-y-4`                                                                          | GreetingList 内部间距      |
| `text-center py-8 text-muted-foreground text-sm`                                     | 空列表占位                 |
| `border-l-2 border-muted pl-4`                                                       | 单条开场白左侧强调线       |
| `font-sans text-sm leading-relaxed h-[200px] overflow-y-auto resize-y min-h-[120px]` | 开场白 textarea            |

### 3.4 EditorDepth — 深度提示

| 类名                                                                 | 说明                |
| -------------------------------------------------------------------- | ------------------- |
| `grid grid-cols-2 gap-x-6 gap-y-4 mb-4`                              | 深度/角色双列       |
| `font-mono text-sm h-[160px] overflow-y-auto resize-y min-h-[100px]` | 提示内容 textarea   |
| `font-mono text-sm h-[200px] overflow-y-auto resize-y min-h-[100px]` | 系统提示词 textarea |

### 3.5 EditorRegex — 正则脚本

| 类名                                                                              | 说明                 |
| --------------------------------------------------------------------------------- | -------------------- |
| `space-y-6`                                                                       | 段落间距             |
| `border rounded-lg`                                                               | 单个脚本卡片边框     |
| `opacity-50`                                                                      | 禁用态脚本淡化       |
| `flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-lg` | 脚本头栏             |
| `max-w-xs h-7 text-sm border-none bg-transparent px-0`                            | 脚本名称输入框       |
| `h-7 w-7 text-destructive hover:text-destructive`                                 | 删除按钮             |
| `p-4 space-y-4`                                                                   | 展开区               |
| `grid grid-cols-2 gap-4`                                                          | 正则/替换双列        |
| `font-mono text-xs max-h-32`                                                      | 正则/替换 textarea   |
| `flex flex-wrap gap-x-4 gap-y-1`                                                  | 作用范围 checkbox 行 |
| `flex items-center gap-1.5 cursor-pointer text-xs`                                | 单个 checkbox 选项   |
| `grid grid-cols-3 gap-4`                                                          | 替换宏/深度三列      |
| `flex items-center gap-x-6 gap-y-1 flex-wrap`                                     | 选项开关行           |

### 3.6 EditorMemos — 灵感笔记

| 类名                                                                                                       | 说明                              |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `space-y-4`                                                                                                | 主容器纵向间距                    |
| `flex items-center justify-between`                                                                        | 顶栏（视图切换+新建按钮）         |
| `flex items-center gap-1 bg-muted/50 rounded-md p-0.5`                                                     | 视图切换分段控件                  |
| `px-3 py-1 text-xs rounded-sm transition-colors`                                                           | 视图切换按钮基础                  |
| `bg-background text-foreground font-medium shadow-sm`                                                      | 视图切换按钮选中态                |
| `text-muted-foreground hover:text-foreground`                                                              | 视图切换按钮默认态                |
| `flex items-center justify-center py-16 text-muted-foreground text-sm`                                     | 加载/空状态居中占位               |
| `text-center py-16 text-muted-foreground text-sm`                                                          | 空列表提示                        |
| `space-y-3`                                                                                                | 卡片列表间距                      |
| `border rounded-lg bg-card`                                                                                | 灵感卡片容器                      |
| `flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 rounded-t-lg`                          | 卡片头部栏（时间戳+操作按钮）     |
| `text-[10px] text-muted-foreground`                                                                        | 时间戳小字                        |
| `h-6 w-6`                                                                                                  | 卡片头部小图标按钮（24px）        |
| `h-3 w-3`                                                                                                  | 微型图标（12px）                  |
| `text-destructive hover:text-destructive`                                                                  | 删除按钮红色                      |
| `p-3`                                                                                                      | 卡片内容区内边距                  |
| `font-sans text-sm leading-relaxed min-h-[80px] resize-y border-none shadow-none bg-transparent px-0 py-0` | 卡片内容 textarea（无边框无阴影） |
| `space-y-6`                                                                                                | 时间轴分组间距                    |
| `text-sm font-semibold mb-3 pb-1.5 border-b sticky top-0 bg-background`                                    | 时间轴日期分组标题（粘性定位）    |
| `flex gap-3 pl-1 border-l-2 border-muted ml-2`                                                             | 时间轴条目行（左侧竖线）          |
| `text-[10px] text-muted-foreground shrink-0 w-10 text-right leading-5`                                     | 时间轴时间标签（40px 固定宽）     |
| `text-sm whitespace-pre-wrap leading-5`                                                                    | 时间轴内容文字（保留换行）        |
| `text-muted-foreground italic`                                                                             | 空内容斜体占位                    |

### 3.7 WorldBookEntryEditor — 世界书条目（共享组件）

#### 3.7.1 头部栏

| 类名                                                                                      | 说明                      |
| ----------------------------------------------------------------------------------------- | ------------------------- |
| `border rounded-lg`                                                                       | 条目卡片边框              |
| `opacity-40 grayscale`                                                                    | 禁用条目视觉（淡化+去色） |
| `flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-t-lg cursor-pointer flex-wrap` | 头部栏（移动端控件换行）  |
| `p-0.5 shrink-0 text-muted-foreground`                                                    | 展开/折叠箭头             |
| `scale-75`                                                                                | 启用开关缩小              |
| `h-6 w-11 px-1 text-xs shrink-0 [&>svg]:hidden`                                           | 三态选择器（🔵🟢🔗）         |
| `min-w-0 flex-1 bg-transparent border-none outline-none text-sm px-1 h-6`                 | 条目名称输入              |
| `h-6 w-9 px-0.5 text-[10px] shrink-0 [&>svg]:hidden`                                      | 位置下拉                  |
| `h-6 w-12 text-xs px-1 shrink-0`                                                          | 深度/顺序 数字输入        |
| `h-6 w-11 text-xs px-1 shrink-0`                                                          | 概率 数字输入             |
| `h-6 w-6 shrink-0`                                                                        | 复制/删除按钮             |
| `text-destructive shrink-0`                                                               | 删除按钮红色              |

#### 3.7.2 展开面板

| 类名                                                                 | 说明                       |
| -------------------------------------------------------------------- | -------------------------- |
| `p-4 space-y-4 border-t`                                             | 展开区容器                 |
| `grid grid-cols-1 md:grid-cols-2 gap-4`                              | 触发词双列                 |
| `flex items-center gap-4 flex-wrap`                                  | 选择性逻辑行               |
| `flex items-center gap-1.5 pt-5`                                     | checkbox（加顶部边距对齐） |
| `font-mono text-xs h-[140px] overflow-y-auto resize-y min-h-[100px]` | 条目内容 textarea          |
| `text-muted-foreground ml-2`                                         | UID 标签                   |
| `grid grid-cols-2 md:grid-cols-4 gap-4`                              | 覆盖选项四列               |
| `grid grid-cols-1 md:grid-cols-2 gap-4`                              | 分组/计时双列              |
| `flex items-center gap-2`                                            | 分组内联行                 |
| `h-8 text-xs flex-1`                                                 | 分组输入框                 |
| `h-8 w-16 text-xs`                                                   | 分组权重输入               |
| `grid grid-cols-3 gap-2`                                             | 粘性/冷却/延迟三列         |
| `flex flex-wrap gap-x-4 gap-y-1`                                     | 匹配范围 checkbox 行       |
| `flex items-center gap-1.5 cursor-pointer text-xs`                   | checkbox+label 行          |

---

## 四、UI 基础组件类名

### 4.1 Button (button.tsx)

| 类名变体                                                                                                                        | 说明                 |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-none` | 按钮基础             |
| `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`                                                     | 按钮焦点环           |
| `disabled:pointer-events-none disabled:opacity-50`                                                                              | 按钮禁用态           |
| `[&_svg]:pointer-events-none [&_svg]:shrink-0`                                                                                  | 按钮内图标           |
| `bg-primary text-primary-foreground hover:bg-primary/90`                                                                        | variant=default      |
| `border border-input bg-background hover:bg-muted hover:text-foreground`                                                        | variant=outline      |
| `hover:bg-accent hover:text-accent-foreground`                                                                                  | variant=ghost        |
| `bg-destructive text-destructive-foreground hover:bg-destructive/90`                                                            | variant=destructive  |
| `text-destructive hover:text-destructive`                                                                                       | variant=ghost 危险态 |
| `border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80`                                        | variant=secondary    |
| `bg-muted text-foreground`                                                                                                      | variant=link         |
| `h-9 px-4 py-2`                                                                                                                 | size=default (36px)  |
| `h-8 rounded-[min(var(--radius-md),10px)] px-3 text-xs`                                                                         | size=sm (32px)       |
| `h-10 rounded-[min(var(--radius-md),12px)] px-6`                                                                                | size=lg (40px)       |
| `size-9`                                                                                                                        | size=icon (36px)     |
| `size-8`                                                                                                                        | size=icon-sm (32px)  |
| `size-10`                                                                                                                       | size=icon-lg (40px)  |

### 4.2 Input (input.tsx)

| 类名                                                                                                            | 说明              |
| --------------------------------------------------------------------------------------------------------------- | ----------------- |
| `flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors` | input 基础        |
| `file:border-0 file:bg-transparent file:text-sm file:font-medium`                                               | file input 内按钮 |
| `placeholder:text-muted-foreground`                                                                             | placeholder 颜色  |
| `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`                                     | 焦点态            |
| `disabled:cursor-not-allowed disabled:opacity-50`                                                               | 禁用态            |
| `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`                          | 校验失败态        |
| `dark:bg-input/30 dark:hover:bg-input/50`                                                                       | 暗色主题          |

### 4.3 Textarea (textarea.tsx)

| 类名                                                                                                                 | 说明             |
| -------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `flex min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors` | textarea 基础    |
| `placeholder:text-muted-foreground`                                                                                  | placeholder 颜色 |
| `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`                                          | 焦点态           |
| `disabled:cursor-not-allowed disabled:opacity-50`                                                                    | 禁用态           |

### 4.4 Select (select.tsx)

| 类名                                                                                                                                                                                  | 说明                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none` | SelectTrigger 基础   |
| `data-placeholder:text-muted-foreground`                                                                                                                                              | placeholder 态文字色 |
| `data-[size=default]:h-8`                                                                                                                                                             | 默认高度 32px        |
| `data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)]`                                                                                                              | 小尺寸               |
| `relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36`                                                                                                        | SelectContent 弹出层 |
| `rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10`                                                                                                   | 弹出层样式           |
| `relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm`                                                                                        | SelectItem           |
| `focus:bg-accent focus:text-accent-foreground`                                                                                                                                        | SelectItem 悬停      |
| `data-disabled:pointer-events-none data-disabled:opacity-50`                                                                                                                          | SelectItem 禁用      |

### 4.5 Switch (switch.tsx)

| 类名                                                                                                                                                                   | 说明         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `peer inline-flex h-(--switch-height) w-(--switch-width) shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none` | switch 基础  |
| `focus-visible:ring-3 focus-visible:ring-ring/50`                                                                                                                      | 焦点态       |
| `disabled:cursor-not-allowed disabled:opacity-50`                                                                                                                      | 禁用态       |
| `data-checked:bg-primary`                                                                                                                                              | 开启态背景色 |
| `bg-input`                                                                                                                                                             | 关闭态背景色 |
| `pointer-events-none block size-(--switch-thumb-size) rounded-full bg-background shadow-sm ring-0 transition-transform`                                                | switch 滑块  |

### 4.6 Checkbox (checkbox.tsx)

| 类名                                                                                                                                                    | 说明          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `peer inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-2 text-foreground/0 transition-colors outline-none` | checkbox 基础 |
| `border-foreground/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground`                                         | 选中态        |
| `data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground`                                            | 半选态        |
| `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`                                                                             | 焦点态        |
| `disabled:cursor-not-allowed disabled:opacity-50`                                                                                                       | 禁用态        |

### 4.7 Slider (slider.tsx)

| 类名                                                                                            | 说明            |
| ----------------------------------------------------------------------------------------------- | --------------- |
| `relative flex w-full touch-none select-none items-center`                                      | slider 容器     |
| `relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary`                          | slider 轨道     |
| `absolute h-full bg-primary`                                                                    | slider 已选范围 |
| `block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors` | slider 滑块     |
| `focus-visible:ring-3 focus-visible:ring-ring/50`                                               | 滑块焦点态      |

### 4.8 Card (card.tsx)

| 类名                                                       | 说明        |
| ---------------------------------------------------------- | ----------- |
| `rounded-xl border bg-card text-card-foreground shadow-sm` | Card 容器   |
| `p-6`                                                      | CardContent |
| `flex flex-col space-y-1.5 p-6`                            | CardHeader  |
| `font-semibold leading-none tracking-tight`                | CardTitle   |

### 4.9 Badge (badge.tsx)

| 类名                                                                                             | 说明                |
| ------------------------------------------------------------------------------------------------ | ------------------- |
| `inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors` | badge 基础          |
| `border-transparent bg-primary text-primary-foreground`                                          | variant=default     |
| `border-transparent bg-secondary text-secondary-foreground`                                      | variant=secondary   |
| `border-transparent bg-destructive text-destructive-foreground`                                  | variant=destructive |

### 4.10 Other UI Components

| 组件                 | 关键类名                                                                                                                 | 说明     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| ScrollArea           | `relative overflow-hidden`                                                                                               | 滚动容器 |
| ScrollArea viewport  | `size-full rounded-[inherit]`                                                                                            | 视口     |
| ScrollArea scrollbar | `flex touch-none select-none p-0.5`                                                                                      | 滚动条   |
| Tooltip              | `z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95` | 提示框   |
| Avatar               | `relative flex size-9 shrink-0 overflow-hidden rounded-lg`                                                               | 头像容器 |

---

## 五、弹窗与模态框

### 5.1 CropDialog — 裁切弹窗

| 类名                                                                                               | 说明                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------- |
| `fixed inset-0 z-50 bg-background/80 flex items-center justify-center`                             | 加载态/弹窗覆盖层            |
| `text-muted-foreground text-sm`                                                                    | 加载文字                     |
| `fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4`                         | 弹窗覆盖层                   |
| `bg-card border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto`                  | 弹窗卡片                     |
| `flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 transform-[translateZ(0)]` | 弹窗顶栏（粘性定位+GPU加速） |
| `text-sm font-semibold`                                                                            | 弹窗标题                     |
| `p-4 flex justify-center`                                                                          | 裁切区域容器                 |

### 5.2 ErrorBoundary — 错误边界

| 类名                                                                                             | 说明         |
| ------------------------------------------------------------------------------------------------ | ------------ |
| `flex flex-col items-center justify-center min-h-screen gap-4 p-8`                               | 错误页面容器 |
| `text-destructive text-lg font-semibold`                                                         | 错误标题     |
| `text-xs text-muted-foreground max-w-lg text-center whitespace-pre-wrap bg-muted p-4 rounded-lg` | 错误信息块   |

---

## 六、通用工具类模式

### 6.1 间距

| 类名          | 说明                            |
| ------------- | ------------------------------- |
| `space-y-1.5` | 紧凑纵向间距（字段内标签+输入） |
| `space-y-3`   | 小纵向间距                      |
| `space-y-4`   | 标准纵向间距（面板内段落）      |
| `space-y-6`   | 中等纵向间距（编辑段之间）      |
| `space-y-8`   | 大纵向间距（主段落之间）        |
| `space-y-10`  | 超大纵向间距                    |
| `gap-1`       | 紧凑横向间距                    |
| `gap-1.5`     | 小横向间距（按钮组）            |
| `gap-2`       | 标准横向间距                    |
| `gap-3`       | 中等横向间距                    |
| `gap-4`       | 较大横向间距（网格）            |
| `gap-8`       | 大横向间距（主网格）            |

### 6.2 尺寸

| 类名            | 说明              |
| --------------- | ----------------- |
| `h-6` `w-6`     | 小型图标按钮      |
| `h-7` `w-7`     | 小图标按钮        |
| `h-8` `w-8`     | 标准尺寸按钮      |
| `h-8`           | 小输入框高度      |
| `h-9`           | 标准输入框高度    |
| `h-4` `w-4`     | 小图标 (16px)     |
| `h-3.5` `w-3.5` | 微型图标 (14px)   |
| `h-3` `w-3`     | 极微型图标 (12px) |

### 6.3 文字

| 类名                    | 说明                            |
| ----------------------- | ------------------------------- |
| `text-xs`               | 标签/辅助文字                   |
| `text-[10px]`           | 标签/标记小字                   |
| `text-[11px]`           | 字数统计                        |
| `text-sm`               | 正文/输入框/按钮                |
| `text-base`             | 基础文字                        |
| `text-lg`               | 大标题                          |
| `text-xl`               | 页面标题                        |
| `text-2xl`              | 超大标题（Dashboard）           |
| `text-muted-foreground` | 弱化/辅助文字色                 |
| `text-destructive`      | 危险/删除文字色                 |
| `font-medium`           | 中等粗细                        |
| `font-semibold`         | 半粗（段落标题）                |
| `font-bold`             | 粗体（页面标题）                |
| `font-mono`             | 等宽字体（内容 textarea）       |
| `font-sans`             | 无衬线字体（自然语言 textarea） |
| `leading-relaxed`       | 宽松行高（长篇内容）            |
| `truncate`              | 单行截断省略号                  |
| `whitespace-nowrap`     | 禁止换行（侧栏导航项）          |

### 6.4 颜色/背景

| 类名                      | 说明                     |
| ------------------------- | ------------------------ |
| `bg-background`           | 页面背景色               |
| `bg-card`                 | 卡片/面板背景            |
| `bg-muted`                | 静音背景（占位区）       |
| `bg-muted/30`             | 浅静音背景（头部栏）     |
| `bg-primary`              | 主色背景                 |
| `bg-primary/10`           | 浅主色背景（激活态导航） |
| `bg-secondary`            | 次要背景                 |
| `bg-transparent`          | 透明背景                 |
| `bg-popover`              | 弹出层背景               |
| `text-foreground`         | 标准文字色               |
| `text-primary`            | 主色文字                 |
| `text-primary-foreground` | 主色背景上的文字         |
| `hover:bg-muted`          | 悬停静音背景             |
| `hover:text-foreground`   | 悬停标准文字色           |

### 6.5 边框/圆角

| 类名                 | 说明                 |
| -------------------- | -------------------- |
| `border`             | 1px 标准边框         |
| `border-b`           | 底部边框             |
| `border-r`           | 右侧边框             |
| `border-t`           | 顶部边框             |
| `border-none`        | 无边框               |
| `border-input`       | 输入框边框色         |
| `border-border`      | 标准边框色           |
| `border-muted`       | 静音边框（侧强调线） |
| `border-transparent` | 透明边框             |
| `rounded-sm`         | 小圆角               |
| `rounded-md`         | 中圆角               |
| `rounded-lg`         | 大圆角（卡片/弹窗）  |
| `rounded-xl`         | 超大圆角             |
| `rounded-full`       | 全圆角（开关/滑块）  |
| `rounded-t-lg`       | 顶部大圆角（头部栏） |

### 6.6 交互/状态

| 类名                      | 说明                             |
| ------------------------- | -------------------------------- |
| `cursor-pointer`          | 可点击光标                       |
| `hover:ring-2`            | 悬停外环                         |
| `hover:ring-primary/50`   | 悬停主色半透环                   |
| `transition-all`          | 全部属性过渡                     |
| `transition-colors`       | 颜色过渡                         |
| `transition-opacity`      | 透明度过渡                       |
| `opacity-30`              | 30% 不透明度（占位图标）         |
| `opacity-40`              | 40% 不透明度（禁用条目）         |
| `opacity-50`              | 50% 不透明度（禁用/淡化）        |
| `grayscale`               | 灰度滤镜（禁用条目）             |
| `group`                   | 父级容器标记（配合 group-hover） |
| `group-hover:opacity-100` | 悬停父级时子元素完全显示         |
| `overflow-auto`           | 溢出滚动                         |
| `overflow-hidden`         | 溢出隐藏                         |
| `overflow-y-auto`         | 纵向溢出滚动                     |
| `shrink-0`                | 禁止弹性压缩                     |
| `min-w-0`                 | 允许弹性收缩到0                  |
| `min-h-0`                 | 允许弹性高度为0                  |

### 6.7 布局

| 类名              | 说明                         |
| ----------------- | ---------------------------- |
| `flex`            | 弹性布局                     |
| `inline-flex`     | 内联弹性布局                 |
| `grid`            | 网格布局                     |
| `flex-col`        | 纵向弹性                     |
| `flex-row`        | 横向弹性                     |
| `flex-1`          | 弹性填充剩余空间             |
| `flex-wrap`       | 弹性换行（移动端顶栏按钮组） |
| `flex-nowrap`     | 弹性不换行                   |
| `items-center`    | 交叉轴居中                   |
| `items-start`     | 交叉轴起点对齐               |
| `justify-center`  | 主轴居中                     |
| `justify-between` | 主轴两端对齐                 |
| `relative`        | 相对定位（定位锚点）         |
| `absolute`        | 绝对定位                     |
| `fixed`           | 固定定位                     |
| `sticky`          | 粘性定位                     |
| `top-0`           | 顶部吸附                     |
| `inset-0`         | 全屏覆盖                     |
| `z-10`            | 层级 10                      |
| `z-50`            | 层级 50（弹窗/顶栏）         |

### 6.8 响应式断点

| 前缀   | 最小宽度 | 说明       |
| ------ | -------- | ---------- |
| 无     | 0px      | 移动端默认 |
| `sm:`  | 640px    | 小型平板   |
| `md:`  | 768px    | 平板横屏   |
| `lg:`  | 1024px   | 桌面端     |
| `xl:`  | 1280px   | 大桌面     |
| `2xl:` | 1536px   | 超大桌面   |

常用示例：

- `grid-cols-1 md:grid-cols-2` — 移动端单列，平板起双列
- `grid-cols-2 md:grid-cols-4` — 移动端双列，平板起四列
- `lg:col-span-2` — 桌面端占两列

---

## 七、常见组合模式

### 7.1 段落标题 + 内容

```
text-sm font-semibold mb-3 pb-1.5 border-b        ← 标题（小字粗体+下划线）
space-y-1.5                                         ← 内容区紧凑间距
```

### 7.2 字段 label + input

```
<Label htmlFor="..." className="text-xs" />          ← 标签
<Input id="..." className="h-8 text-xs" />           ← 紧凑输入框
```

### 7.3 复选框 + 标签行

```
<div className="flex items-center gap-1.5">
  <Checkbox id="..." />
  <Label htmlFor="..." className="text-xs">文字</Label>
</div>
```

### 7.4 卡片网格（Dashboard）

```
grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4
```

### 7.5 双列字段布局

```
grid grid-cols-1 md:grid-cols-2 gap-4
```

### 7.6 Flex 头部栏

```
flex items-center justify-between       ← 标题左 + 操作右
flex items-center gap-2                  ← 操作按钮组
```

### 7.7 空状态占位

```
flex flex-col items-center justify-center py-16 text-muted-foreground text-sm
```

---

## 八、暗色模式标记

所有暗色主题覆盖使用 `.dark` 类触发：

```css
.dark { --background: #0b1121; ... }
```

在 JSX 中切换主题时，在根元素添加/移除 `dark` 类即可自动切换所有颜色变量。
