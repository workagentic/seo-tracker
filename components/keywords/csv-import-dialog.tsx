'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

export function CsvImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const router = useRouter()

  async function handleImport() {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const res = await fetch('/api/keywords/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.data }),
      })
      if (res.ok) {
        setOpen(false)
        setFile(null)
        router.refresh()
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Import CSV</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Import keywords from CSV</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Columns: keyword, volume, kd, cpc, category, priority, target_url
        </p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <DialogFooter>
          <Button disabled={!file || importing} onClick={handleImport}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
