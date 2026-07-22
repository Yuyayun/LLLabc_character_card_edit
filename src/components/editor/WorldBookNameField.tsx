import { useLayoutEffect, useRef } from "react"
import type { ComponentProps } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function WorldBookNameField({
  className,
  value,
  ...props
}: Omit<ComponentProps<typeof Textarea>, "ref">) {
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.style.height = "0px"
    field.style.height = `${field.scrollHeight}px`
  }, [value])

  return (
    <Textarea
      ref={fieldRef}
      rows={1}
      value={value}
      className={cn(
        "min-h-0 resize-none overflow-hidden break-words border-none bg-transparent px-0 py-0 leading-snug shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}
