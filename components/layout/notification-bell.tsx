'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/notifications'

type NotificationWithRead = Notification & { read: boolean }

async function markRead(key: string, read: boolean) {
  await fetch('/api/notifications/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, read }),
  })
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationWithRead[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const load = useCallback(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((body) => setNotifications(body.notifications ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live sync (Supabase Realtime, not polling): a task or comment change anywhere could
  // change what's owed to this user, so just re-fetch rather than trying to diff locally.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel('notification-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  function toggleRead(key: string, next: boolean, e?: React.MouseEvent) {
    e?.stopPropagation()
    setNotifications((prev) => prev.map((n) => (n.key === key ? { ...n, read: next } : n)))
    markRead(key, next)
  }

  function openNotification(n: NotificationWithRead) {
    if (!n.read) toggleRead(n.key, true)
    setOpen(false)
    router.push(`/tasks?highlight=${n.taskId}`)
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await fetch('/api/notifications/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="-mx-1 my-1 h-px bg-border" />
          {notifications.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.key}
                  onClick={() => openNotification(n)}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${n.read ? 'opacity-60' : ''}`}
                >
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />}
                  <span className={`flex-1 ${n.read ? '' : 'font-medium text-foreground'}`}>{n.message}</span>
                  <button
                    type="button"
                    title={n.read ? 'Mark as unread' : 'Mark as read'}
                    onClick={(e) => toggleRead(n.key, !n.read, e)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
