'use client'

import { useState } from 'react'

interface Props {
  resNumber: string
  shareText: string
}

export default function ShareControls({ resNumber, shareText }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard API unavailable (http / old browser) — fall back to a prompt
      window.prompt('Copy the confirmation text below:', shareText)
    }
  }

  return (
    <div className="no-print flex items-center gap-3 px-8 py-4 bg-white border-b border-slate-200 text-sm">
      <button
        onClick={() => window.close()}
        className="text-teal-600 font-semibold hover:underline"
      >
        ← Close tab
      </button>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">Confirmation — {resNumber}</span>
      <button
        onClick={copy}
        className={`ml-auto px-4 py-1.5 text-xs font-bold rounded transition-colors ${
          copied ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-500'
        }`}
      >
        {copied ? '✓ Copied — paste into Viber / WhatsApp' : 'Copy for Viber / WhatsApp'}
      </button>
      <button
        onClick={() => window.print()}
        className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700"
      >
        Print
      </button>
    </div>
  )
}
