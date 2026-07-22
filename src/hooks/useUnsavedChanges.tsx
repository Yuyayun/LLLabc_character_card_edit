import { useCallback, useEffect, useRef, useState } from "react"
import { useBeforeUnload, useBlocker } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type PendingAction = () => void | Promise<void>

interface DiscardCopy {
  title?: string
  description?: string
}

interface PendingDiscard extends DiscardCopy {
  action: PendingAction
}

export function createEditorSnapshot(value: unknown): string {
  return JSON.stringify(value)
}

export function useUnsavedChanges(isDirty: boolean) {
  const allowNavigationRef = useRef(false)
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null)

  useEffect(() => {
    allowNavigationRef.current = false
  }, [isDirty])

  const blocker = useBlocker(
    useCallback(
      () => isDirty && !allowNavigationRef.current,
      [isDirty]
    )
  )

  useBeforeUnload(
    useCallback((event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }, [isDirty])
  )

  const requestDiscard = useCallback((
    action: PendingAction,
    copy: DiscardCopy = {}
  ) => {
    if (!isDirty) {
      void action()
      return
    }
    setPendingDiscard({ action, ...copy })
  }, [isDirty])

  const markClean = useCallback(() => {
    allowNavigationRef.current = true
  }, [])

  const cancelDiscard = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset()
    setPendingDiscard(null)
  }, [blocker])

  const confirmDiscard = useCallback(() => {
    if (blocker.state === "blocked") {
      allowNavigationRef.current = true
      setPendingDiscard(null)
      blocker.proceed()
      return
    }

    const action = pendingDiscard?.action
    setPendingDiscard(null)
    if (action) void action()
  }, [blocker, pendingDiscard])

  const dialog = (
    <AlertDialog
      open={blocker.state === "blocked" || pendingDiscard !== null}
      onOpenChange={(open) => {
        if (!open) cancelDiscard()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pendingDiscard?.title ?? "放弃未保存的修改？"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDiscard?.description ??
              "当前内容相对上次加载或保存后已有修改。继续离开会丢失这些修改。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelDiscard}>继续编辑</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
            放弃修改
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { dialog, markClean, requestDiscard }
}
