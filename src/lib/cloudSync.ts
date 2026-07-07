import type { CloudSyncConfig, CloudData } from "@/types"
import { db } from "./db"
import { toast } from "sonner"

const GITHUB_API = "https://api.github.com"

export interface CloudSyncProgress {
  step: string
  percent: number
}

type ProgressCallback = (progress: CloudSyncProgress) => void

function reportProgress(
  onProgress: ProgressCallback | undefined,
  percent: number,
  step: string
) {
  onProgress?.({ percent, step })
}

// ========== gzip 压缩/解压（浏览器原生 API） ==========

/** 将 CloudData 压缩为 base64 字符串（gzip → base64） */
async function compressData(data: CloudData): Promise<string> {
  const json = JSON.stringify(data)
  const encoder = new TextEncoder()
  const stream = new CompressionStream("gzip")
  const writer = stream.writable.getWriter()
  writer.write(encoder.encode(json))
  writer.close()

  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // 合并并转 base64
  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const combined = new Uint8Array(totalLen)
  let offset = 0
  for (const c of chunks) {
    combined.set(c, offset)
    offset += c.length
  }
  let binary = ""
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i])
  }
  return btoa(binary)
}

/** 将 base64 字符串解压还原为 CloudData */
async function decompressData(base64: string): Promise<CloudData> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const stream = new DecompressionStream("gzip")
  const writer = stream.writable.getWriter()
  writer.write(bytes)
  writer.close()

  const reader = stream.readable.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(decoder.decode(value, { stream: true }))
  }
  chunks.push(decoder.decode()) // flush
  return JSON.parse(chunks.join("")) as CloudData
}

/** 根据旧文件名生成压缩版文件名：xxx.json → xxx_v2.json */
function v2Filename(filename: string): string {
  return filename.replace(/\.json$/, "_v2.json")
}

// ========== 数据导出/导入 ==========

export async function exportAllData(): Promise<CloudData> {
  const [
    characterCards,
    worldBooks,
    presets,
    apiConfigs,
    chatSessions,
    memos,
    settings,
  ] = await Promise.all([
    db.characterCards.toArray(),
    db.worldBooks.toArray(),
    db.presets.toArray(),
    db.apiConfigs.toArray(),
    db.chatSessions.toArray(),
    db.memos.toArray(),
    db.settings.toArray(),
  ])

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    characterCards,
    worldBooks,
    presets,
    apiConfigs,
    chatSessions,
    memos,
    settings,
  }
}

export async function importAllData(
  data: CloudData,
  onProgress?: ProgressCallback
): Promise<void> {
  reportProgress(onProgress, 72, "准备写入本地数据")
  if (data.characterCards?.length) {
    reportProgress(onProgress, 76, "导入角色卡")
    await db.characterCards.bulkPut(data.characterCards)
  }
  if (data.worldBooks?.length) {
    reportProgress(onProgress, 80, "导入世界书")
    await db.worldBooks.bulkPut(data.worldBooks)
  }
  if (data.presets?.length) {
    reportProgress(onProgress, 84, "导入预设")
    await db.presets.bulkPut(data.presets)
  }
  if (data.apiConfigs?.length) {
    reportProgress(onProgress, 88, "导入 API 配置")
    await db.apiConfigs.bulkPut(data.apiConfigs)
  }
  if (data.chatSessions?.length) {
    reportProgress(onProgress, 92, "导入聊天记录")
    await db.chatSessions.bulkPut(data.chatSessions)
  }
  if (data.memos?.length) {
    reportProgress(onProgress, 94, "导入灵感笔记")
    await db.memos.bulkPut(data.memos)
  }
  if (data.settings?.length) {
    reportProgress(onProgress, 98, "导入应用设置")
    await db.settings.bulkPut(data.settings)
  }
  reportProgress(onProgress, 100, "下载同步完成")
}

// ========== Token 验证 ==========

export interface TokenCheckResult {
  valid: boolean
  hasGistScope: boolean
  scopes: string[]
  user: string | null
}

export async function verifyToken(token: string): Promise<TokenCheckResult> {
  try {
    const resp = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    })
    if (!resp.ok) {
      return { valid: false, hasGistScope: false, scopes: [], user: null }
    }
    const userData = await resp.json() as { login?: string }
    // GitHub 在 X-OAuth-Scopes 头中返回 token 的权限范围
    const scopesHeader = resp.headers.get("X-OAuth-Scopes") || ""
    const scopes = scopesHeader.split(",").map((s) => s.trim()).filter(Boolean)
    return {
      valid: true,
      hasGistScope: scopes.includes("gist"),
      scopes,
      user: userData.login ?? null,
    }
  } catch {
    return { valid: false, hasGistScope: false, scopes: [], user: null }
  }
}

// ========== Gist 操作 ==========

function gistHeaders(token: string): HeadersInit {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  }
}

function gistUrl(gistId: string): string {
  return `${GITHUB_API}/gists/${encodeURIComponent(gistId)}`
}

export async function createGist(
  token: string,
  data: CloudData,
  onProgress?: ProgressCallback
): Promise<string> {
  const filename = "CharCardEditor_Cloud.json"
  reportProgress(onProgress, 25, "压缩本地数据")
  const compressed = await compressData(data)

  const body = {
    description: "角色卡编辑器 — 云同步数据",
    public: false,
    files: {
      [v2Filename(filename)]: {
        content: compressed,
      },
    },
  }

  reportProgress(onProgress, 65, "创建云端 Gist")
  const resp = await fetch(`${GITHUB_API}/gists`, {
    method: "POST",
    headers: gistHeaders(token),
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `创建 Gist 失败 (${resp.status})`)
  }

  const created = await resp.json() as { id: string }
  reportProgress(onProgress, 100, "Gist 创建完成")
  return created.id
}

