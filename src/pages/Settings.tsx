import {
  accentDefs,
  useTheme,
  type AccentColor,
} from "@/components/layout/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  checkConnection,
  createGist,
  downloadFromGist,
  exportAllData,
  importAllData,
  uploadToGist,
  verifyToken,
  type CloudSyncProgress,
} from "@/lib/cloudSync";
import { db } from "@/lib/db";
import { clearUnlock, isPresetUnlocked, verifyKey } from "@/lib/lockKey";
import { cn } from "@/lib/utils";
import type { CloudSyncConfig } from "@/types";
import {
  Check,
  Cloud,
  Download,
  Loader2,
  Lock,
  Moon,
  PaintBucket,
  Sun,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const accentKeys = Object.keys(accentDefs) as AccentColor[];

type Section = "appearance" | "api" | "presets" | "cloud" | "changelog";

const sections: { id: Section; label: string }[] = [
  { id: "appearance", label: "界面" },
  { id: "api", label: "API" },
  { id: "presets", label: "预设" },
  { id: "cloud", label: "云同步" },
  { id: "changelog", label: "日志" },
];

function createDefaultConfig(): CloudSyncConfig {
  return {
    id: "cloud_sync",
    enabled: false,
    gistId: "",
    gistFilename: "CharCardEditor_Cloud.json",
    githubToken: "",
    autoUpload: false,
    lastSyncAt: null,
    conflictStrategy: "force_push",
  };
}

export function Settings() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [section, setSection] = useState<Section>("appearance");

  // 云同步状态
  const [config, setConfig] = useState<CloudSyncConfig>(createDefaultConfig());
  const [configLoaded, setConfigLoaded] = useState(false);
  const [tokenCheck, setTokenCheck] = useState<{
    valid: boolean;
    hasGistScope: boolean;
    scopes: string[];
    user: string | null;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncProgress, setSyncProgress] = useState<CloudSyncProgress | null>(
    null,
  );

  // 预设解锁状态
  const [presetUnlocked, setPresetUnlocked] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyChecking, setKeyChecking] = useState(false);

  const SYNC_ID = "cloud_sync" as const;

  // 加载云同步配置
  useEffect(() => {
    db.cloudSync.get(SYNC_ID).then((saved) => {
      if (saved) setConfig(saved);
      setConfigLoaded(true);
    });
  }, []);

  // 切换 section 时检测连接
  useEffect(() => {
    if (
      section === "cloud" &&
      config.enabled &&
      config.gistId &&
      config.githubToken
    ) {
      checkConnection().then(setConnected);
    }
  }, [section, config.enabled, config.gistId, config.githubToken]);

  // 检查预设解锁状态
  useEffect(() => {
    isPresetUnlocked().then(setPresetUnlocked);
  }, [section]);

  function updateConfig(patch: Partial<CloudSyncConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      db.cloudSync.put(next);
      return next;
    });
  }

  async function handleVerify() {
    if (!config.githubToken) return;
    setVerifying(true);
    setTokenCheck(null);
    try {
      const result = await verifyToken(config.githubToken);
      setTokenCheck(result);
      if (!result.valid) {
        toast.error("Token 无效，请检查是否正确");
      } else if (!result.hasGistScope) {
        toast.error(
          `Token 有效但缺少 gist 权限（当前权限: ${result.scopes.length ? result.scopes.join(", ") : "无"}）。请重新创建 Token 并勾选 gist scope。`,
        );
      } else {
        toast.success(`Token 验证成功，已登录 ${result.user}`);
      }
    } catch {
      setTokenCheck({
        valid: false,
        hasGistScope: false,
        scopes: [],
        user: null,
      });
      toast.error("验证失败，请检查网络连接");
    } finally {
      setVerifying(false);
    }
  }

  async function handleCreateGist() {
    if (!config.githubToken || !tokenCheck?.hasGistScope) {
      toast.error("请先验证 Token 并确保拥有 gist 权限");
      return;
    }
    setCreating(true);
    setSyncProgress({ percent: 8, step: "读取本地数据" });
    try {
      const data = await exportAllData();
      const gistId = await createGist(config.githubToken, data, setSyncProgress);
      updateConfig({ gistId, lastSyncAt: new Date() });
      toast.success("Gist 已创建，数据已上传");
    } catch (e) {
      setSyncProgress({ percent: 100, step: "创建失败" });
      toast.error(e instanceof Error ? e.message : "创建 Gist 失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload() {
    if (!config.gistId || !config.githubToken) {
      toast.error("请先配置 Token 和 Gist ID");
      return;
    }
    setUploading(true);
    setSyncProgress({ percent: 0, step: "准备上传" });
    try {
      await uploadToGist(config, setSyncProgress);
      toast.success("已上传到云端");
    } catch (e) {
      setSyncProgress({ percent: 100, step: "上传失败" });
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!config.gistId || !config.githubToken) {
      toast.error("请先配置 Token 和 Gist ID");
      return;
    }
    if (!confirm("云端下载将覆盖本地全部数据，建议先手动备份。确认继续？"))
      return;
    setDownloading(true);
    setSyncProgress({ percent: 0, step: "准备下载" });
    try {
      const data = await downloadFromGist(config, setSyncProgress);
      await importAllData(data, setSyncProgress);
      updateConfig({ lastSyncAt: new Date() });
      toast.success("已从云端同步数据");
    } catch (e) {
      setSyncProgress({ percent: 100, step: "下载失败" });
      toast.error(e instanceof Error ? e.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* 分段按钮导航 */}
      <div className="flex flex-col items-start gap-2 mb-6 sm:flex-row sm:items-center">
        <h1 className="text-xl sm:text-2xl font-bold sm:mr-2">设置</h1>
        <div className="w-full overflow-x-auto sm:w-auto">
          <div className="flex min-w-max items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
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
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              预设编辑器
              {presetUnlocked === null ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : presetUnlocked ? (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  已解锁
                </span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  已锁定
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {presetUnlocked === null ? (
              <p className="text-xs text-muted-foreground">正在检查状态...</p>
            ) : presetUnlocked ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-md">
                  <Unlock className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      预设编辑器已解锁
                    </p>
                    <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                      所有预设功能已可用：列表、编辑、导入导出
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={async () => {
                    await clearUnlock();
                    setPresetUnlocked(false);
                    toast.success("已锁定预设编辑器");
                  }}
                >
                  清除解锁状态
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium">
                      预设编辑器已锁定
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      输入封锁 Key 以解锁预设编辑功能。如需获取
                      Key，请联系开发者。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    placeholder="输入封锁 Key..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        setKeyChecking(true);
                        const ok = await verifyKey(keyInput);
                        if (ok) {
                          setPresetUnlocked(true);
                          toast.success("预设编辑器已解锁！");
                        } else {
                          toast.error("Key 不正确");
                        }
                        setKeyInput("");
                        setKeyChecking(false);
                      }
                    }}
                    className="h-9 min-w-0 text-xs flex-1 sm:h-8"
                    disabled={keyChecking}
                  />
                  <Button
                    size="sm"
                    className="h-9 w-full text-xs shrink-0 sm:h-8 sm:w-auto"
                    disabled={keyChecking || !keyInput.trim()}
                    onClick={async () => {
                      setKeyChecking(true);
                      const ok = await verifyKey(keyInput);
                      if (ok) {
                        setPresetUnlocked(true);
                        toast.success("预设编辑器已解锁！");
                      } else {
                        toast.error("Key 不正确");
                      }
                      setKeyInput("");
                      setKeyChecking(false);
                    }}
                  >
                    {keyChecking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                    )}
                    解锁
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 云同步 */}
      {section === "cloud" && (
        <div className="space-y-4 sm:space-y-6">
          {!configLoaded ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                加载中...
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 启用开关 + 状态 */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Cloud className="h-4 w-4 shrink-0" />
                    GitHub Gist 云同步
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">启用云同步</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        将数据同步到 GitHub Gist，实现跨设备使用
                      </p>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(v) => updateConfig({ enabled: v })}
                      className="shrink-0"
                    />
                  </div>

                  {config.enabled && (
                    <>
                      {/* 连接状态 */}
                      {config.gistId && config.githubToken && (
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-xs",
                            connected === true
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                              : connected === false
                                ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                                : "bg-muted/50 text-muted-foreground",
                          )}
                        >
                          {connected === true ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : connected === false ? (
                            <X className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          )}
                          <span className="min-w-0">
                            {connected === true
                              ? "已连接到 GitHub"
                              : connected === false
                                ? "无法连接 GitHub，请检查网络"
                                : "检测连接中..."}
                          </span>
                          {config.lastSyncAt && (
                            <span className="ml-auto shrink-0 text-[10px] opacity-70">
                              上次同步：
                              {new Date(config.lastSyncAt).toLocaleString(
                                "zh-CN",
                                {
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {/* GitHub Token */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">
                          GitHub Token
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            value={config.githubToken}
                            onChange={(e) => {
                              updateConfig({ githubToken: e.target.value });
                              setTokenCheck(null);
                            }}
                            className="h-8 min-w-0 text-xs font-mono flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs shrink-0"
                            onClick={handleVerify}
                            disabled={!config.githubToken || verifying}
                          >
                            {verifying ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : tokenCheck?.hasGistScope ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : tokenCheck?.valid ? (
                              <X className="h-3 w-3 text-amber-500" />
                            ) : (
                              "验证"
                            )}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          需要 gist 权限，
                          <a
                            href="https://github.com/settings/tokens"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            在此处创建
                          </a>
                          ，选择 <strong>gist</strong> scope
                        </p>
                        {tokenCheck && (
                          <p
                            className={cn(
                              "text-[10px]",
                              tokenCheck.hasGistScope
                                ? "text-emerald-600"
                                : tokenCheck.valid
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {tokenCheck.hasGistScope
                              ? `✓ 权限正常 (${tokenCheck.scopes.join(", ")})`
                              : tokenCheck.valid
                                ? `⚠ Token 有效但缺少 gist 权限（当前: ${tokenCheck.scopes.length ? tokenCheck.scopes.join(", ") : "无"}）`
                                : "✗ Token 无效"}
                            {tokenCheck.user && ` — ${tokenCheck.user}`}
                          </p>
                        )}
                      </div>

                      {/* Gist ID */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Gist ID</label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="32 位 Gist ID"
                            value={config.gistId}
                            onChange={(e) =>
                              updateConfig({ gistId: e.target.value })
                            }
                            className="h-8 min-w-0 text-xs font-mono flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs shrink-0"
                            onClick={handleCreateGist}
                            disabled={!config.githubToken || creating}
                          >
                            {creating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "创建"
                            )}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          点击「创建」自动创建新 Gist
                          并上传当前数据；也可手动填入已有 Gist ID
                        </p>
                      </div>

                      {/* 自动上传 */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">保存时自动上传</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            编辑器中每次保存后自动同步到云端
                          </p>
                        </div>
                        <Switch
                          checked={config.autoUpload}
                          onCheckedChange={(v) =>
                            updateConfig({ autoUpload: v })
                          }
                          disabled={!config.gistId || !config.githubToken}
                          className="shrink-0"
                        />
                      </div>

                      {/* 手动操作 */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={handleUpload}
                          disabled={
                            !config.gistId || !config.githubToken || uploading
                          }
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1" />
                          )}
                          手动上传
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={handleDownload}
                          disabled={
                            !config.gistId || !config.githubToken || downloading
                          }
                        >
                          {downloading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1" />
                          )}
                          手动下载
                        </Button>
                      </div>
                      {syncProgress && (
                        <div className="space-y-1.5 rounded-md border bg-muted/25 px-3 py-2">
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="min-w-0 truncate text-muted-foreground">
                              {syncProgress.step}
                            </span>
                            <span className="shrink-0 font-medium">
                              {Math.round(syncProgress.percent)}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-200"
                              style={{
                                width: `${Math.min(100, Math.max(0, syncProgress.percent))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        手动下载会覆盖本地全部数据，建议先备份。上传不会删除云端原有数据。
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
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
                  v1.1.3
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-07-07
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>预设编辑器新增从其他预设复制提示词条目与正则脚本</li>
                <li>复制支持多选、指定插入位置，并自动生成新 ID 与副本名称</li>
                <li>云同步上传、下载和创建 Gist 时新增步骤与百分比进度提示</li>
                <li>优化预设标题和世界书条目在手机端、桌面端的显示空间</li>
                <li>全局字体切换本轮暂缓发布，当前版本继续使用固定字体方案</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.2
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-27
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>手机端基础布局优化：导航、首页操作区、编辑页顶栏不再拥挤</li>
                <li>世界书条目编辑器贴近酒馆字段结构，位置与逻辑显示更清楚</li>
                <li>预设编辑器采样、模板、提示词管理信息结构优化</li>
                <li>清理提示词编辑中的底层启用字段文案，并修复 CSS 构建警告</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.1-hotfix
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-12
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>预设新增正则脚本编辑功能（Regex 分区）</li>
                <li>侧边栏精简去重 + 手机端宽度优化</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.1
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-12
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>新增预设编辑器侧边栏与移动到指定位置功能</li>
                <li>整体视觉升级：星点背景、光晕效果、主题过渡动画</li>
                <li>全局样式统一与细节修复</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.0-hotfix2
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-11
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>修复导出预设 prompt_order 格式与酒馆不兼容的问题</li>
                <li>手机端提示词列表新增上下移动按钮</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.0-hotfix
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-07
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>修复预设条目链接情况读取错误的问题</li>
                <li>项目更名为「空间站 Space Station」</li>
                <li>手机端导航栏精简为图标模式</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.1.0
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-05
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>
                  新增预设编辑器：支持采样参数、格式化模板、提示词管理（列表+池+拖拽排序）
                </li>
                <li>支持导入/导出酒馆格式预设 JSON（名称 emoji 原样保留）</li>
                <li>
                  封锁 Key 访问控制：预设模块默认锁定，需在设置页输入 Key 解锁
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.8
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-04
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>
                  云同步下载大幅提速：gzip 压缩 + 移除冗余请求，数据体积减少
                  80%+
                </li>
                <li>自动上传新增进度提示："正在同步…"→"云端同步完成"</li>
                <li>PWA 新版本提醒：检测到更新后弹窗提示刷新</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v1.0.7
                </span>
                <span className="text-xs text-muted-foreground">
                  2026-06-04
                </span>
              </div>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-1">
                <li>
                  新增云同步功能：通过 GitHub Gist
                  实现跨设备数据同步，支持手动上传/下载和保存时自动上传
                </li>
                <li>备份恢复现已包含灵感笔记（memos），之前缺失该表</li>
              </ul>
            </div>

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
                <li>
                  修复世界书列表为空、创建失败的核心 Bug：DB 索引缺少 updated_at
                  导致查询失败，已加索引并改用 toArray + 内存排序
                </li>
                <li>
                  修复世界书绑定下拉列表不刷新：角色卡切换时自动重新加载独立世界书列表
                </li>
                <li>
                  世界书页面：所有世界书（独立+绑定在角色卡上的）统一显示，标注来源，选书后即可编辑
                </li>
                <li>
                  导出优化：JSON/PNG
                  导出时自动解析绑定的独立世界书并嵌入，导出的卡自带完整世界书数据
                </li>
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
                <li>
                  修复：灵感笔记创建后首次填写不再记录编辑会话（避免空笔记→首次输入就显示编辑时间）
                </li>
                <li>
                  修复：内置世界书名称改为独立标题行显示，默认名自动补位（角色名+的世界书）
                </li>
                <li>
                  修复：提取内嵌世界书为独立时，增加 toast 确认提示，确保 DB
                  写入完成后再更新状态
                </li>
                <li>
                  世界书页面重构：显示所有世界书（含绑定在角色卡上的），标注绑定状态；选中即可在下方编辑区直接修改，无需跳转
                </li>
                <li>
                  世界书编辑区支持完整增删改查：名称编辑、添加/删除/展开条目、保存、删除世界书
                </li>
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
                <li>
                  灵感笔记编辑历史改为会话模式：停止输入 1
                  分钟后才记录一次编辑，显示为 14:22~14:25 格式
                </li>
                <li>
                  类型重构：edit_times 改为 edit_sessions（含
                  start/end），旧数据自动兼容
                </li>
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
                <li>
                  修复旧灵感笔记（无 edit_times
                  字段）编辑时崩溃的问题，加入空值兼容
                </li>
                <li>
                  CSS 清理：移除无用的 .fixed.top-0 规则和重复 :root
                  块，保留卡片浮起动效并补充暗色适配
                </li>
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
                <li>
                  灵感笔记新增编辑历史记录：每次编辑自动记录时间戳，卡片和时间轴双视图可查看完整编辑时间线
                </li>
                <li>
                  修复暗色模式下页面大面积显示为白色的问题（重复 CSS 变量覆写）
                </li>
                <li>
                  优化暗色模式卡片样式：首页角色卡在暗色下显示深灰底色 +
                  悬浮阴影
                </li>
                <li>
                  设置页重构：分段按钮替代笨重的 Tab 栏，移动端响应式优化（色块
                  3 列、字号自适应）
                </li>
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
                <strong>下个版本计划（可能，随时砍）：</strong>API 配置管理、
                AI 对话聊天界面、角色卡写作辅助与测试功能。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
