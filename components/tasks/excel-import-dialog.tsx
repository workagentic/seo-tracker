'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

interface ImportResult {
  imported: number
  skipped: { row: number; reason: string }[]
}

// Server-side parsing (xlsx/SheetJS), not client-side like the Keywords CSV import -- binary
// Excel parsing is more robust done once, server-side (docs/superpowers/specs/
// 2026-10-14-task-excel-import-design.md).
export function ExcelImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | { error: string } | null>(null)
  const router = useRouter()

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/tasks/import', { method: 'POST', body: formData })
      const body = await res.json()
      setResult(res.ok ? body : { error: body.error ?? 'Import failed' })
    } catch {
      setResult({ error: 'Import failed' })
    } finally {
      setImporting(false)
    }
  }

  function handleDismissResult() {
    const hadSuccess = result && 'imported' in result && result.imported > 0
    setResult(null)
    setFile(null)
    setOpen(false)
    if (hadSuccess) router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setFile(null)
          setResult(null)
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline">Import from Excel</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import tasks from Excel</DialogTitle>
        </DialogHeader>

        {!result && (
          <>
            <p className="text-sm text-muted-foreground">
              Columns: Action Number, Title (required), Description, Owner, Assigned To, Due Date, Deadline,
              Quarter, Category, Notes, Link URL.{' '}
              <a href="/task-import-template.xlsx" download className="underline">
                Download template
              </a>
              . Every imported task starts as Pending.
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <DialogFooter>
              <Button disabled={!file || importing} onClick={handleImport}>
                {importing ? 'Importing…' : 'Import'}
              </Button>
            </DialogFooter>
          </>
        )}

        {result && 'error' in result && (
          <>
            <p className="text-sm text-destructive">{result.error}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>Try again</Button>
            </DialogFooter>
          </>
        )}

        {result && 'imported' in result && (
          <>
            <p className="text-sm text-foreground">Imported {result.imported} task(s).</p>
            {result.skipped.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-md border border-border p-2 text-sm">
                <p className="mb-1 font-medium text-foreground">{result.skipped.length} row(s) skipped:</p>
                <ul className="space-y-1 text-muted-foreground">
                  {result.skipped.map((s) => (
                    <li key={s.row}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleDismissResult}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
