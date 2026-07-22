import { useTokenCount, useTokenCounts } from "@/hooks/useTokenCount"
import { cn } from "@/lib/utils"

function TokenStateText({
  status,
  count,
}: {
  status: ReturnType<typeof useTokenCount>["status"]
  count: number | null
}) {
  if (status === "loading" || (status === "ready" && count == null)) {
    return <>估算中…</>
  }
  if (status === "unavailable") return <>暂不可用</>
  if (status !== "ready" || count == null) return null
  return <>{count.toLocaleString()} tokens</>
}

export function TokenEstimate({
  text,
  prefix,
  className,
}: {
  text: string
  prefix?: string
  className?: string
}) {
  const result = useTokenCount(text)
  if (!result.visible || result.status === "selection-required") return null

  return (
    <span className={cn("text-muted-foreground whitespace-nowrap", className)}>
      {prefix}
      <TokenStateText status={result.status} count={result.count} />
    </span>
  )
}

export function TokenEstimateTotal({
  texts,
  prefix,
  className,
}: {
  texts: readonly string[]
  prefix?: string
  className?: string
}) {
  const result = useTokenCounts(texts)
  if (!result.visible || result.status === "selection-required") return null

  return (
    <span className={cn("text-muted-foreground whitespace-nowrap", className)}>
      {prefix}
      <TokenStateText status={result.status} count={result.total} />
    </span>
  )
}
