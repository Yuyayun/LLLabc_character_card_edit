import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { db } from "@/lib/db"
import { generateId } from "@/lib/utils"
import type { WorldBook } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, BookOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"

export function WorldBooks() {
  const [books, setBooks] = useState<WorldBook[]>([])

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    const all = await db.worldBooks.orderBy("updated_at").reverse().toArray()
    setBooks(all)
  }

  async function handleCreate() {
    const book: WorldBook = {
      id: generateId(),
      name: "未命名世界书",
      description: "",
      entries: [],
      is_standalone: true,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.worldBooks.put(book)
    toast.success("已创建世界书")
    loadBooks()
  }

  async function handleDelete(id: string) {
    const book = await db.worldBooks.get(id)
    if (!book) return
    if (!confirm(`确认删除「${book.name}」？`)) return
    await db.worldBooks.delete(id)
    loadBooks()
    toast.success(`已删除「${book.name}」`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">世界书</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新建
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">暂无独立世界书</p>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <Card key={book.id} className="hover:ring-1 hover:ring-primary/30 transition-all">
              <Link to={`/worldbook/${book.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{book.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {book.entries.length} 条条目
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete(book.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
