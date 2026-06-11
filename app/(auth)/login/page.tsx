'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

// Shown under the logo and during the signing-in animation — edit freely
const TAGLINE = 'Your Stay. Our Wisdom.'

function AnimatedTagline({ delay = 0, className = '' }: { delay?: number; className?: string }) {
  return (
    <motion.p
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
      aria-label={TAGLINE}
    >
      {TAGLINE.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </motion.p>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setLoading(false)
      setError('Invalid email or password')
    } else {
      // Keep the overlay up while we navigate to the dashboard
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F2044' }}>
      {/* Signing-in overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="signin-overlay"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ backgroundColor: '#0F2044' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <motion.h1
              className="text-5xl font-black text-white tracking-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              STAYWISE<span className="text-sky-400">.</span>
            </motion.h1>
            <AnimatedTagline
              delay={0.5}
              className="text-sky-300/90 text-sm mt-3 font-medium tracking-[0.3em] uppercase"
            />
            <motion.div
              className="mt-10 h-0.5 w-40 rounded-full bg-white/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                className="h-full w-1/3 bg-sky-400 rounded-full"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </motion.div>
            <motion.p
              className="text-white/30 text-xs mt-4 tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Signing you in…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.h1
            className="text-4xl font-black text-white tracking-tight"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            STAYWISE<span className="text-sky-400">.</span>
          </motion.h1>
          <AnimatedTagline
            delay={0.4}
            className="text-sky-300/80 text-sm mt-2 font-medium tracking-widest uppercase"
          />
        </div>

        {/* Card */}
        <motion.div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
        >
          <h2 className="text-white font-semibold text-lg mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sky-300/80 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@staywise.com"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sky-300/80 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400/30 rounded-lg px-4 py-2.5 text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl text-sm transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </motion.div>

        {/* Credits */}
        <motion.p
          className="text-center text-white/20 text-xs mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          STAYWISE RESORT &amp; SPA · Phuket, Thailand
        </motion.p>
      </div>
    </div>
  )
}
