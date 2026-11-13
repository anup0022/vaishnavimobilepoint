import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * Copy that both the storefront and the server need: the repair services
 * with their published prices, the FAQ and the shop's story. It lives with
 * the client source (client/src/data) because Vite bundles it from there; the
 * runtime image copies that one folder in as well (see Dockerfile), so the
 * server writes the same words into the HTML it sends and into the
 * structured data. Change a price in services.json and both follow.
 */
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'src', 'data')

function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'))
  } catch (err) {
    // The pages still render without it; only the server-side copy is missing.
    console.warn(`[content] ${name} could not be read: ${err.message}`)
    return fallback
  }
}

export const SERVICES = load('services.json', [])
export const FAQS = load('faqs.json', [])
export const ABOUT = load('about.json', { timeline: [], values: [] })
