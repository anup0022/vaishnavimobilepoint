import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Pencil, Trash2, History, PackagePlus, PackageMinus, Upload, Save, AlertTriangle, Scale,
} from 'lucide-react'
import { api, ApiError, type Product } from '@/lib/api'
import { money, formatDateTime, CATEGORY_LABELS } from '@/lib/format'
import { useToast } from '@/components/Toast'
import SmartImage from '@/components/SmartImage'
import Modal from '@/components/Modal'
import { AdminHeader } from './AdminLayout'

const CATEGORIES = ['smartphone', 'tablet', 'wearable', 'audio', 'accessory']

interface Movement {
  id: number
  kind: string
  qty: number
  balance: number
  note: string
  actor: string
  created_at: string
  product_name: string
  sku: string
}

const BLANK = {
  name: '', brand: '', category: 'smartphone', sku: '', description: '',
  price: 0, mrp: 0, stock_qty: 0, low_stock: 3, image_url: '',
  specs: '', featured: false, active: true,
}
type Draft = typeof BLANK & { id?: number }

export default function Stock() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [moving, setMoving] = useState<Product | null>(null)
  const [historyFor, setHistoryFor] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)

  function load() {
    setLoading(true)
    api
      .get<{ products: Product[] }>(`/api/admin/products${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      .then((d) => setProducts(d.products))
      .catch((e: ApiError) => toast.push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 320 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function remove(product: Product) {
    try {
      const r = await api.del<{ message: string }>(`/api/admin/products/${product.id}`)
      toast.push(r.message, 'success')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Delete failed.', 'error')
    }
  }

  /** One-tap +1 / −1 from the table for quick counter sales. */
  async function quickMove(product: Product, kind: 'in' | 'out') {
    try {
      const r = await api.post<{ message: string }>(`/api/admin/products/${product.id}/stock`, {
        kind,
        qty: 1,
        note: kind === 'in' ? 'Quick add from stock list' : 'Quick sale from stock list',
      })
      toast.push(r.message, 'success')
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not update stock.', 'error')
    }
  }

  const lowCount = products.filter((p) => (p.stock_qty ?? 0) <= (p.low_stock ?? 0)).length

  return (
    <div>
      <AdminHeader
        title="Stock & catalogue"
        subtitle="These numbers drive the website. Customers only ever see In stock / Only a few left / Out of stock — never the count."
        action={
          <button onClick={() => setEditing({ ...BLANK })} className="btn-primary px-5 py-2.5 text-sm">
            <Plus size={17} /> Add item
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[260px] flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input
            className="field pl-11"
            placeholder="Search by name, SKU or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 text-sm">
          <span className="chip border border-ink-600 bg-ink-800 text-mist-300">{products.length} items</span>
          {lowCount > 0 && (
            <span className="chip border border-danger/40 bg-danger/10 text-danger">
              <AlertTriangle size={12} /> {lowCount} low
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-20 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-600 py-20 text-center">
          <p className="text-mist-400">No items match that search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-900 text-left text-xs uppercase tracking-wider text-mist-500">
                  <th className="px-5 py-4 font-semibold">Item</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="px-5 py-4 text-center font-semibold">In stock</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => {
                  const qty = product.stock_qty ?? 0
                  const low = qty <= (product.low_stock ?? 0)
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-ink-700 bg-ink-850 transition hover:bg-ink-800"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <SmartImage
                            src={product.image_url}
                            alt=""
                            seed={product.sku}
                            className="h-12 w-12 shrink-0 rounded-xl border border-ink-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold">{product.name}</span>
                              {product.featured && (
                                <span className="chip border border-warn/40 bg-warn/10 text-[10px] text-warn">
                                  Popular
                                </span>
                              )}
                              {!product.active && (
                                <span className="chip border border-ink-600 bg-ink-800 text-[10px] text-mist-400">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-mist-500">
                              {product.sku} &middot; {product.brand}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize text-mist-300">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{money(product.price)}</div>
                        {product.mrp > product.price && (
                          <div className="text-xs text-mist-500 line-through">{money(product.mrp)}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => quickMove(product, 'out')}
                            disabled={qty === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-700 text-mist-400 transition hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                            title="Remove one (sale)"
                          >
                            <PackageMinus size={14} />
                          </button>
                          <span
                            className={`min-w-[52px] rounded-lg px-2 py-1 text-center font-display text-base font-bold ${ qty === 0 ? 'bg-danger/15 text-danger' : low ? 'bg-warn/15 text-warn' : 'bg-success/10 text-success' }`}
                          >
                            {qty}
                          </span>
                          <button
                            onClick={() => quickMove(product, 'in')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-700 text-mist-400 transition hover:border-success/50 hover:text-success"
                            title="Add one (received)"
                          >
                            <PackagePlus size={14} />
                          </button>
                        </div>
                        <div className="mt-1 text-center text-[11px] text-mist-500">alert at {product.low_stock}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton title="Record movement" onClick={() => setMoving(product)}>
                            <Scale size={15} />
                          </IconButton>
                          <IconButton title="Movement history" onClick={() => setHistoryFor(product)}>
                            <History size={15} />
                          </IconButton>
                          <IconButton
                            title="Edit item"
                            onClick={() =>
                              setEditing({
                                id: product.id,
                                name: product.name,
                                brand: product.brand,
                                category: product.category,
                                sku: product.sku,
                                description: product.description,
                                price: product.price,
                                mrp: product.mrp,
                                stock_qty: product.stock_qty ?? 0,
                                low_stock: product.low_stock ?? 3,
                                image_url: product.image_url,
                                specs: (product.specs || []).join('\n'),
                                featured: !!product.featured,
                                active: product.active !== false,
                              })
                            }
                          >
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton title="Delete item" danger onClick={() => setConfirmDelete(product)}>
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editing && <ProductModal draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
        {moving && <MovementModal product={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); load() }} />}
        {historyFor && <HistoryModal product={historyFor} onClose={() => setHistoryFor(null)} />}
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)} title="Delete this item?">
            <p className="text-sm leading-relaxed text-mist-300">
              <span className="font-semibold text-mist-50">{confirmDelete.name}</span> and its entire movement history
              will be removed permanently. This cannot be undone.
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-5 py-2.5 text-sm">
                Keep it
              </button>
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

function IconButton({
  children, onClick, title, danger,
}: {
  children: React.ReactNode; onClick: () => void; title: string; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-mist-400 transition ${ danger ? 'hover:border-danger/50 hover:text-danger' : 'hover:border-brand-700/50 hover:text-mist-50' }`}
    >
      {children}
    </button>
  )
}

