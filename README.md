# Vaishnavi Mobile Point — website + stock CMS

A complete site for Vaishnavi Mobile Point (also listed as Vaishnavi Mobile Center),
Churi Centre Lane, opposite Galaxia Mall, Ratu Road, Sukhdeo Nagar, Ranchi 834005:
a public storefront for local visibility, online repair booking with live status
tracking, customer reviews, and a staff-only CMS for stock management.

Runs as a single Docker container on **http://localhost:8470**.

---

## Quick start

```bash
docker compose up --build
```

Then open:

| Area | URL |
| --- | --- |
| Storefront | http://localhost:8470 |
| Staff CMS | http://localhost:8470/admin |

Default staff login — `admin` / `Vaishnavi@2026`, set by the `ADMIN_USERNAME` and
`ADMIN_PASSWORD` variables in `docker-compose.yml`. **Change them before putting
this anywhere other than this machine**, along with `SESSION_SECRET`.

To stop: `docker compose down`. Your data survives, because SQLite and uploaded
photos live in the mounted `./data` and `./uploads` folders.

---

## Pages

**Public**

- `/` — snap-scrolling sections with a section rail: hero, categories, featured stock,
  a photo tour of the shop, services, how tracking works, reviews and the map
- `/products` — full catalogue with search, category/brand filters and sorting
- `/products/:slug` — product detail, specifications, call/WhatsApp to reserve
- `/services` — repair services with published price ranges, timings and warranty
- `/book` — three-step repair booking, protected by a CAPTCHA, issues a ticket number
- `/track` — repair status lookup, protected by a CAPTCHA
- `/feedback` — customer reviews with a rating breakdown, plus a review form
- `/contact` — contact cards, shop details, embedded map and a message form
- `/about` — shop story, timeline and values
- `/faq` — frequently asked questions

**Staff only (behind a login)**

- `/admin` — dashboard: stock value, low-stock alerts, open tickets, recent activity
- `/admin/stock` — add/edit/delete items, record stock in/out/count, movement history
- `/admin/bookings` — repair tickets, status changes, technician notes, estimates
- `/admin/reviews` — approve, unpublish or delete customer reviews
- `/admin/messages` — contact form inbox
- `/admin/settings` — edit site content (phone, address, hours, offer bar, copy)

---

## How stock stays private

Stock figures are never sent to the public site. `/api/products` returns only an
`availability` label — `in_stock`, `low_stock` or `out_of_stock` — computed on the
server. The exact count exists only behind `/api/admin/*`, which requires a signed
session cookie. The CMS is not linked from the main navigation; the only way in is
the small "Staff Login" link in the footer, or the `/admin` URL.

## How repair tracking works

1. A booking creates a ticket such as `VMS-7K4PQ2` and a first timeline entry.
2. Staff move the ticket through `received → diagnosing → awaiting_parts →
   repairing → ready → delivered`, adding a note at each step.
3. The customer enters the ticket **and** the mobile number used at booking.
   Both must match, so a guessed ticket number alone reveals nothing.

## CAPTCHA

Booking, tracking, reviews and the contact form are each protected by a CAPTCHA
generated as an SVG on the server — no third-party service, nothing leaves the
machine. Each code is single-use and expires after 10 minutes. These endpoints are
also rate-limited per IP.

---

## Shop details and photos

The shop's own details live in the database and are editable from
**Site Content** in the CMS — nothing is hardcoded in the pages:

| Field | Value |
| --- | --- |
| Name | Vaishnavi Mobile Point (वैष्णवी मोबाइल पॉइंट) |
| Also listed as | Vaishnavi Mobile Center / Vaishnavi Dial Point |
| Address | Churi Centre Lane, opp Galaxia Mall, Ratu Road, Sukhdeo Nagar, Ranchi, Jharkhand 834005 |
| Coordinates | 23.3818672, 85.300538 |
| Plus Code | 98J2+P6 Ranchi |
| Phone | +91 91222 66808, +91 93040 47196 |
| Established | 2005 |

The maps use the coordinates rather than a text search, so the pin lands on the
shop itself. Clear latitude/longitude in the CMS to fall back to a name search.

`client/public/shop/` holds photographs of the actual shop, used in the hero, the
"Inside the shop" gallery, the About page and the Services banner. Replace any
file in that folder with a better photo of the same name and it is picked up on
the next build — no code change needed.

**Theme.** One light theme, defined entirely by the `ink-*` (surfaces) and
`mist-*` (type) scales at the top of `client/src/index.css`. Every component is
written against those two ramps, so the whole site re-themes from that block.

---

## Architecture

```
server/           Express API
  db.js           SQLite schema + demo seed data
  util.js         password hashing, session tokens, CAPTCHA, rate limiting
  routes/public.js  catalogue, bookings, tracking, reviews, contact
  routes/admin.js   auth + CRUD behind a session cookie
client/           React 19 + Vite + Tailwind v4 + Framer Motion
Dockerfile        two stages: build the client, then a slim runtime image
```

**No native dependencies.** Storage uses Node 24's built-in `node:sqlite`, and
password hashing and session signing use `node:crypto` (scrypt and HMAC), so the
image builds without a compiler toolchain.

### Seed data

On first run an empty database is filled with 24 catalogue items, 12 approved
reviews and 4 repair tickets at different stages, so every screen has something to
show. To start over, stop the container and delete `data/vaishnavi.sqlite`.

---

## Running without Docker

Requires Node 22.5+ (24 recommended).

```bash
npm install
npm run build:client
PORT=8470 npm start
```

For client development with hot reload, run the API on 8470 and in another shell:

```bash
npm --prefix client run dev     # http://localhost:5190, proxies /api to 8470
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8470` | HTTP port |
| `SESSION_SECRET` | dev value | Signs the staff session cookie |
| `ADMIN_USERNAME` | `admin` | Created on first run only |
| `ADMIN_PASSWORD` | `Vaishnavi@2026` | Created on first run only |
| `ADMIN_NAME` | `Store Owner` | Display name in the CMS |
| `DATA_DIR` | `./data` | Where the SQLite file lives |
| `UPLOAD_DIR` | `./uploads` | Where uploaded product photos land |

Changing `ADMIN_PASSWORD` after first run does nothing — the user already exists.
Change it from **Site Content → Change your password** in the CMS, or delete the
database to re-seed.
