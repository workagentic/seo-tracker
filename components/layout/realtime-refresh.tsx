'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

// Tables backing the shared pages (Tasks/Dashboard/Competitors/Keywords/Audit) -- see
// supabase/migrations/0021_realtime_publication.sql. A change to any of these means whatever
// the current page is showing might be stale, so this just re-fetches the current route's
// server data rather than tracking per-page relevance.
const WATCHED_TABLES = [
  'tasks',
  'task_activity',
  'task_comments',
  'competitors',
  'tracked_keywords',
  'keyword_history',
  'audit_reports',
  'metric_snapshots',
  'ga4_snapshots',
  'clarity_snapshots',
] as const

const DEBOUNCE_MS = 500

export function RealtimeRefresh() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel('shared-data-refresh')

    for (const table of WATCHED_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        // A bulk update or sync can fire many change events in quick succession -- debounce
        // to one refresh rather than one per row.
        debounceRef.current = setTimeout(() => router.refresh(), DEBOUNCE_MS)
      })
    }

    channel.subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
