import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { db } from "@/lib/db"
import type { CharacterCard } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Search,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { importCard } from "@/lib/parser"

export function Dashboard() {
  const [cards, setCards] = useState<CharacterCard[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadCards()
  }, [])

  async function loadCards() {
    const all = await db.characterCards.orderBy("updated_at").reverse().toArray()
    setCards(all)
    setLoading(false)
  }

  const filtered = cards.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleImport(file: File) {
    try {
      const card = await importCard(file)
      await db.characterCards.put(card)
      toast.success(`已导入「${card.name}」`)
      loadCards()
    } catch (e) {
      toast.error(`导入失败：${e instanceof Error ? e.message : "未知错误"}`)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImport(file)
    e.target.value = ""
  }

  async function handleBackup() {
    try {
      const data = {
        characterCards: await db.characterCards.toArray(),
        worldBooks: await db.worldBooks.toArray(),
        presets: await db.presets.toArray(),
        apiConfigs: await db.apiConfigs.toArray(),
        chatSessions: await db.chatSessions.toArray(),
        memos: await db.memos.toArray(),
        exported_at: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `CharCardEditor_Backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("备份已导出")
    } catch {
      toast.error("备份失败")
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.characterCards) {
        await db.characterCards.bulkPut(data.characterCards)
        toast.success(`已恢复 ${data.characterCards.length} 张角色卡`)
      }
      if (data.worldBooks) {
        await db.worldBooks.bulkPut(data.worldBooks)
      }
      if (data.presets) {
        await db.presets.bulkPut(data.presets)
      }
      if (data.apiConfigs) {
        await db.apiConfigs.bulkPut(data.apiConfigs)
      }
      if (data.chatSessions) {
        await db.chatSessions.bulkPut(data.chatSessions)
      }
      if (data.memos) {
        await db.memos.bulkPut(data.memos)
      }
      loadCards()
    } catch {
      toast.error("恢复失败，请检查文件格式")
    }
    e.target.value = ""
  }

  async function handleClearAll() {
    if (!confirm("确认清空全部数据？此操作不可撤销！")) return
    await db.characterCards.clear()
    await db.worldBooks.clear()
    await db.presets.clear()
    await db.apiConfigs.clear()
    await db.chatSessions.clear()
    setCards([])
    toast.success("已清空全部数据")
  }

  async function handleDeleteCard(id: string) {
    const card = await db.characterCards.get(id)
    if (!card) return
    if (!confirm(`确认删除「${card.name}」？`)) return
    await db.characterCards.delete(id)
    loadCards()
    toast.success(`已删除「${card.name}」`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载中...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* 顶部操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold">角色卡</h1>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button onClick={() => navigate("/editor/new")} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
          <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] border border-border bg-background hover:bg-muted hover:text-foreground whitespace-nowrap transition-all select-none">
            <Upload className="h-3.5 w-3.5" />
            导入
            <input
              type="file"
              accept="application/json,.json,image/png,.png"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
          <Button variant="outline" size="sm" onClick={handleBackup} className="h-9">
            <Download className="h-4 w-4 mr-1" />
            备份
          </Button>
          <label className="cursor-pointer inline-flex items-center h-9 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] border border-border bg-background hover:bg-muted hover:text-foreground whitespace-nowrap transition-all select-none">
            恢复
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleRestore}
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="h-9 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            清空
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索角色卡..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <User className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">
            {cards.length === 0 ? "还没有角色卡，点击「导入」或「新建」" : "没有匹配的角色卡"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((card) => (
            <Card
              key={card.id}
              className="group cursor-pointer transition-all relative"
            >
              <Link to={`/editor/${card.id}`}>
                <CardContent className="p-3">
                  {/* 卡面 */}
                  <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center">
                    {card.card_image ? (
                      <img
                        src={card.card_image}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground opacity-30" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm truncate">{card.name}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {card.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {card.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{card.tags.length - 2}
                        </span>
                      )}
                    </div>
                    {card.character_version && (
                      <p className="text-[11px] text-muted-foreground">
                        {card.character_version}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Link>
              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteCard(card.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
