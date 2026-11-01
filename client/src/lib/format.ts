const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function money(value: number | string | undefined | null): string {
  const n = Number(value)
  return inr.format(Number.isFinite(n) ? n : 0)
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** SQLite stores naive UTC strings; make them explicit before parsing. */
function toDate(value: string): Date {
  if (!value) return new Date(NaN)
  const normalised = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  return new Date(normalised)
}

export function formatDate(value: string): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function timeAgo(value: string): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(value)
}

export const CATEGORY_LABELS: Record<string, string> = {
  smartphone: 'Smartphones',
  tablet: 'Tablets',
  wearable: 'Smartwatches',
  audio: 'Audio',
  accessory: 'Accessories',
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
}
