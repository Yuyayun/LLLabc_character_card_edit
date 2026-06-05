/**
 * 封锁 Key 模块 — 预设编辑器的访问控制
 *
 * Key 验证为礼貌性控制，非安全加密方案。
 * 任何能读源码或操作 DevTools 的用户皆可绕过。
 */

import { db } from "@/lib/db"

const SETTINGS_KEY = "p:uk"

// 三段碎片 — 全部在此文件内定义，避免跨模块循环依赖
const F1 = "a7f3c"
const F2 = "b9e2d"
const F3 = "d4k8m"

const FULL_SEED = F1 + F2 + F3

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyKey(input: string): Promise<boolean> {
  if (!input.trim()) return false
  const actual = await sha256(input.trim())
  const expected = await sha256(FULL_SEED)
  if (actual === expected) {
    await setUnlockFlag()
    return true
  }
  return false
}

export async function isPresetUnlocked(): Promise<boolean> {
  try {
    const row = await db.settings.get(SETTINGS_KEY)
    if (!row || row.value !== "1") return false
    // 校验值防篡改
    const check = await sha256(SETTINGS_KEY + "salt")
    return row.extra === check.slice(0, 16)
  } catch {
    return false
  }
}

export async function setUnlockFlag(): Promise<void> {
  const check = await sha256(SETTINGS_KEY + "salt")
  await db.settings.put({
    key: SETTINGS_KEY,
    value: "1",
    extra: check.slice(0, 16),
  })
}

export async function clearUnlock(): Promise<void> {
  try {
    await db.settings.delete(SETTINGS_KEY)
  } catch {
    // 忽略
  }
}
