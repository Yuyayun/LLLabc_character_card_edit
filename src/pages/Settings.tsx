import {
  accentDefs,
  useTheme,
  type AccentColor,
} from "@/components/layout/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Moon, PaintBucket, Sun } from "lucide-react";
import { useState } from "react";

const accentKeys = Object.keys(accentDefs) as AccentColor[];

type Section = "appearance" | "api" | "presets" | "changelog";

const sections: { id: Section; label: string }[] = [
  { id: "appearance", label: "界面" },
  { id: "api", label: "API" },
  { id: "presets", label: "预设" },
  { id: "changelog", label: "日志" },
];

export function Settings() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* 分段按钮导航 */}
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mr-2">设置</h1>
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "px-2.5 py-1 text-xs sm:text-sm rounded-sm transition-colors whitespace-nowrap",
                section === s.id
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 界面风格 */}
      {section === "appearance" && (
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <PaintBucket className="h-4 w-4 shrink-0" />
                亮暗模式
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {theme === "dark" ? (
                  <Moon className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                ) : (
                  <Sun className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {theme === "dark" ? "深色模式" : "浅色模式"}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    点击切换亮暗主题
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                className="shrink-0"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">强调色</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                选择界面主色调，影响按钮、焦点环、导航激活等元素
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {accentKeys.map((key) => {
                  const def = accentDefs[key];
                  const swatchColor =
                    theme === "dark" ? def.dark.primary : def.light.primary;
                  const isActive = accentColor === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setAccentColor(key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all",
                        isActive
                          ? "border-primary shadow-sm"
                          : "border-transparent hover:border-muted-foreground/30",
                      )}
                      title={def.label}
                    >
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span
                        className={cn(
                          "text-[10px] sm:text-xs",
                          isActive
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {def.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API 配置 */}
      {section === "api" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">API 配置</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-muted-foreground">
              AI 对话功能将在后续版本中提供。此处将配置 AI 接口连接信息。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 预设管理 */}
      {section === "presets" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">预设管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-muted-foreground">
              预设管理功能将在后续版本中提供。此处将管理 AI 生成预设模板。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 更新日志 */}
      {section === "changelog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">更新日志</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.6
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-02
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>灵感笔记新增拖拽排序功能，卡片视图下可拖拽调整备忘顺序</li>
                <li>修复灵感笔记上下移动按钮的启用条件颠倒问题</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.5
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-31
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>修复世界书列表为空、创建失败的核心 Bug：DB 索引缺少 updated_at 导致查询失败，已加索引并改用 toArray + 内存排序</li>
                <li>修复世界书绑定下拉列表不刷新：角色卡切换时自动重新加载独立世界书列表</li>
                <li>世界书页面：所有世界书（独立+绑定在角色卡上的）统一显示，标注来源，选书后即可编辑</li>
                <li>导出优化：JSON/PNG 导出时自动解析绑定的独立世界书并嵌入，导出的卡自带完整世界书数据</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.4
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-31
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>修复：灵感笔记创建后首次填写不再记录编辑会话（避免空笔记→首次输入就显示编辑时间）</li>
                <li>修复：内置世界书名称改为独立标题行显示，默认名自动补位（角色名+的世界书）</li>
                <li>修复：提取内嵌世界书为独立时，增加 toast 确认提示，确保 DB 写入完成后再更新状态</li>
                <li>世界书页面重构：显示所有世界书（含绑定在角色卡上的），标注绑定状态；选中即可在下方编辑区直接修改，无需跳转</li>
                <li>世界书编辑区支持完整增删改查：名称编辑、添加/删除/展开条目、保存、删除世界书</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.3
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-31
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>灵感笔记编辑历史改为会话模式：停止输入 1 分钟后才记录一次编辑，显示为 14:22~14:25 格式</li>
                <li>类型重构：edit_times 改为 edit_sessions（含 start/end），旧数据自动兼容</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.2
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-31
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>修复旧灵感笔记（无 edit_times 字段）编辑时崩溃的问题，加入空值兼容</li>
                <li>CSS 清理：移除无用的 .fixed.top-0 规则和重复 :root 块，保留卡片浮起动效并补充暗色适配</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.1
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-30
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>灵感笔记新增编辑历史记录：每次编辑自动记录时间戳，卡片和时间轴双视图可查看完整编辑时间线</li>
                <li>修复暗色模式下页面大面积显示为白色的问题（重复 CSS 变量覆写）</li>
                <li>优化暗色模式卡片样式：首页角色卡在暗色下显示深灰底色 + 悬浮阴影</li>
                <li>设置页重构：分段按钮替代笨重的 Tab 栏，移动端响应式优化（色块 3 列、字号自适应）</li>
                <li>CSS 清理：移除重复规则和无用覆写，规范化注释</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.0
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-05-30
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>
                  角色卡编辑器上线：支持基本信息、角色定义、开场白、世界书、Regex
                  脚本、深度提示、灵感笔记共 7 个面板
                </li>
                <li>JSON / PNG 导入导出，兼容 SillyTavern spec v3</li>
                <li>
                  世界书完整编辑：内嵌/绑定/独立三种模式，25+ 扩展字段支持
                </li>
                <li>
                  灵感笔记功能：双视图（卡片 + 时间轴），绑定角色卡，不参与导出
                </li>
                <li>首页角色卡网格：搜索、标签筛选、备份恢复、批量导入</li>
                <li>
                  风格界面主题：毛玻璃顶栏、悬浮阴影、点击缩放反馈、滚动条
                </li>
                <li>亮暗模式 + 简单的6 套强调色主题</li>
                <li>可收起侧边栏，桌面/移动端响应式适配</li>
                <li>PWA 支持：可安装到桌面，离线使用</li>
                <li>卡面裁切上传（2:3 比例）</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                <strong>下个版本计划（可能）：</strong>API 配置管理、AI
                预设管理（含酒馆预设导入导出）、AI
                对话聊天界面、角色卡写作辅助与测试功能。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
