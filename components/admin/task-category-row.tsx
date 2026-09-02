'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TaskCategory } from '@/types'

export function TaskCategoryRow({ category }: { category: TaskCategory }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function save() {
    if (!name.trim() || name.trim() === category.name) {
      setEditing(false)
      setName(category.name)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/task-categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to rename category')
        setName(category.name)
        return
      }
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete category "${category.name}"?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/task-categories/${category.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete category')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-2 text-foreground">
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs" disabled={busy} />
        ) : (
          category.name
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="xs" disabled={busy} onClick={save}>Save</Button>
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setName(category.name) }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="xs" variant="destructive" disabled={busy} onClick={remove}>Delete</Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
