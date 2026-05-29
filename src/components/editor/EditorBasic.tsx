import { useRef, useState } from "react"
import type { CharacterCard } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, User } from "lucide-react"
import { CropDialog } from "./CropDialog"

interface Props {
  card: CharacterCard
  onChange: (card: CharacterCard) => void
}

export function EditorBasic({ card, onChange }: Props) {
  const [tagInput, setTagInput] = useState("")
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof CharacterCard>(key: K, value: CharacterCard[K]) {
    onChange({ ...card, [key]: value })
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !card.tags.includes(tag)) {
      update("tags", [...card.tags, tag])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    update("tags", card.tags.filter((t) => t !== tag))
  }

  function handleCropConfirm(dataUrl: string) {
    onChange({ ...card, card_image: dataUrl, card_image_file: cropFile?.name })
    setCropFile(null)
  }

  function handleCropCancel() {
    setCropFile(null)
  }

  async function removeCardImage() {
    if (!confirm("确认移除卡面图片？")) return
    onChange({ ...card, card_image: undefined, card_image_file: undefined })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左：卡面 */}
      <div className="space-y-3">
        <div
          className="aspect-[2/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click() } }}
          role="button"
          tabIndex={0}
          aria-label="选择卡面图片"
        >
          {card.card_image ? (
            <img
              src={card.card_image}
              alt="卡面预览"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <User className="h-10 w-10 opacity-30" />
              <span className="text-xs">点击导入卡面</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setCropFile(f)
            e.target.value = ""
          }}
        />
        {card.card_image && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={removeCardImage}>
            移除卡面
          </Button>
        )}
      </div>

      {/* 右：字段 */}
      <div className="lg:col-span-2 space-y-8">
        {/* 基本信息 */}
        <section>
          <h3 className="text-sm font-semibold mb-3 pb-1.5 border-b">基本信息</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">角色名 *</Label>
              <Input
                id="name"
                value={card.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="输入角色名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version" className="text-xs">版本号</Label>
              <Input
                id="version"
                value={card.character_version}
                onChange={(e) => update("character_version", e.target.value)}
                placeholder="V1.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creator" className="text-xs">作者</Label>
              <Input
                id="creator"
                value={card.creator}
                onChange={(e) => update("creator", e.target.value)}
                placeholder="作者名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatar" className="text-xs">头像 URL</Label>
              <Input
                id="avatar"
                value={card.avatar === "none" ? "" : card.avatar}
                onChange={(e) => update("avatar", e.target.value || "none")}
                placeholder="none（使用默认）"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">健谈度 ({card.talkativeness})</Label>
              <Slider
                value={[card.talkativeness]}
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v
                  update("talkativeness", val)
                }}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Switch
              checked={card.fav}
              onCheckedChange={(v) => update("fav", v)}
              id="fav"
            />
            <Label htmlFor="fav" className="text-xs">{card.fav ? "已收藏" : "收藏"}</Label>
          </div>
        </section>

        {/* 标签 */}
        <section>
          <h3 className="text-sm font-semibold mb-3 pb-1.5 border-b">标签</h3>
          <div className="flex gap-2 mb-3">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="输入标签后按回车"
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addTag}>
              添加
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {card.tags.length === 0 && (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
          </div>
        </section>

        {/* 作者备注 */}
        <section>
          <h3 className="text-sm font-semibold mb-3 pb-1.5 border-b">作者备注</h3>
          <Textarea
            value={card.creatorcomment}
            onChange={(e) => update("creatorcomment", e.target.value)}
            placeholder="作者备注（creatorcomment）"
            rows={4}
            className="text-sm"
          />
        </section>
      </div>

      {cropFile && (
        <CropDialog
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
