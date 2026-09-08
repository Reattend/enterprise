'use client'

// /app/settings/billing/invoice/[id] - a plain, printable invoice for one
// Paddle transaction.
//
// Deliberately print-to-PDF rather than a generated PDF file: it needs no new
// dependency, renders identically everywhere, and the browser's own "Save as
// PDF" is what people already use. @media print strips the app chrome.
//
// NOTE ON WHO ISSUES THIS: if Paddle acts as merchant of record on this
// account, the official tax invoice is the one Paddle issues, and this
// document is a supplementary receipt rather than a tax invoice. The wording
// below is deliberately "Receipt" for that reason - see BILLING.md.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Txn {
  id: string
  status: string
  createdAt: string
  billedAt: string | null
  total: string | null
  currency: string | null
  invoiceUrl: string | null
}

function money(total: string | null, currency: string | null) {
  if (!total) return '—'
  // Paddle returns minor units as a string ("900" = $9.00).
  const n = Number(total)
  if (Number.isNaN(n)) return total
  return `${currency || 'USD'} ${(n / 100).toFixed(2)}`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return s }
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>()
  const [txn, setTxn] = useState<Txn | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [tRes, uRes] = await Promise.all([
          fetch('/api/billing/transactions'),
          fetch('/api/user'),
        ])
        const tData = await tRes.json().catch(() => ({ transactions: [] }))
        const uData = await uRes.json().catch(() => ({}))
        setEmail(uData?.user?.email || '')
        const found = (tData.transactions || []).find((t: Txn) => t.id === params.id)
        if (found) setTxn(found)
        else setNotFound(true)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !txn) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">That receipt could not be found on your account.</p>
        <Link href="/app/settings/billing" className="text-sm underline underline-offset-4">
          Back to billing
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .invoice-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-5">
        <Link href="/app/settings/billing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Billing
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
        >
          <Printer className="h-3.5 w-3.5" /> Download / print
        </button>
      </div>

      <div className="invoice-sheet rounded-xl border bg-card p-8 sm:p-10">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/black_logo.svg" alt="Reattend" width={34} height={34} className="h-[34px] w-[34px]" />
            <div>
              <div className="text-lg font-semibold tracking-tight">Reattend</div>
              <div className="text-[11px] text-muted-foreground">Reattend Technologies Private Limited</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">Receipt</div>
            <div className="text-[11px] text-muted-foreground font-mono">{txn.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Billed to</div>
            <div>{email || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Date</div>
            <div>{fmtDate(txn.billedAt || txn.createdAt)}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-3 mb-1.5">Status</div>
            <div className="capitalize">{txn.status}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium pb-2">Description</th>
              <th className="text-right font-medium pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">
                Reattend — Managed subscription
                <div className="text-xs text-muted-foreground">Subscription</div>
              </td>
              <td className="py-3 text-right tabular-nums">{money(txn.total, txn.currency)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right font-semibold">Total</td>
              <td className="pt-3 text-right font-semibold tabular-nums">{money(txn.total, txn.currency)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Payment processed by our payment provider. Taxes, where applicable, are shown on the
          provider&apos;s tax invoice.
          {txn.invoiceUrl && (
            <>
              {' '}
              <a href={txn.invoiceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                View the official tax invoice
              </a>
              .
            </>
          )}
        </p>
      </div>
    </div>
  )
}
