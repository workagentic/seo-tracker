'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Role } from '@/types'

const ROLES: Role[] = ['admin', 'senior', 'expert', 'reviewer']

export function CreateUserForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('expert')
  const [jobTitle, setJobTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, role, job_title: jobTitle }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body.error)
        return
      }
      setMessage(`Created ${email} — temp password: ${body.tempPassword}`)
      setFullName(''); setEmail(''); setJobTitle('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="font-medium text-foreground">Create user</h2>
      <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      <select className="w-full rounded border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button disabled={submitting || !fullName || !email} onClick={handleSubmit}>
        {submitting ? 'Creating…' : 'Create user'}
      </Button>
    </div>
  )
}