function ProductModal({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Draft>(draft)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function upload(file: File) {
    setUploading(true)
    const body = new FormData()
    body.append('image', file)
    try {
      const r = await api.post<{ url: string }>('/api/admin/upload', body)
      set('image_url', r.url)
      toast.push('Photo uploaded.', 'success')
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const payload = { ...form, specs: form.specs }
    try {
      const r = form.id
        ? await api.put<{ message: string }>(`/api/admin/products/${form.id}`, payload)
        : await api.post<{ message: string }>('/api/admin/products', payload)
      toast.push(r.message, 'success')
      onSaved()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={form.id ? 'Edit item' : 'Add a new item'} wide>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Item name *</label>
            <input className="field" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Samsung Galaxy S24 Ultra 5G" />
          </div>
          <div>
            <label className="label">Brand *</label>
            <input className="field" required value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Samsung" />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="field" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Selling price (₹) *</label>
            <input type="number" min={0} step={1} className="field" required value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">MRP (₹)</label>
            <input type="number" min={0} step={1} className="field" value={form.mrp} onChange={(e) => set('mrp', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{form.id ? 'Stock quantity' : 'Opening stock'}</label>
            <input type="number" min={0} className="field" value={form.stock_qty} onChange={(e) => set('stock_qty', Number(e.target.value))} />
            {form.id && <p className="mt-1.5 text-xs text-mist-500">Changing this logs an adjustment.</p>}
          </div>
          <div>
            <label className="label">Low-stock alert at</label>
            <input type="number" min={0} className="field" value={form.low_stock} onChange={(e) => set('low_stock', Number(e.target.value))} />
          </div>
          {!form.id && (
            <div className="sm:col-span-2">
              <label className="label">SKU (leave blank to generate)</label>
              <input className="field" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="VMS-SMA-025" />
            </div>
          )}
        </div>

        <div>
          <label className="label">Photo</label>
          <div className="flex flex-wrap items-center gap-4">
            {form.image_url ? (
              <SmartImage src={form.image_url} alt="" seed={form.sku} className="h-20 w-20 rounded-2xl border border-ink-700" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-ink-600 text-mist-500">
                <Upload size={20} />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                className="field"
                value={form.image_url}
                onChange={(e) => set('image_url', e.target.value)}
                placeholder="Paste an image URL, or upload a file"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-ghost px-4 py-2 text-xs"
              >
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload a photo'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="field min-h-24 resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="How you would describe it to a customer at the counter." />
        </div>

        <div>
          <label className="label">Specifications (one per line)</label>
          <textarea className="field min-h-28 resize-y font-mono text-xs" value={form.specs} onChange={(e) => set('specs', e.target.value)} placeholder={'6.8" QHD+ AMOLED\n200MP main camera\n5000mAh, 45W'} />
        </div>

        <div className="flex flex-wrap gap-6 border-t border-ink-700 pt-5">
          <Toggle label="Show as Popular" checked={form.featured} onChange={(v) => set('featured', v)} />
          <Toggle label="Visible on the website" checked={form.active} onChange={(v) => set('active', v)} />
        </div>

        <div className="flex justify-end gap-3 border-t border-ink-700 pt-6">
          <button type="button" onClick={onClose} className="btn-ghost px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
            <Save size={16} /> {saving ? 'Saving…' : form.id ? 'Save changes' : 'Add to stock'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${ checked ? 'bg-brand-600' : 'bg-ink-600' }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white"
          style={{ left: checked ? 22 : 2 }}
        />
      </button>
      <span className="text-sm text-mist-300">{label}</span>
    </label>
  )
}

function MovementModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [kind, setKind] = useState<'in' | 'out' | 'adjust'>('in')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const current = product.stock_qty ?? 0
  const projected = kind === 'adjust' ? qty : kind === 'in' ? current + qty : current - qty

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const r = await api.post<{ message: string }>(`/api/admin/products/${product.id}/stock`, { kind, qty, note })
      toast.push(r.message, 'success')
      onSaved()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not record that.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const OPTIONS = [
    { value: 'in', label: 'Stock in', hint: 'New delivery received', icon: PackagePlus },
    { value: 'out', label: 'Stock out', hint: 'Sold or issued', icon: PackageMinus },
    { value: 'adjust', label: 'Set count', hint: 'Physical count correction', icon: Scale },
  ] as const

  return (
    <Modal onClose={onClose} title="Record a stock movement">
      <p className="mb-6 text-sm text-mist-400">
        <span className="font-semibold text-mist-50">{product.name}</span> &middot; currently{' '}
        <span className="font-semibold text-mist-50">{current}</span> in stock
      </p>

      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setKind(opt.value)}
              className={`rounded-2xl border p-4 text-left transition ${ kind === opt.value ? 'border-brand-700 bg-brand-600/15' : 'border-ink-700 bg-ink-800 hover:border-ink-500' }`}
            >
              <opt.icon size={18} className={kind === opt.value ? 'text-brand-700' : 'text-mist-400'} />
              <div className="mt-2 text-sm font-semibold">{opt.label}</div>
              <div className="text-[11px] text-mist-500">{opt.hint}</div>
            </button>
          ))}
        </div>

        <div>
          <label className="label">{kind === 'adjust' ? 'Counted quantity' : 'Quantity'}</label>
          <input
            type="number"
            min={kind === 'adjust' ? 0 : 1}
            className="field font-display text-2xl font-bold"
            value={qty}
            onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
            required
          />
        </div>

        <div
          className={`rounded-2xl border p-4 text-sm ${ projected < 0 ? 'border-danger/40 bg-danger/10 text-danger' : 'border-ink-700 bg-ink-800 text-mist-300' }`}
        >
          New balance will be <span className="font-display text-lg font-bold">{Math.max(0, projected)}</span>
          {projected < 0 && ' — that is more than you have in stock.'}
        </div>

        <div>
          <label className="label">Note</label>
          <input
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Invoice 2241 from Kolkata distributor"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-ink-700 pt-6">
          <button type="button" onClick={onClose} className="btn-ghost px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving || projected < 0} className="btn-primary px-5 py-2.5 text-sm">
            <Save size={16} /> {saving ? 'Saving…' : 'Record movement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [movements, setMovements] = useState<Movement[] | null>(null)

  useEffect(() => {
    api
      .get<{ movements: Movement[] }>(`/api/admin/stock-movements?product_id=${product.id}`)
      .then((d) => setMovements(d.movements))
      .catch(() => setMovements([]))
  }, [product.id])

  return (
    <Modal onClose={onClose} title="Movement history" wide>
      <p className="mb-6 text-sm text-mist-400">{product.name}</p>

      {!movements ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-2xl" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <p className="py-10 text-center text-sm text-mist-500">No movements recorded yet.</p>
      ) : (
        <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
          {movements.map((move) => (
            <div key={move.id} className="flex items-center gap-4 rounded-2xl border border-ink-700 bg-ink-850 lift p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${ move.qty > 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger' }`}
              >
                {move.qty > 0 ? '+' : ''}{move.qty}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-mist-200">{move.note}</div>
                <div className="text-xs text-mist-500">
                  {formatDateTime(move.created_at)} &middot; by {move.actor} &middot; {move.kind}
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-ink-800 px-3 py-1.5 font-display text-sm font-bold">
                {move.balance}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
