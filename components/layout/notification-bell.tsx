'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import type { Notification } from '@/lib/notifications'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((body) => {
        if (!cancelled) setNotifications(body.notifications ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Notifications</div>
          <div className="-mx-1 my-1 h-px bg-border" />
          {notifications.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
          ) : (
            notifications.map((n, i) => (
              <div key={`${n.taskId}-${n.type}-${i}`} className="rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
