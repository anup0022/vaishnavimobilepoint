/*
 * The public catalogue deliberately never reveals stock_qty. Shoppers see a
 * coarse availability label; the real numbers stay behind the admin login.
 * Shared by the JSON API (routes/public.js), the HTML the server renders
 * (prerender.js) and the structured data (seo.js), so all three agree.
 */

export function availability(row) {
  if (row.stock_qty <= 0) return 'out_of_stock'
  if (row.stock_qty <= row.low_stock) return 'low_stock'
  return 'in_stock'
}

export const AVAILABILITY_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
}

export const CATEGORY_LABELS = {
  smartphone: 'Smartphones',
  tablet: 'Tablets',
  wearable: 'Smartwatches',
  audio: 'Audio',
  accessory: 'Accessories',
}

export function safeJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

/**
 * Up to four others from the same category, closest in price first. Sorting
 * by "featured" alone showed the same four phones under every phone, so a
 * ₹13,000 handset suggested ₹1.3 lakh flagships.
 */
export function relatedProducts(db, row) {
  return db
    .prepare('SELECT * FROM products WHERE category = ? AND id != ? AND active = 1 ORDER BY ABS(price - ?) ASC, featured DESC LIMIT 4')
    .all(row.category, row.id, row.price)
}

/** Percentage off MRP, as the storefront shows it. */
export function discount(row) {
  return row.mrp > row.price ? Math.round(((row.mrp - row.price) / row.mrp) * 100) : 0
}

/**
 * The demo seed pointed products at Unsplash photographs of other devices.
 * Those are not pictures of the product, so they are never offered as one
 * (client/src/components/ProductPhoto.tsx makes the same call).
 */
export function hasRealPhoto(row) {
  return Boolean(row.image_url) && !String(row.image_url).startsWith('https://images.unsplash.com/')
}
