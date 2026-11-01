import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, User, ArrowLeft, LogIn, ShieldAlert } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useToast } from '@/components/Toast'

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    api.get('/api/admin/me').then(() => navigate('/admin', { replace: true })).catch(() => {})
  }, [navigate])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.post<{ user: { name: string } }>('/api/admin/login', { username, password })
      toast.push(`Welcome back, ${result.user.name}.`, 'success')
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/"
          className="mb-7 inline-flex items-center gap-2 text-sm text-mist-400 transition hover:text-mist-50"
        >
          <ArrowLeft size={15} /> Back to the website
        </Link>

        <div className="rounded-[2rem] border border-ink-700 bg-ink-900 lift-lg p-8 backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-extrabold text-white">
              V
            </span>
            <h1 className="font-display text-3xl font-bold">Staff sign in</h1>
            <p className="mt-2.5 text-sm text-mist-400">
              Stock, repair tickets and site content. Customers never see this area.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <div className="relative">
                <User size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
                <input
                  id="username"
                  className="field pl-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
                <input
                  id="password"
                  type="password"
                  className="field pl-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-danger/35 bg-danger/10 p-3.5 text-sm text-danger"
                role="alert"
              >
                <ShieldAlert size={16} className="shrink-0" />
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <LogIn size={18} />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-mist-500">
          Default credentials are set from the <code className="text-mist-400">ADMIN_USERNAME</code> /{' '}
          <code className="text-mist-400">ADMIN_PASSWORD</code> environment variables in{' '}
          <code className="text-mist-400">docker-compose.yml</code>.
        </p>
      </motion.div>
    </div>
  )
}
