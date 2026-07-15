import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { FontContext, type FontActionResult, type FontLoadState } from "./font-context"
import {
  APP_FONT_VARIABLE,
  DEFAULT_FONT_FAMILY,
  FONT_PREVIEW_TEXT,
  builtInFonts,
  createCustomFont,
  loadFontPreferences,
  normalizeFamilyName,
  saveFontPreferences,
  validateFontStylesheetUrl,
  getPrimaryFontFamily,
  type CustomFont,
  type CustomFontInput,
  type FontOption,
  type FontPreferences,
} from "@/lib/fontSettings"

const DYNAMIC_LINK_SELECTOR = "link[data-app-dynamic-font-link]"
const CSS_LOAD_TIMEOUT = 15_000
const FONT_LOAD_TIMEOUT = 12_000
const FONT_PROBE_FALLBACKS = ["monospace", "serif", "sans-serif"]

function applyGlobalFont(family: string) {
  document.documentElement.style.setProperty(APP_FONT_VARIABLE, family)
}

function removePendingFontLinks() {
  document
    .querySelectorAll<HTMLLinkElement>(
      `${DYNAMIC_LINK_SELECTOR}[data-app-dynamic-font-link="pending"]`,
    )
    .forEach((link) => link.remove())
}

function waitForStylesheet(font: CustomFont): Promise<HTMLLinkElement> {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link")
    const timeoutId = window.setTimeout(() => {
      link.remove()
      reject(new Error("字体 CSS 加载超时，请检查地址或网络连接"))
    }, CSS_LOAD_TIMEOUT)

    link.rel = "stylesheet"
    link.href = font.url
    link.dataset.appDynamicFontLink = "pending"
    link.dataset.fontId = font.id

    link.onload = () => {
      window.clearTimeout(timeoutId)
      resolve(link)
    }
    link.onerror = () => {
      window.clearTimeout(timeoutId)
      link.remove()
      reject(new Error("字体 CSS 请求失败，请检查地址、跨域或网络状态"))
    }

    document.head.appendChild(link)
  })
}

function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeout)
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

function waitForRenderedFont(primaryFamily: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const probeBox = document.createElement("div")
    const probeText = `${FONT_PREVIEW_TEXT} BESbswy 0123456789 天地玄黄`
    const probes = FONT_PROBE_FALLBACKS.map((fallback) => {
      const probe = document.createElement("span")
      probe.textContent = probeText
      probe.style.cssText = [
        "display:inline-block",
        "font-size:48px",
        "font-weight:400",
        "font-style:normal",
        "font-variant:normal",
        "letter-spacing:0",
        "white-space:nowrap",
        `font-family:${fallback}`,
      ].join(";")
      probeBox.appendChild(probe)
      return probe
    })

    probeBox.setAttribute("aria-hidden", "true")
    probeBox.style.cssText = [
      "position:fixed",
      "left:-100000px",
      "top:-100000px",
      "visibility:hidden",
      "pointer-events:none",
    ].join(";")
    document.body.appendChild(probeBox)

    const baselineWidths = probes.map(
      (probe) => probe.getBoundingClientRect().width,
    )
    probes.forEach((probe, index) => {
      probe.style.fontFamily = `${primaryFamily}, ${FONT_PROBE_FALLBACKS[index]}`
    })

    const startedAt = performance.now()
    const checkRenderedFont = () => {
      const widths = probes.map((probe) => probe.getBoundingClientRect().width)
      const changedCount = widths.filter(
        (width, index) => Math.abs(width - baselineWidths[index]) > 0.5,
      ).length

      if (changedCount >= 1) {
        probeBox.remove()
        resolve()
        return
      }

      if (performance.now() - startedAt >= FONT_LOAD_TIMEOUT) {
        probeBox.remove()
        reject(
          new Error(
            `CSS 已加载，但没有检测到 ${primaryFamily} 的实际字形；请核对 font-family 或字体文件`,
          ),
        )
        return
      }

      window.setTimeout(checkRenderedFont, 100)
    }

    checkRenderedFont()
  })
}

async function verifyFontAvailability(primaryFamily: string): Promise<void> {
  if (typeof document.fonts?.load === "function") {
    const loadedFaces = await withTimeout(
      document.fonts.load(`18px ${primaryFamily}`, FONT_PREVIEW_TEXT),
      FONT_LOAD_TIMEOUT,
      "字体文件加载超时，请检查 CSS 中的字体文件地址",
    )

    if (loadedFaces.length === 0) {
      throw new Error(
        `CSS 已加载，但没有找到 ${primaryFamily}；请核对 CSS 中的 font-family`,
      )
    }
    return
  }

  await waitForRenderedFont(primaryFamily)
}

