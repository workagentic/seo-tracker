'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LeadSourceToggle } from './lead-source-toggle'
import type { LeadSourceWithOptions } from '@/types'

// Admin CRUD for a lead source, plus its per-source "Submission From" options (CLAUDE.md
// Section 14 Phase 4) -- previously only create + activate/deactivate + the
// requires_submission_from toggle existed; this adds real edit/delete for the source and its
// options, replacing the old hardcoded global 3-value enum.
export function LeadSourceRow({ source }: { source: LeadSourceWithOptions }) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(source.name)
  const [expanded, setExpanded] = useState(false)
  const [newOption, setNewOption] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function saveName() {
    if (!name.trim() || name.trim() === source.name) {
      setEditingName(false)
      setName(source.name)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/lead-sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to rename source')
        setName(source.name)
        return
      }
      setEditingName(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function deleteSource() {
    if (!confirm(`Delete source "${source.name}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/lead-sources/${source.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete source')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function addOption() {
    if (!newOption.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/lead-sources/${source.id}/submission-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newOption.trim() }),
      })
      if (res.ok) {
        setNewOption('')
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function toggleOption(optionId: string, nextActive: boolean) {
    setBusy(true)
    try {
      await fetch(`/api/lead-sources/${source.id}/submission-options/${optionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function deleteOption(optionId: string) {
    if (!confirm('Delete this option?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/lead-sources/${source.id}/submission-options/${optionId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete option')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-muted/50">
        <td className="px-4 py-2 text-foreground">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs" disabled={busy} />
              <Button size="xs" disabled={busy} onClick={saveName}>Save</Button>
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => { setEditingName(false); setName(source.name) }}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              {source.name}
              <button type="button" className="text-xs text-indigo-600 hover:underline" onClick={() => setEditingName(true)}>
                Edit
              </button>
            </span>
          )}
        </td>
        <td className="px-4 py-2">
          <LeadSourceToggle id={source.id} field="requires_submission_from" value={source.requires_submission_from} />
        </td>
        <td className="px-4 py-2">
          <LeadSourceToggle id={source.id} field="is_active" value={source.is_active} />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <Button size="xs" variant="outline" onClick={() => setExpanded((e) => !e)}>
              Options ({source.submission_options.length})
            </Button>
            <Button size="xs" variant="destructive" disabled={busy} onClick={deleteSource}>Delete</Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="bg-muted/30 px-4 py-3">
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Submission From options for {source.name}
            </h4>
            <ul className="mb-2 space-y-1">
              {source.submission_options.map((o) => (
                <li key={o.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={o.is_active} disabled={busy} onChange={() => toggleOption(o.id, !o.is_active)} />
                  <span className={o.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}>{o.label}</span>
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => deleteOption(o.id)}>
                    Delete
                  </button>
                </li>
              ))}
              {source.submission_options.length === 0 && (
                <li className="text-sm text-muted-foreground">No options yet.</li>
              )}
            </ul>
            <div className="flex items-center gap-2">
              <Input
                placeholder="New option label"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                className="h-8 max-w-xs"
              />
              <Button size="xs" disabled={busy || !newOption.trim()} onClick={addOption}>Add option</Button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
