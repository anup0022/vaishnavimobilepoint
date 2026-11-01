export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })

  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/* ----------------------------- shared types ----------------------------- */

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Product {
  id: number
  sku: string
  slug: string
  name: string
  brand: string
  category: string
  description: string
  price: number
  mrp: number
  discount: number
  image_url: string
  specs: string[]
  featured: boolean
  availability: Availability
  /** Present only on admin responses. */
  stock_qty?: number
  low_stock?: number
  active?: boolean
}

export interface Review {
  id: number
  name: string
  city: string
  rating: number
  title: string
  message: string
  avatar_url: string
  service: string
  approved?: number
  created_at: string
}

export interface Booking {
  id: number
  ticket: string
  customer_name: string
  phone: string
  email: string
  device_brand: string
  device_model: string
  imei: string
  issue_type: string
  issue_desc: string
  status: string
  estimate_amount: number
  final_amount: number
  technician: string
  created_at: string
  updated_at: string
}

export interface BookingUpdate {
  id?: number
  status: string
  note: string
  created_at: string
}

export type Settings = Record<string, string>
