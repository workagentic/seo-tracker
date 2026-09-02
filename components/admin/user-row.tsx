'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Profile, Role } from '@/types'

const ROLES: Role[] = ['admin', 'head', 'owner', 'leadership']

export function UserRow({ profile, currentUserId }: { profile: Profile; currentUserId: string }) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile.full_name)
  const [role, setRole] = useState<Role>(profile.role)
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? '')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), role, job_title: jobTitle.trim() || null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to save user')
        return
      }
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function toggleLock() {
    setBusy(true)
    try {
      await fetch(`/api/admin/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !profile.is_active }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete ${profile.full_name}? This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${profile.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete user')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <tr className="hover:bg-muted/50">
        <td className="px-4 py-2"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-8" disabled={busy} /></td>
        <td className="px-4 py-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={busy}
            className="h-8 rounded border border-input bg-card px-2 text-sm"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        <td className="px-4 py-2"><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-8" disabled={busy} /></td>
        <td className="px-4 py-2 text-muted-foreground">{profile.is_active ? 'Yes' : 'No'}</td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <Button size="xs" disabled={busy || !fullName.trim()} onClick={save}>Save</Button>
            <Button size="xs" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-2 text-foreground">{profile.full_name}</td>
      <td className="px-4 py-2 text-muted-foreground">{profile.role}</td>
      <td className="px-4 py-2 text-muted-foreground">{profile.job_title ?? '—'}</td>
      <td className="px-4 py-2 text-muted-foreground">{profile.is_active ? 'Yes' : 'No'}</td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="xs" variant="outline" disabled={busy} onClick={toggleLock}>
            {profile.is_active ? 'Lock' : 'Unlock'}
          </Button>
          {profile.id !== currentUserId && (
            <Button size="xs" variant="destructive" disabled={busy} onClick={remove}>Delete</Button>
          )}
        </div>
      </td>
    </tr>
  )
}
