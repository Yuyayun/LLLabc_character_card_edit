import { useRegisterSW } from "virtual:pwa-register/react"
import { useEffect } from "react"
import { toast } from "sonner"

/** 检测 PWA 新版本，弹出提醒让用户刷新 */
export function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      toast.info("有新版本可用", {
        description: "点击刷新获取最新功能",
        action: {
          label: "刷新",
          onClick: () => updateServiceWorker(true),
        },
        duration: 60_000, // 1 分钟，给用户足够时间看到
      })
    }
  }, [needRefresh, updateServiceWorker])

  return null
}
