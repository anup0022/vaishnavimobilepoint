import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Store, MapPin, Clock, Megaphone, BarChart3, Share2, FileText, KeyRound } from 'lucide-react'
import { api, ApiError, type Settings } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useSettingsReload } from '@/lib/useSettings'
import { AdminHeader } from './AdminLayout'

type Field = { key: string; label: string; hint?: string; type?: 'text' | 'textarea' | 'number' }
type Group = { title: string; icon: typeof Store; fields: Field[] }

const GROUPS: Group[] = [
  {
    title: 'Shop identity',
    icon: Store,
    fields: [
      { key: 'shop_name', label: 'Shop name' },
      { key: 'shop_name_local', label: 'Shop name (Hindi)' },
      { key: 'tagline', label: 'Tagline' },
      { key: 'established', label: 'Established (year)' },
      { key: 'gst', label: 'GSTIN' },
    ],
  },
  {
    title: 'Home page',
    icon: FileText,
    fields: [
      {
        key: 'hero_sub',
        label: 'Home page intro',
        hint: 'One or two sentences under the main heading: what you sell, where you are, since when. Search engines read it too.',
        type: 'textarea',
      },
      { key: 'hero_heading', label: 'Hero heading', hint: 'Not shown by the current home page design.' },
    ],
  },
  {
    title: 'Announcement bar',
    icon: Megaphone,
    fields: [
      {
        key: 'announcement',
        label: 'Announcement text',
        hint: 'Shown as the coloured strip above the menu. Leave blank to hide the strip entirely.',
        type: 'textarea',
      },
    ],
  },
  {
    title: 'Contact details',
    icon: MapPin,
    fields: [
      { key: 'phone_primary', label: 'Primary phone' },
      { key: 'phone_secondary', label: 'Secondary phone' },
      { key: 'whatsapp', label: 'WhatsApp number', hint: 'Digits only with country code, e.g. 919835012345' },
      { key: 'email', label: 'Email' },
      { key: 'address_line1', label: 'Address line 1' },
      { key: 'address_line2', label: 'Address line 2' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'PIN code' },
      { key: 'map_query', label: 'Google Maps search term', hint: 'Fallback only — the coordinates below are used when they are set.' },
      { key: 'latitude', label: 'Latitude', hint: 'Drops the map pin exactly on the shop.' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'plus_code', label: 'Google Plus Code' },
      {
        key: 'google_place_id',
        label: 'Google place ID',
        hint: 'Your Google Business Profile’s ID (starts with ChIJ). Turns on "Review us on Google" and points Directions at your listing.',
      },
    ],
  },
  {
    title: 'Opening hours',
    icon: Clock,
    fields: [
      { key: 'hours_weekday', label: 'Monday to Saturday' },
      { key: 'hours_sunday', label: 'Sunday' },
      { key: 'closed_day', label: 'Closing note', hint: 'e.g. "Open all 7 days" or "Closed on Tuesdays"' },
    ],
  },
  {
    title: 'About page',
    icon: FileText,
    fields: [
      { key: 'about_lead', label: 'Opening line', type: 'textarea' },
      { key: 'about_body', label: 'Main paragraph', type: 'textarea' },
    ],
  },
  {
    title: 'Headline numbers',
    icon: BarChart3,
    fields: [
      { key: 'stats_customers', label: 'Customers served', type: 'number' },
      { key: 'stats_repairs', label: 'Devices repaired', type: 'number' },
      { key: 'stats_brands', label: 'Brands stocked', type: 'number' },
      { key: 'stats_years', label: 'Years in business', type: 'number' },
    ],
  },
  {
    title: 'Social links',
    icon: Share2,
    fields: [
      { key: 'social_facebook', label: 'Facebook URL' },
      { key: 'social_instagram', label: 'Instagram URL' },
      { key: 'social_youtube', label: 'YouTube URL' },
    ],
  },
]

export default function SiteSettings() {
  const toast = useToast()
  const reloadPublicSettings = useSettingsReload()
  const [values, setValues] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    api
      .get<Settings>('/api/admin/settings')
      .then(setValues)
      .catch((e: ApiError) => toast.push(e.message, 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const r = await api.put<{ message: string }>('/api/admin/settings', values)
      toast.push(r.message, 'success')
      setDirty(false)
      reloadPublicSettings()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-52 rounded-3xl" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={save}>
      <AdminHeader
        title="Site content"
        subtitle="Edit the text and details shown across the public website. Changes go live as soon as you save."
        action={
          <button type="submit" disabled={saving || !dirty} className="btn-primary px-5 py-2.5 text-sm">
            <Save size={16} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        }
      />

      <div className="space-y-5">
        {GROUPS.map((group, gi) => (
          <motion.section
            key={group.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
            className="rounded-3xl border border-ink-700 bg-ink-900 lift p-7"
          >
            <h2 className="mb-6 flex items-center gap-2.5 font-display text-lg font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 text-brand-700">
                <group.icon size={17} />
              </span>
              {group.title}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="label" htmlFor={field.key}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      className="field min-h-24 resize-y"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type === 'number' ? 'number' : 'text'}
                      className="field"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                  {field.hint && <p className="mt-1.5 text-xs text-mist-500">{field.hint}</p>}
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <PasswordCard />

      <div className="sticky bottom-4 mt-8 flex justify-end">
        <button type="submit" disabled={saving || !dirty} className="btn-primary px-6 py-3 shadow-2xl">
          <Save size={17} /> {saving ? 'Saving…' : dirty ? 'Save all changes' : 'Everything saved'}
        </button>
      </div>
    </form>
  )
}

/** Separate form so it never submits along with the content fields. */
function PasswordCard() {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)

  async function change() {
    setBusy(true)
    try {
      const r = await api.post<{ message: string }>('/api/admin/password', { current, next })
      toast.push(r.message, 'success')
      setCurrent('')
      setNext('')
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not change the password.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-ink-700 bg-ink-900 lift p-7">
      <h2 className="mb-6 flex items-center gap-2.5 font-display text-lg font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn/15 text-warn">
          <KeyRound size={17} />
        </span>
        Change your password
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pw-current">Current password</label>
          <input
            id="pw-current" type="password" className="field" value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pw-next">New password</label>
          <input
            id="pw-next" type="password" className="field" value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-mist-500">At least 8 characters.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={change}
        disabled={busy || !current || next.length < 8}
        className="btn-ghost mt-6 px-5 py-2.5 text-sm"
      >
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </section>
  )
}
