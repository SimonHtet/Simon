'use client'

interface Props {
  resNumber: string
}

export default function PrintControls({ resNumber }: Props) {
  return (
    <div className="no-print flex items-center gap-3 px-8 py-4 bg-white border-b border-slate-200 text-sm">
      <button
        onClick={() => window.close()}
        className="text-teal-600 font-semibold hover:underline"
      >
        ← Close tab
      </button>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">Folio — {resNumber}</span>
      <button
        onClick={() => window.print()}
        className="ml-auto px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700"
      >
        Print
      </button>
    </div>
  )
}
