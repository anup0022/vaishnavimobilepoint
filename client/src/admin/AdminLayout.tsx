import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Boxes, Wrench, Star, Mail, Settings as SettingsIcon,
  LogOut, Menu, X, ExternalLink, ShieldCheck,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useToast } from '@/components/Toast'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/stock', label: 'Stock & Catalogue', icon: Boxes },
  { to: '/admin/bookings', label: 'Repair Tickets', icon: Wrench },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/messages', label: 'Inbox', icon: Mail },
  { to: '/admin/settings', label: 'Site Content', icon: SettingsIcon },
]

interface User {
  username: string
  name: string
  role: string
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    api
      .get<{ user: User }>('/api/admin/me')
      .then((d) => setUser(d.user))
      .catch((e: ApiError) => {
        if (e.status === 401) navigate('/admin/login', { replace: true, state: { from: location.pathname } })
      })
      .finally(() => setChecking(false))
    // Re-checked on navigation so an expired session bounces to the login.
  }, [navigate, location.pathname])

  useEffect(() => setDrawer(false), [location.pathname])

  async function logout() {
    await api.post('/api/admin/logout').catch(() => {})
    toast.push('Signed out.', 'info')
    navigate('/admin/login', { replace: true })
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-5">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-ink-700 border-t-brand-600" />
          <p className="text-sm text-mist-500">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-700 bg-ink-900 lg:flex">
        <SidebarContent user={user} onLogout={logout} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-[150] bg-mist-50/40 backdrop-blur lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[160] flex w-64 flex-col border-r border-ink-700 bg-ink-900 lg:hidden"
            >
              <SidebarContent user={user} onLogout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[100] flex items-center justify-between gap-4 border-b border-ink-700 bg-ink-900 lift-lg px-4 py-3.5 backdrop-blur sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 lg:hidden"
            aria-label="Open admin menu"
          >
            <Menu size={19} />
          </button>

          <div className="hidden text-sm text-mist-400 lg:block">
            Signed in as <span className="font-semibold text-mist-50">{user.name}</span>
            <span className="ml-2 chip border border-brand-700/30 bg-brand-600/10 text-brand-700">{user.role}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-2 text-sm text-mist-300 transition hover:text-mist-50"
            >
              <ExternalLink size={15} /> <span className="hidden sm:inline">View site</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-2 text-sm text-mist-300 transition hover:border-danger/40 hover:text-danger"
            >
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-ink-700 px-5 py-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white">
          V
        </span>
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-bold">Vaishnavi CMS</div>
          <div className="flex items-center gap-1 text-[11px] text-mist-500">
            <ShieldCheck size={11} /> Staff only
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600/20 text-mist-50'
                  : 'text-mist-400 hover:bg-ink-800 hover:text-mist-50'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-700 p-3">
        <div className="mb-2 px-3.5 text-xs text-mist-500">
          {user.name} &middot; @{user.username}
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mist-400 transition hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  )
}

/** Shared page header for the admin screens. */
export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-mist-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export { X }
