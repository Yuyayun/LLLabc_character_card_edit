import type { CloudSyncConfig, CloudData } from "@/types"
import { db } from "./db"

const GITHUB_API = "https://api.github.com"

// ========== 数据导出/导入 ==========

export async function exportAllData(): Promise<CloudData> {
  const [
    characterCards,
    worldBooks,
    presets,
    apiConfigs,
    chatSessions,
    memos,
  ] = await Promise.all([
    db.characterCards.toArray(),
    db.worldBooks.toArray(),
    db.presets.toArray(),
    db.apiConfigs.toArray(),
    db.chatSessions.toArray(),
    db.memos.toArray(),
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
  }
}

export async function importAllData(data: CloudData): Promise<void> {
  if (data.characterCards?.length) {
    await db.characterCards.bulkPut(data.characterCards)
  }
  if (data.worldBooks?.length) {
    await db.worldBooks.bulkPut(data.worldBooks)
  }
  if (data.presets?.length) {
    await db.presets.bulkPut(data.presets)
  }
  if (data.apiConfigs?.length) {
    await db.apiConfigs.bulkPut(data.apiConfigs)
  }
  if (data.chatSessions?.length) {
    await db.chatSessions.bulkPut(data.chatSessions)
  }
  if (data.memos?.length) {
    await db.memos.bulkPut(data.memos)
  }
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
  data: CloudData
): Promise<string> {
  const body = {
    description: "角色卡编辑器 — 云同步数据",
    public: false,
    files: {
      "CharCardEditor_Cloud.json": {
        content: JSON.stringify(data, null, 2),
      },
    },
  }

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
  return created.id
}

export async function uploadToGist(
  config: CloudSyncConfig
): Promise<void> {
  // 先验证 token 是否具备 gist scope
  await requireGistScope(config.githubToken)

  const data = await exportAllData()
  const filename = config.gistFilename || "CharCardEditor_Cloud.json"

  const body = {
    files: {
      [filename]: {
        content: JSON.stringify(data, null, 2),
      },
    },
  }

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
  await db.cloudSync.put({
    ...config,
    lastSyncAt: new Date(),
  })
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
  config: CloudSyncConfig
): Promise<CloudData> {
  // 先验证 token 是否具备 gist scope
  await requireGistScope(config.githubToken)

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

  const gist = await resp.json() as {
    files: Record<string, {
      content?: string
      truncated?: boolean
      raw_url?: string
    }>
  }
  const filename = config.gistFilename || "CharCardEditor_Cloud.json"
  const file = gist.files[filename]

  if (!file) {
    throw new Error(`Gist 中未找到文件 "${filename}"，请在设置中检查文件名是否一致`)
  }

  // 文件被截断（>1MB），通过 raw_url 获取完整内容
  if (file.truncated && file.raw_url) {
    const rawResp = await fetch(file.raw_url)
    if (!rawResp.ok) throw new Error("获取完整 Gist 内容失败")
    try {
      return (await rawResp.json()) as CloudData
    } catch {
      throw new Error("Gist 内容解析失败，JSON 格式不正确")
    }
  }

  if (!file.content) {
    throw new Error(`Gist 文件 "${filename}" 内容为空`)
  }

  try {
    return JSON.parse(file.content) as CloudData
  } catch {
    throw new Error("Gist 内容解析失败，JSON 格式不正确")
  }
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
    const config = await db.cloudSync.get("cloud_sync" as "cloud_sync")
    if (!config?.enabled || !config?.autoUpload) return
    if (!config.gistId || !config.githubToken) return

    await uploadToGist(config)
  } catch {
    // 静默失败，不打断用户
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