interface ActivateOptions {
  customFonts?: CustomFont[]
  resetToDefaultOnFailure?: boolean
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontState, setFontState] = useState<FontPreferences>(loadFontPreferences)
  const [loadState, setLoadState] = useState<FontLoadState>({
    status: "idle",
    targetFamily: null,
    message: "",
  })
  const stateRef = useRef(fontState)
  const activeLinkRef = useRef<HTMLLinkElement | null>(null)
  const requestIdRef = useRef(0)

  const commitState = useCallback((next: FontPreferences) => {
    stateRef.current = next
    setFontState(next)
    saveFontPreferences(next)
  }, [])

  const applyBuiltInFont = useCallback(
    (font: FontOption): FontActionResult => {
      requestIdRef.current += 1
      removePendingFontLinks()
      activeLinkRef.current?.remove()
      activeLinkRef.current = null
      applyGlobalFont(font.family)

      commitState({
        ...stateRef.current,
        currentFontFamily: font.family,
      })
      setLoadState({
        status: "ready",
        targetFamily: font.family,
        message: `${font.label}已生效`,
      })

      return { ok: true, message: `${font.label}已生效` }
    },
    [commitState],
  )

  const activateBuiltInFont = useCallback(
    async (
      font: FontOption,
      resetToDefaultOnFailure = false,
    ): Promise<FontActionResult> => {
      const requestId = ++requestIdRef.current
      setLoadState({
        status: "loading-font",
        targetFamily: font.family,
        message: `正在验证 ${font.label} 的字体文件`,
      })

      try {
        await verifyFontAvailability(getPrimaryFontFamily(font.family))
        if (requestId !== requestIdRef.current) {
          return { ok: false, message: "字体加载已取消" }
        }
        return applyBuiltInFont(font)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "内置字体加载失败"

        if (requestId !== requestIdRef.current) {
          return { ok: false, message: "字体加载已取消" }
        }

        if (resetToDefaultOnFailure) {
          activeLinkRef.current?.remove()
          activeLinkRef.current = null
          applyGlobalFont(DEFAULT_FONT_FAMILY)
          commitState({
            ...stateRef.current,
            currentFontFamily: DEFAULT_FONT_FAMILY,
          })
        }

        setLoadState({
          status: "failed",
          targetFamily: font.family,
          message,
        })
        return { ok: false, message }
      }
    },
    [applyBuiltInFont, commitState],
  )

  const activateCustomFont = useCallback(
    async (
      font: CustomFont,
      options: ActivateOptions = {},
    ): Promise<FontActionResult> => {
      const requestId = ++requestIdRef.current
      removePendingFontLinks()
      setLoadState({
        status: "loading-css",
        targetFamily: font.family,
        message: `正在加载 ${font.label} 的字体样式`,
      })

      let pendingLink: HTMLLinkElement | null = null

      try {
        pendingLink = await waitForStylesheet(font)
        if (requestId !== requestIdRef.current) {
          pendingLink.remove()
          return { ok: false, message: "字体加载已取消" }
        }

        if (!document.fonts) {
          throw new Error("当前浏览器不支持字体加载验证")
        }

        setLoadState({
          status: "loading-font",
          targetFamily: font.family,
          message: "CSS 已加载，正在验证字体族名称",
        })

        const primaryFamily = getPrimaryFontFamily(font.family)
        await verifyFontAvailability(primaryFamily)

        if (requestId !== requestIdRef.current) {
          pendingLink.remove()
          return { ok: false, message: "字体加载已取消" }
        }

        activeLinkRef.current?.remove()
        pendingLink.dataset.appDynamicFontLink = "active"
        activeLinkRef.current = pendingLink
        applyGlobalFont(font.family)

        const nextCustomFonts = options.customFonts ?? stateRef.current.customFonts
        commitState({
          currentFontFamily: font.family,
          customFonts: nextCustomFonts,
        })
        setLoadState({
          status: "ready",
          targetFamily: font.family,
          message: `${font.label}已验证并生效`,
        })

        return { ok: true, message: `${font.label}已验证并生效` }
      } catch (error) {
        pendingLink?.remove()
        const message =
          error instanceof Error ? error.message : "字体加载失败，请检查设置"

        if (requestId !== requestIdRef.current) {
          return { ok: false, message: "字体加载已取消" }
        }

        if (options.resetToDefaultOnFailure) {
          activeLinkRef.current?.remove()
          activeLinkRef.current = null
          applyGlobalFont(DEFAULT_FONT_FAMILY)
          commitState({
            currentFontFamily: DEFAULT_FONT_FAMILY,
            customFonts: options.customFonts ?? stateRef.current.customFonts,
          })
        }

        setLoadState({
          status: "failed",
          targetFamily: font.family,
          message,
        })
        return { ok: false, message }
      }
    },
    [commitState],
  )

  const selectFont = useCallback(
    async (font: FontOption): Promise<FontActionResult> => {
      if (
        stateRef.current.currentFontFamily === font.family &&
        (font.source === "builtin" || activeLinkRef.current)
      ) {
        return { ok: true, message: `${font.label}已在使用中` }
      }

      if (font.source === "builtin") {
        return font.url ? activateBuiltInFont(font) : applyBuiltInFont(font)
      }
      return activateCustomFont(font as CustomFont)
    },
    [activateBuiltInFont, activateCustomFont, applyBuiltInFont],
  )

  const addCustomFont = useCallback(
    async (input: CustomFontInput): Promise<FontActionResult> => {
      const label = input.label.trim()
      const family = normalizeFamilyName(input.family)
      const urlError = validateFontStylesheetUrl(input.url)

      if (!label) return { ok: false, message: "请填写字体显示名称" }
      if (!family) return { ok: false, message: "请填写 CSS 字体族名称" }
      if (urlError) return { ok: false, message: urlError }

      const duplicate = [...builtInFonts, ...stateRef.current.customFonts].find(
        (font) =>
          getPrimaryFontFamily(font.family) === getPrimaryFontFamily(family) ||
          font.url === input.url.trim(),
      )
      if (duplicate) {
        return {
          ok: false,
          message: `字体库中已存在“${duplicate.label}”`,
        }
      }

      const font = createCustomFont({ ...input, label, family })
      const nextCustomFonts = [...stateRef.current.customFonts, font]
      return activateCustomFont(font, { customFonts: nextCustomFonts })
    },
    [activateCustomFont],
  )

  const removeCustomFont = useCallback(
    (id: string) => {
      const target = stateRef.current.customFonts.find((font) => font.id === id)
      if (!target) return

      const customFonts = stateRef.current.customFonts.filter(
        (font) => font.id !== id,
      )

      if (stateRef.current.currentFontFamily === target.family) {
        requestIdRef.current += 1
        removePendingFontLinks()
        activeLinkRef.current?.remove()
        activeLinkRef.current = null
        applyGlobalFont(DEFAULT_FONT_FAMILY)
        commitState({
          currentFontFamily: DEFAULT_FONT_FAMILY,
          customFonts,
        })
        setLoadState({
          status: "ready",
          targetFamily: DEFAULT_FONT_FAMILY,
          message: "已删除当前字体并恢复汇文仿宋",
        })
        return
      }

      commitState({ ...stateRef.current, customFonts })
    },
    [commitState],
  )

  useLayoutEffect(() => {
    document
      .querySelectorAll<HTMLLinkElement>(DYNAMIC_LINK_SELECTOR)
      .forEach((link) => link.remove())
    activeLinkRef.current = null

    const selectedCustomFont = stateRef.current.customFonts.find(
      (font) => font.family === stateRef.current.currentFontFamily,
    )
    const selectedBuiltInFont = builtInFonts.find(
      (font) => font.family === stateRef.current.currentFontFamily,
    )

    if (selectedCustomFont) {
      applyGlobalFont(DEFAULT_FONT_FAMILY)
      void activateCustomFont(selectedCustomFont, {
        customFonts: stateRef.current.customFonts,
        resetToDefaultOnFailure: true,
      })
    } else if (selectedBuiltInFont?.url) {
      applyGlobalFont(DEFAULT_FONT_FAMILY)
      void activateBuiltInFont(selectedBuiltInFont, true)
    } else {
      applyBuiltInFont(selectedBuiltInFont ?? builtInFonts[0])
    }

    return () => {
      requestIdRef.current += 1
      document
        .querySelectorAll<HTMLLinkElement>(DYNAMIC_LINK_SELECTOR)
        .forEach((link) => link.remove())
      activeLinkRef.current = null
    }
  }, [activateBuiltInFont, activateCustomFont, applyBuiltInFont])

  const fonts = useMemo(
    () => [...builtInFonts, ...fontState.customFonts],
    [fontState.customFonts],
  )
  const value = useMemo(
    () => ({
      fontState,
      fonts,
      loadState,
      selectFont,
      addCustomFont,
      removeCustomFont,
    }),
    [
      addCustomFont,
      fontState,
      fonts,
      loadState,
      removeCustomFont,
      selectFont,
    ],
  )

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}
