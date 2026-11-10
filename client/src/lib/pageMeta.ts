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
  notFound?: PageCopy
  analytics?: string
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

export function applyProductMeta(name: string, description: string) {
  if (!config.product) return
  apply({
    title: config.product.replace('{name}', name),
    description: description.replace(/\s+/g, ' ').trim().slice(0, 155),
  })
}

export function applyNotFoundMeta() {
  apply(config.notFound)
}