export async function uploadToGist(
  config: CloudSyncConfig,
  onProgress?: ProgressCallback
): Promise<void> {
  // 先验证 token 是否具备 gist scope
  reportProgress(onProgress, 8, "检查 GitHub 权限")
  await requireGistScope(config.githubToken)

  reportProgress(onProgress, 22, "读取本地数据")
  const data = await exportAllData()
  const filename = config.gistFilename || "CharCardEditor_Cloud.json"
  reportProgress(onProgress, 42, "压缩同步数据")
  const compressed = await compressData(data)

  const body = {
    files: {
      [v2Filename(filename)]: {
        content: compressed,
      },
    },
  }

  reportProgress(onProgress, 68, "上传到 GitHub Gist")
  const resp = await fetch(gistUrl(config.gistId), {
    method: "PATCH",
    headers: gistHeaders(config.githubToken),
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `上传失败 (${resp.status})`)
  }

  // 更新最后同步时间
  reportProgress(onProgress, 92, "写入同步时间")
  await db.cloudSync.put({
    ...config,
    lastSyncAt: new Date(),
  })
  reportProgress(onProgress, 100, "上传同步完成")
}

async function requireGistScope(token: string): Promise<void> {
  const check = await verifyToken(token)
  if (!check.valid) throw new Error("Token 无效，请重新验证")
  if (!check.hasGistScope) {
    throw new Error(
      `Token 缺少 gist 权限（当前权限: ${check.scopes.length ? check.scopes.join(", ") : "无"}）。\n请重新创建 Token 并勾选 gist scope。`
    )
  }
}

export async function downloadFromGist(
  config: CloudSyncConfig,
  onProgress?: ProgressCallback
): Promise<CloudData> {
  // 不再重复调用 requireGistScope —— token 在配置时已验证，省一次请求

  reportProgress(onProgress, 12, "连接 GitHub Gist")
  const resp = await fetch(gistUrl(config.gistId), {
    headers: {
      Authorization: `token ${config.githubToken}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `下载失败 (${resp.status})`)
  }

  reportProgress(onProgress, 30, "读取云端文件列表")
  const gist = await resp.json() as {
    files: Record<string, {
      content?: string
      truncated?: boolean
      raw_url?: string
    }>
  }
  const filename = config.gistFilename || "CharCardEditor_Cloud.json"

  // 优先读 v2 压缩文件（下载快）
  const v2File = gist.files[v2Filename(filename)]
  if (v2File) {
    reportProgress(onProgress, 48, "读取压缩同步文件")
    const content = await readGistFileContent(v2File)
    try {
      reportProgress(onProgress, 64, "解压云端数据")
      return await decompressData(content)
    } catch {
      throw new Error("v2 压缩数据解析失败，JSON 格式不正确")
    }
  }

  // 回退到旧版明文文件
  const file = gist.files[filename]
  if (!file) {
    throw new Error(`Gist 中未找到文件 "${filename}"，请在设置中检查文件名是否一致`)
  }

  reportProgress(onProgress, 48, "读取旧版同步文件")
  const content = await readGistFileContent(file)
  try {
    reportProgress(onProgress, 64, "解析云端数据")
    return JSON.parse(content) as CloudData
  } catch {
    throw new Error("Gist 内容解析失败，JSON 格式不正确")
  }
}

/** 从 Gist file 对象读取完整内容（处理截断情况） */
async function readGistFileContent(file: {
  content?: string
  truncated?: boolean
  raw_url?: string
}): Promise<string> {
  if (file.truncated && file.raw_url) {
    const rawResp = await fetch(file.raw_url)
    if (!rawResp.ok) throw new Error("获取完整 Gist 内容失败")
    return await rawResp.text()
  }
  if (!file.content) {
    throw new Error("Gist 文件内容为空")
  }
  return file.content
}

// ========== 静默上传（用于编辑器自动保存） ==========

let uploadTimer: ReturnType<typeof setTimeout> | null = null

/** 防抖上传：在编辑器保存后调用，500ms 内多次调用只执行最后一次 */
export function scheduleSilentUpload(): void {
  if (uploadTimer) clearTimeout(uploadTimer)
  uploadTimer = setTimeout(() => {
    performSilentUpload()
  }, 500)
}

async function performSilentUpload(): Promise<void> {
  try {
    const config = await db.cloudSync.get("cloud_sync" as const)
    if (!config?.enabled || !config?.autoUpload) return
    if (!config.gistId || !config.githubToken) return

    const loadingToast = toast.loading("正在同步到云端…")
    try {
      await uploadToGist(config)
      toast.success("云端同步完成", { id: loadingToast })
    } catch {
      toast.error("云端同步失败，请检查设置", { id: loadingToast })
    }
  } catch {
    // 静默失败（无法读取配置）
  }
}

// ========== 连接检测 ==========

export async function checkConnection(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const resp = await fetch(GITHUB_API, { signal: controller.signal })
    clearTimeout(timer)
    return resp.ok || resp.status === 401 // 401 意味着通但未认证
  } catch {
    return false
  }
}
