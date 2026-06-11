'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { subscribeToasts, ToastItem } from '@/lib/toast'

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
            className={`flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-800'
                : 'bg-white border-red-200 text-slate-800'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
