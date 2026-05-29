import { MessageSquareText } from "lucide-react"

export function Chat() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
      <MessageSquareText className="h-12 w-12 opacity-30" />
      <p className="text-sm">AI 对话功能正在开发中...</p>
      <p className="text-xs">此模块将支持连接 AI API 进行写卡辅助和角色测试</p>
    </div>
  )
}
