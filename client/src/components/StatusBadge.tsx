import { PackageCheck, Search, Clock, Wrench, BellRing, CheckCheck, XCircle } from 'lucide-react'

export const STATUS_META: Record<
  string,
  { label: string; icon: typeof Wrench; chip: string; dot: string }
> = {
  received: { label: 'Device Received', icon: PackageCheck, chip: 'border-brand-500/40 bg-brand-500/10 text-brand-600', dot: 'bg-brand-500' },
  diagnosing: { label: 'Diagnosis in Progress', icon: Search, chip: 'border-brand-700/40 bg-brand-600/10 text-brand-700', dot: 'bg-brand-600' },
  awaiting_parts: { label: 'Awaiting Spare Parts', icon: Clock, chip: 'border-warn/40 bg-warn/10 text-warn', dot: 'bg-warn' },
  repairing: { label: 'Repair in Progress', icon: Wrench, chip: 'border-warn/40 bg-warn/10 text-warn', dot: 'bg-warn' },
  ready: { label: 'Ready for Pickup', icon: BellRing, chip: 'border-success/40 bg-success/10 text-success', dot: 'bg-success' },
  delivered: { label: 'Delivered', icon: CheckCheck, chip: 'border-success/40 bg-success/10 text-success', dot: 'bg-success' },
  cancelled: { label: 'Cancelled', icon: XCircle, chip: 'border-danger/40 bg-danger/10 text-danger', dot: 'bg-danger' },
}

export default function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status] ?? STATUS_META.received
  const Icon = meta.icon
  return (
    <span className={`chip border ${meta.chip} ${size === 'sm' ? 'text-[11px]' : ''}`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      {meta.label}
    </span>
  )
}
