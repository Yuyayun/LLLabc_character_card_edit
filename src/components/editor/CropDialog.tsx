import { useState, useEffect, useCallback, useRef } from "react"
import ReactCrop from "react-image-crop"
import type { Crop, PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface Props {
  file: File
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  scaleX: number,
  scaleY: number
): Promise<string> {
  const image = new Image()
  image.src = imageSrc
  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const sx = Math.round(pixelCrop.x * scaleX)
      const sy = Math.round(pixelCrop.y * scaleY)
      const sw = Math.round(pixelCrop.width * scaleX)
      const sh = Math.round(pixelCrop.height * scaleY)
      canvas.width = sw
      canvas.height = sh
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL("image/png"))
    }
    image.onerror = () => reject(new Error("图片加载失败"))
  })
}

export function CropDialog({ file, onConfirm, onCancel }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const cropWidth = Math.round(img.width * 0.8)
    const cropHeight = Math.round(cropWidth * (3 / 2))
    const actualHeight = Math.min(cropHeight, img.height)
    const actualWidth = Math.round(actualHeight * (2 / 3))
    const x = Math.round((img.width - actualWidth) / 2)
    const y = Math.round((img.height - actualHeight) / 2)
    setCrop({
      unit: "px",
      x,
      y,
      width: actualWidth,
      height: actualHeight,
    })
    // Scroll to center the crop area for tall images
    requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return
      const scrollTarget = y + actualHeight / 2 - container.clientHeight / 2
      container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "auto" })
    })
  }, [])

  async function handleConfirm() {
    if (!imageSrc || !completedCrop || !imgRef.current) return
    const img = imgRef.current
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const dataUrl = await getCroppedImg(imageSrc, completedCrop, scaleX, scaleY)
    onConfirm(dataUrl)
  }

  if (!imageSrc) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">加载图片中...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div ref={containerRef} className="bg-card border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 transform-[translateZ(0)]" style={{ backgroundColor: 'var(--background)' }}>
          <h3 className="text-sm font-semibold">裁切卡面 (2:3)</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-1" />
              确认
            </Button>
          </div>
        </div>

        {/* Crop area */}
        <div className="p-4 flex justify-center" style={{ backgroundColor: 'var(--muted)' }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={2 / 3}
            minWidth={80}
            minHeight={120}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="裁切预览"
              onLoad={onImageLoad}
              className="max-w-full block"
            />
          </ReactCrop>
        </div>
      </div>
    </div>
  )
}
