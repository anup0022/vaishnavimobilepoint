import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, MailOpen, Trash2, Phone, Check } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useToast } from '@/components/Toast'
import Modal from '@/components/Modal'
import { AdminHeader } from './AdminLayout'

interface Message {
  id: number
  name: string
  phone: string
  email: string
  subject: string
  message: string
  handled: number
  created_at: string
}

export default function Messages() {
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'unread' | 'all'>('unread')
  const [confirmDelete, setConfirmDelete] = useState<Message | null>(null)

  function load() {
    setLoading(true)
    api
      .get<{ messages: Message[] }>('/api/admin/messages')
      .then((d) => setMessages(d.messages))
      .catch((e: ApiError) => toast.push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function setHandled(message: Message, handled: boolean) {
    try {
      await api.patch(`/api/admin/messages/${message.id}`, { handled })
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not update.', 'error')
    }
  }

  async function remove(message: Message) {
    try {
      const r = await api.del<{ message: string }>(`/api/admin/messages/${message.id}`)
      toast.push(r.message, 'success')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Delete failed.', 'error')
    }
  }

  const unread = messages.filter((m) => !m.handled)
  const shown = tab === 'unread' ? unread : messages

  return (
    <div>
      <AdminHeader title="Inbox" subtitle="Messages sent from the Contact page." />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: 'unread' as const, label: `Unread (${unread.length})` },
          { value: 'all' as const, label: `All (${messages.length})` },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${ tab === t.value ? 'bg-brand-600 text-white' : 'border border-ink-700 bg-ink-800 text-mist-400 hover:text-mist-50' }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-36 rounded-3xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-600 py-20 text-center">
          <MailOpen size={38} className="mx-auto mb-4 text-mist-500" />
          <p className="text-mist-400">{tab === 'unread' ? 'No unread messages.' : 'No messages yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((message, i) => (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className={`rounded-3xl border p-6 ${ message.handled ? 'border-ink-700 bg-ink-900 lift' : 'border-brand-500/30 bg-brand-500/5' }`}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-lg font-bold">{message.subject}</h3>
                    {!message.handled && (
                      <span className="chip border border-brand-500/40 bg-brand-500/10 text-brand-600">
                        <Mail size={11} /> New
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-sm text-mist-400">
                    From <span className="font-semibold text-mist-200">{message.name}</span> &middot;{' '}
                    {formatDateTime(message.created_at)}
                  </div>
                </div>

                <div className="flex gap-2">
                  {message.phone && (
                    <a
                      href={`tel:${message.phone}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-mist-400 transition hover:border-success/50 hover:text-success"
                      aria-label="Call"
                    >
                      <Phone size={15} />
                    </a>
                  )}
                  {message.email && (
                    <a
                      href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-mist-400 transition hover:border-brand-600/50 hover:text-brand-700"
                      aria-label="Reply by email"
                    >
                      <Mail size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => setConfirmDelete(message)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-mist-400 transition hover:border-danger/50 hover:text-danger"
                    aria-label="Delete message"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-mist-300">{message.message}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-4 text-sm">
                <div className="flex flex-wrap gap-4 text-mist-400">
                  {message.phone && <span>{message.phone}</span>}
                  {message.email && <span>{message.email}</span>}
                </div>
                <button
                  onClick={() => setHandled(message, !message.handled)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${ message.handled ? 'border-ink-700 text-mist-400 hover:text-mist-50' : 'border-success/40 bg-success/10 text-success' }`}
                >
                  <Check size={14} /> {message.handled ? 'Mark unread' : 'Mark as handled'}
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)} title="Delete this message?">
            <p className="text-sm leading-relaxed text-mist-300">
              The message from <span className="font-semibold text-mist-50">{confirmDelete.name}</span> will be removed
              permanently.
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-5 py-2.5 text-sm">Keep it</button>
              <button
                onClick={() => remove(confirmDelete)}
                className="rounded-[0.7rem] bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/90"
              >
                Delete permanently
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
