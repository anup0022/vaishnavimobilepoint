/**
 * Keeps the tab title and description right as people move between pages.
 *
 * The server stamps the correct title and description into the HTML for the
 * first load, which is also what search engines read. After that the router
 * swaps pages without a reload, so the same copy is applied here — read from
 * the data block the server wrote into the page (#vmp-meta), so the wording
 * lives in one place: server/seo.js.
 */
interface PageCopy {
  title: string
  description: string
}

interface MetaConfig {
  pages?: Record<string, PageCopy>
  /** "{name} in Ranchi | Shop" */
  product?: string
  /** "{name}{price} from Shop, Ratu Road, Ranchi. {description}" */
  productDescription?: string
  notFound?: PageCopy
  analytics?: string
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** Cuts to snippet length on a word boundary, as server/seo.js does. */
function clip(text: string, max = 155): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function readConfig(): MetaConfig {
  try {
    return JSON.parse(document.getElementById('vmp-meta')?.textContent || '{}') as MetaConfig
  } catch {
    return {}
  }
}

// Absent under the Vite dev server, which serves index.html unstamped; every
// function below is then a no-op and the default title stays.
const config: MetaConfig = typeof document === 'undefined' ? {} : readConfig()

export const analyticsId = config.analytics

function apply(copy: PageCopy | undefined) {
  if (!copy) return
  document.title = copy.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
}

/** A static page by path; anything unknown gets the not-found copy. */
export function applyPageMeta(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  apply(config.pages?.[path] ?? config.notFound)
}

/**
 * The same title and description the server wrote for this product, so
 * moving between products in the app keeps the price and the shop's
 * location in the snippet instead of a bare cut of the blurb. Function
 * replacements, because a "$&" in a product's text must stay literal.
 */
export function applyProductMeta(product: { name: string; description: string; price: number }) {
  if (!config.product) return
  const price = product.price > 0 ? ` at ${inr.format(product.price)}` : ''
  const template = config.productDescription ?? '{name}{price}. {description}'
  apply({
    title: config.product.replace('{name}', () => product.name),
    description: clip(
      template
        .replace('{name}', () => product.name)
        .replace('{price}', () => price)
        .replace('{description}', () => product.description),
    ),
  })
}

export function applyNotFoundMeta() {
  apply(config.notFound)
}
