import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { hashPassword, slugify, ticketCode } from './util.js'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(path.join(DATA_DIR, 'vaishnavi.sqlite'))

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
// Litestream checkpoints the WAL from its own connection; wait for it
// rather than failing a request with SQLITE_BUSY.
db.exec('PRAGMA busy_timeout = 5000')

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       REAL NOT NULL DEFAULT 0,
  mrp         REAL NOT NULL DEFAULT 0,
  stock_qty   INTEGER NOT NULL DEFAULT 0,
  low_stock   INTEGER NOT NULL DEFAULT 3,
  image_url   TEXT NOT NULL DEFAULT '',
  specs       TEXT NOT NULL DEFAULT '[]',
  featured    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  qty        INTEGER NOT NULL,
  balance    INTEGER NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  actor      TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket          TEXT NOT NULL UNIQUE,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL DEFAULT '',
  device_brand    TEXT NOT NULL,
  device_model    TEXT NOT NULL,
  imei            TEXT NOT NULL DEFAULT '',
  issue_type      TEXT NOT NULL,
  issue_desc      TEXT NOT NULL DEFAULT '',
  preferred_date  TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'received',
  estimate_amount REAL NOT NULL DEFAULT 0,
  final_amount    REAL NOT NULL DEFAULT 0,
  technician      TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_updates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  city       TEXT NOT NULL DEFAULT 'Ranchi',
  rating     INTEGER NOT NULL DEFAULT 5,
  title      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  service    TEXT NOT NULL DEFAULT '',
  approved   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  handled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Product photos uploaded from the CMS. Kept in the database rather than a
-- folder, so the continuous backup that protects bookings (Litestream, see
-- vmp-entrypoint.sh) protects them too. Bytes are sniffed before insert.
CREATE TABLE IF NOT EXISTS uploads (
  name       TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone    ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_updates_booking   ON booking_updates(booking_id);
`)

/* ------------------------------------------------------------------ *
 * Settings helpers
 * ------------------------------------------------------------------ */

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row) return fallback
  try {
    return JSON.parse(row.value)
  } catch {
    return fallback
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, JSON.stringify(value))
}

export function allSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const out = {}
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value)
    } catch {
      out[row.key] = row.value
    }
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Seeding — runs once on an empty database.
 * ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  shop_name: 'Vaishnavi Mobile Point',
  tagline: 'Mobile Service Center — we deal in all kinds of mobile & accessories',
  hero_heading: 'Every phone you want. Every repair you need.',
  hero_sub:
    'Latest smartphones, genuine accessories and same-day repairs — in Churi Centre Gali, just off Ratu Road, Ranchi. Serving Ranchi since 2005.',
  phone_primary: '+91 91222 66808',
  phone_secondary: '+91 93040 47196',
  whatsapp: '919122266808',
  email: 'rajeev.9x@gmail.com',
  address_line1: 'Churi Centre Lane (Churi Centre Gali)',
  address_line2: 'Opp Galaxia Mall, Ratu Road, Sukhdeo Nagar',
  city: 'Ranchi',
  state: 'Jharkhand',
  pincode: '834005',
  map_query: 'Vaishnavi+Mobile+Point+Churi+Centre+Lane+Sukhdeo+Nagar+Ranchi',
  latitude: '23.3818672',
  longitude: '85.300538',
  hours_weekday: '10:00 AM – 9:00 PM',
  hours_sunday: '11:00 AM – 7:00 PM',
  closed_day: 'Open all 7 days',
  announcement: 'Festive offer — free tempered glass + 6-month screen protection on every new phone.',
  plus_code: '98J2+P6 Ranchi, Jharkhand',
  shop_name_local: 'वैष्णवी मोबाइल पॉइंट',
  gst: '20ABCDE1234F1Z5',
  established: '2005',
  about_lead:
    'What started as a single counter selling recharge coupons in 2005 is today one of the busiest mobile destinations on Ratu Road.',
  about_body:
    'Vaishnavi Mobile Point sells authorised stock from every major brand, and our in-house service bench handles everything from a cracked display to a dead motherboard. Each repair is logged against a ticket number so you can follow the progress from your phone, and every device leaves with a written warranty.',
  // Empty until the shop has these pages: a bare https://facebook.com/ told
  // search engines the shop *was* Facebook (schema.org sameAs).
  social_facebook: '',
  social_instagram: 'https://www.instagram.com/pointvaishnavimobile/',
  social_youtube: '',
  // The Google Business Profile's place ID: powers "Review us on Google" and
  // points Directions and the structured data at the listing itself. This
  // is the shop's claimed listing (same name, address, pin and plus code).
  google_place_id: 'ChIJ4VmjLcvh9DkRRQy08l85PIo',
  stats_customers: '24000',
  stats_repairs: '38500',
  stats_brands: '12',
  stats_years: '21',
}

const PRODUCTS = [
  ['Samsung Galaxy S24 Ultra 5G', 'Samsung', 'smartphone', 134999, 129999, 6, 'photo-1713027420493-e675245ea725',
    'Titanium frame, 200MP camera and the built-in S Pen. The flagship our customers trade up to most often.',
    ['6.8" QHD+ Dynamic AMOLED 2X', '200MP + 50MP + 12MP + 10MP', 'Snapdragon 8 Gen 3', '12GB / 256GB', '5000mAh, 45W'], 1],
  ['Apple iPhone 15 Pro', 'Apple', 'smartphone', 134900, 128900, 4, 'photo-1703133431079-8477009d42b2',
    'A17 Pro silicon in a titanium body, with the Action button and USB-C. Sealed box, Indian warranty.',
    ['6.1" Super Retina XDR', '48MP Main + Ultra Wide + Tele', 'A17 Pro chip', '128GB', 'USB-C, MagSafe'], 1],
  ['Apple iPhone 14', 'Apple', 'smartphone', 69900, 58999, 7, 'photo-1678652197831-2d180705cd2c',
    'Still the best value iPhone on our shelf — superb cameras and Crash Detection.',
    ['6.1" Super Retina XDR', '12MP dual camera', 'A15 Bionic', '128GB', 'Up to 20 hr video'], 0],
  ['OnePlus 12R 5G', 'OnePlus', 'smartphone', 45999, 39999, 9, 'photo-1673718424091-5fb734062c05',
    'Flagship-grade speed at a mid-range price, with 100W SUPERVOOC charging.',
    ['6.78" 120Hz LTPO AMOLED', '50MP Sony IMX890', 'Snapdragon 8 Gen 2', '8GB / 128GB', '5500mAh, 100W'], 1],
  ['Xiaomi Redmi Note 13 Pro 5G', 'Xiaomi', 'smartphone', 26999, 23999, 18, 'photo-1697981812520-d1e056308e52',
    'Our single best-selling handset. 200MP camera, curved AMOLED, built like a phone twice the price.',
    ['6.67" 120Hz AMOLED', '200MP OIS main camera', 'Snapdragon 7s Gen 2', '8GB / 256GB', '5100mAh, 67W'], 1],
  ['realme 12 Pro+ 5G', 'realme', 'smartphone', 32999, 29999, 11, 'photo-1592750475338-74b7b21085ab',
    'Periscope telephoto in a sub-30k phone, with a genuine leather-finish back.',
    ['6.7" 120Hz curved AMOLED', '64MP periscope zoom', 'Snapdragon 7s Gen 2', '8GB / 256GB', '5000mAh, 67W'], 0],
  ['vivo V30 Pro 5G', 'vivo', 'smartphone', 46999, 41999, 8, 'photo-1574944985070-8f3ebc6b79d2',
    'ZEISS portrait optics — the phone we recommend for wedding and event photography.',
    ['6.78" 120Hz AMOLED', 'ZEISS triple 50MP setup', 'Dimensity 8200', '8GB / 256GB', '5000mAh, 80W'], 1],
  ['OPPO Reno 11 Pro 5G', 'OPPO', 'smartphone', 39999, 36999, 6, 'photo-1565849904461-04a58ad377e0',
    'Slim, light and quick-charging, with a dependable 32MP portrait lens.',
    ['6.74" 120Hz curved AMOLED', '50MP + 32MP tele + 8MP', 'Snapdragon 8+ Gen 1', '12GB / 256GB', '4700mAh, 80W'], 0],
  ['Nothing Phone (2a)', 'Nothing', 'smartphone', 25999, 23749, 12, 'photo-1510557880182-3d4d3cba35a5',
    'The Glyph interface people stop at the counter to look at. Clean software, no bloat.',
    ['6.7" 120Hz AMOLED', '50MP dual camera', 'Dimensity 7200 Pro', '8GB / 128GB', '5000mAh, 45W'], 1],
  ['Motorola Edge 50 Fusion', 'Motorola', 'smartphone', 24999, 20999, 10, 'photo-1512499617640-c74ae3a79d37',
    'Near-stock Android with a 3-year update promise and a vegan leather finish.',
    ['6.7" 144Hz pOLED', '50MP OIS main', 'Snapdragon 7s Gen 2', '8GB / 128GB', '5000mAh, 68W'], 0],
  ['Samsung Galaxy M14 5G', 'Samsung', 'smartphone', 16999, 13490, 22, 'photo-1556656793-08538906a9f8',
    'The budget 5G workhorse — huge battery, and the one we sell most to students.',
    ['6.6" 90Hz PLS LCD', '50MP triple camera', 'Exynos 1330', '4GB / 128GB', '6000mAh, 25W'], 0],
  ['Apple iPad 10th Gen Wi-Fi', 'Apple', 'tablet', 44900, 36900, 5, 'photo-1585790050230-5dd28404ccb9',
    'All-screen iPad in four colours, ideal for school and small-business billing.',
    ['10.9" Liquid Retina', 'A14 Bionic', '64GB', '12MP wide camera', 'USB-C, Touch ID'], 0],
  ['Samsung Galaxy Tab A9+', 'Samsung', 'tablet', 22999, 17999, 7, 'photo-1544244015-0df4b3ffc6b0',
    'Big-screen tablet for streaming and online classes, with quad speakers.',
    ['11" 90Hz TFT', 'Snapdragon 695', '8GB / 128GB', 'Quad Dolby Atmos', '7040mAh'], 0],
  ['Apple Watch SE (2nd Gen)', 'Apple', 'wearable', 29900, 24900, 6, 'photo-1579586337278-3befd40fd17a',
    'Crash detection and workout tracking, the most-asked-for watch at our counter.',
    ['40mm Retina display', 'S8 SiP', 'Heart rate + sleep', 'Water resistant 50m', 'Up to 18 hr'], 1],
  ['Samsung Galaxy Watch 6', 'Samsung', 'wearable', 33999, 26999, 5, 'photo-1523275335684-37898b6baf30',
    'Body composition and sleep coaching, pairs perfectly with any Galaxy phone.',
    ['1.3" Super AMOLED', 'Exynos W930', 'BioActive sensor', 'IP68 + 5ATM', '300mAh'], 0],
  ['Noise ColorFit Pro 5', 'Noise', 'wearable', 5999, 3499, 26, 'photo-1434493789847-2f02dc6ca35d',
    'Bluetooth calling smartwatch under 4k — our fastest-moving wearable.',
    ['1.85" AMOLED', 'Bluetooth calling', '100+ sports modes', 'IP68', '7-day battery'], 0],
  ['Apple AirPods Pro (2nd Gen)', 'Apple', 'audio', 26900, 21900, 9, 'photo-1603313011101-320f26a4f6f6',
    'Adaptive ANC and USB-C charging. Genuine Apple stock with India warranty.',
    ['Active Noise Cancellation', 'Adaptive Transparency', 'USB-C MagSafe case', 'Up to 6 hr ANC on', 'IP54'], 1],
  ['boAt Airdopes 311 Pro', 'boAt', 'audio', 3990, 1299, 48, 'photo-1572569511254-d8f925fe2cbb',
    'Everyday earbuds that take a beating. We stock these by the carton.',
    ['50 hr total playback', 'ENx noise cancellation', 'Low latency BEAST mode', 'IPX5', 'Type-C fast charge'], 0],
  ['Sony WH-CH720N', 'Sony', 'audio', 14990, 8990, 7, 'photo-1505740420928-5e560c06d30e',
    'Lightest over-ear ANC headphone Sony makes — superb for long train journeys.',
    ['Dual Noise Sensor ANC', '35 hr battery', 'Multipoint pairing', 'Quick charge 3 min = 1 hr', '192g'], 0],
  ['JBL Flip 6 Bluetooth Speaker', 'JBL', 'audio', 11999, 8499, 8, 'photo-1583394838336-acd977736f90',
    'The party speaker everyone borrows. IP67 rated, so a Ranchi monsoon is no problem.',
    ['20W RMS output', 'IP67 waterproof', '12 hr playtime', 'PartyBoost pairing', 'USB-C'], 0],
  ['Samsung 25W Type-C Charger', 'Samsung', 'accessory', 1999, 1349, 64, 'photo-1583863788434-e58a36330cf0',
    'Genuine Samsung adaptive fast charger with cable — no local copies sold here.',
    ['25W Power Delivery', 'PPS support', 'Type-C to Type-C cable', 'Over-current protection', '1 yr warranty'], 0],
  ['Anker PowerCore 20000mAh', 'Anker', 'accessory', 4499, 2999, 19, 'photo-1609091839311-d5365f9ff1c5',
    'Charges a modern phone four times over. Popular with our travelling customers.',
    ['20000mAh capacity', '20W USB-C PD', 'Charges 2 devices', 'MultiProtect safety', '18-month warranty'], 0],
  ['9H Tempered Glass (All Models)', 'Vaishnavi', 'accessory', 499, 199, 180, 'photo-1546054454-aa26e2b734c7',
    'Fitted free by our staff, bubble-free, while you wait. Cut for every model we stock.',
    ['9H surface hardness', 'Oleophobic coating', 'Edge-to-edge fit', 'Bubble-free install', 'Free fitting'], 0],
  ['Shockproof Clear Back Cover', 'Vaishnavi', 'accessory', 899, 349, 142, 'photo-1601593346740-925612772716',
    'Military-grade bumper corners in a clear case that does not yellow in six months.',
    ['Anti-yellowing TPU', 'Raised camera lip', 'Drop tested 1.8m', 'Wireless-charge safe', '50+ models in stock'], 0],
]

const FEEDBACK = [
  ['Rohit Kumar Singh', 'Ratu Road, Ranchi', 5, 'Screen replaced in 90 minutes flat',
    'Dropped my Redmi Note on the way to office and the display was finished. Walked in at 11, had the phone back by 12:30 with an original panel and a bill with warranty on it. The tracking link they sent actually worked — I could see it move from diagnosis to ready.', 12, 'Screen Replacement'],
  ['Priya Sharma', 'Lalpur, Ranchi', 5, 'Honest pricing, no upselling',
    'Two other shops told me the motherboard was dead and quoted ₹6000. Vaishnavi found it was only a charging flex, charged me ₹850 and showed me the old part. That honesty is why my whole family buys phones here now.', 5, 'Charging Port Repair'],
  ['Mohammed Asif', 'Piska More, Ranchi', 5, 'Best price on the S24 Ultra in Ranchi',
    'Compared with three stores and the online price. They matched it and still threw in a tempered glass and cover. Setup was done at the counter, data transferred from my old phone, nothing left for me to do.', 33, 'New Phone Purchase'],
  ['Sunita Devi', 'Sukhdeo Nagar, Ranchi', 4, 'Very patient with a non-technical customer',
    'I am 58 and do not understand these things. The young man sat with me for almost half an hour explaining the camera and WhatsApp settings. Only reason for four stars is the shop gets very crowded on Sundays.', 45, 'New Phone Purchase'],
  ['Aditya Raj', 'Doranda, Ranchi', 5, 'Water damaged phone brought back to life',
    'Phone fell in a bucket during Holi. I had given up hope. They opened it, cleaned the board ultrasonically and it has been running fine for five months now. Paid ₹1200, saved a ₹45000 phone.', 15, 'Water Damage Repair'],
  ['Neha Gupta', 'Bariatu, Ranchi', 5, 'Tracking number is a brilliant touch',
    'Gave my iPhone for a battery change and got a ticket code. Instead of calling them five times, I just checked the status page from home. Small thing but it made the whole experience feel professional.', 20, 'Battery Replacement'],
  ['Vikash Mahto', 'Harmu, Ranchi', 5, 'Genuine accessories, not duplicate',
    'Bought a 25W Samsung charger. Checked the serial on the Samsung site and it is genuine. The market near station sells fakes at the same price — learned that the hard way before.', 51, 'Accessories'],
  ['Shalini Tirkey', 'Namkum, Ranchi', 4, 'Good service, slight delay on parts',
    'Needed a display for a slightly older vivo model and it took three days because it had to come from Kolkata. They kept me updated on the status page every day, so I did not mind the wait.', 9, 'Screen Replacement'],
  ['Amit Kerketta', 'Kanke Road, Ranchi', 5, 'They fixed what the service centre refused',
    'Authorised service centre said my phone was out of warranty and not repairable. Vaishnavi replaced the sub-board and it works perfectly. Half the cost of a new phone.', 60, 'Motherboard Repair'],
  ['Farhan Ansari', 'Main Road, Ranchi', 5, 'Exchange value was better than online',
    'Got ₹14500 for my 3-year-old OnePlus against a new Nothing Phone. The online sites were offering ₹11000. Quick inspection, instant adjustment in the bill.', 68, 'Exchange / Trade-in'],
  ['Kavita Mishra', 'Ashok Nagar, Ranchi', 5, 'Sunday opening saved me',
    'My phone died on a Saturday night before an important Monday presentation. They are open Sunday and had it sorted by evening. Life savers.', 26, 'Software / Data Recovery'],
  ['Deepak Oraon', 'Ratu Road, Ranchi', 4, 'Treated properly even on a busy Sunday',
    'Walked in on a Sunday evening with a dead handset and they still put it on the bench the same hour. Shop is clean, there are chairs for the queue, and the warranty slip is handed over without being asked for. Not the cheapest in the gali, but fair.', 54, 'New Phone Purchase'],
]

// The trailing number is how many days ago the device came in, so the seeded
// timelines read like real repairs rather than everything happening at once.
const SAMPLE_BOOKINGS = [
  [3, 'Ankit Verma', '9835511223', 'ankit.v@example.com', 'Samsung', 'Galaxy S23 FE', '358712094456781',
    'Screen Replacement', 'Display cracked after a fall, touch works in the lower half only.', 'ready', 7800, 0, 'Imran (Bench 2)',
    [['received', 'Device handed over at counter. Front glass cracked, frame intact.'],
     ['diagnosing', 'Display assembly confirmed faulty. Touch digitiser damaged. Board and battery test clean.'],
     ['awaiting_parts', 'Original Samsung service pack display ordered from Kolkata distributor.'],
     ['repairing', 'New display fitted, waterproof adhesive re-applied, 4-hour burn-in test running.'],
     ['ready', 'All tests passed. Device ready for pickup. Please carry this ticket and a photo ID.']]],
  [2, 'Rekha Kumari', '9304477881', '', 'Xiaomi', 'Redmi Note 12 Pro', '862145307789120',
    'Battery Replacement', 'Battery drains from 100% to 20% in about three hours.', 'repairing', 1650, 0, 'Sandeep (Bench 1)',
    [['received', 'Device received. Battery health reported at 71%.'],
     ['diagnosing', 'Battery swollen. Recommended immediate replacement. Charging IC tested fine.'],
     ['repairing', 'Original capacity cell being fitted. Calibration cycle to follow.']]],
  [9, 'Suraj Pandey', '7004412390', 'suraj.p@example.com', 'Apple', 'iPhone 12', '353012110987654',
    'Charging Port Repair', 'Only charges when the cable is held at an angle.', 'delivered', 2200, 2200, 'Imran (Bench 2)',
    [['received', 'Device received for charging fault.'],
     ['diagnosing', 'Lightning connector pins worn and lint-packed. Flex cable replacement advised.'],
     ['repairing', 'Charging flex replaced with genuine pull part. Fast charge verified at 20W.'],
     ['ready', 'Repair complete, 30-day warranty issued on the part.'],
     ['delivered', 'Collected by customer. Invoice VMS-INV-2241 issued.']]],
  [1, 'Pooja Singh', '8987120045', '', 'vivo', 'V27 Pro', '',
    'Software / Data Recovery', 'Phone stuck on boot logo after an update. Need photos recovered.', 'diagnosing', 0, 0, 'Rahul (Software)',
    [['received', 'Device received. Customer priority is photo recovery before any flash.'],
     ['diagnosing', 'Attempting data pull in EDL mode before considering a firmware re-flash.']]],
]

function seedIfEmpty() {
  const hasProducts = db.prepare('SELECT COUNT(*) AS n FROM products').get().n > 0
  const hasAdmin = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n > 0

  if (!hasAdmin) {
    const username = process.env.ADMIN_USERNAME || 'admin'
    // No literal fallback here: a password written in the source is a password
    // every copy of this project shares. If none is configured, mint a random
    // one and print it once so the first run is still usable.
    let password = process.env.ADMIN_PASSWORD
    if (!password) {
      password = crypto.randomBytes(12).toString('base64url')
      console.warn(
        `\n[seed] ADMIN_PASSWORD was not set. Generated one for "${username}":\n` +
        `[seed]   ${password}\n` +
        `[seed] Save it in .env now — it is not stored anywhere else.\n`,
      )
    }
    const name = process.env.ADMIN_NAME || 'Store Owner'
    db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      username,
      hashPassword(password),
      name,
      'owner',
    )
    console.log(`[seed] admin user "${username}" created`)
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (getSetting(key) === null) setSetting(key, value)
  }

  // Placeholders that shipped as defaults before the shop's real details
  // were known. The database is kept now (Litestream), so seeding alone never
  // reaches it: swap a value that is still the old placeholder, and leave
  // anything staff have saved under Site Content alone.
  const PLACEHOLDERS = [
    ['email', 'care@vaishnavimobile.in'],
    ['social_instagram', 'https://instagram.com/'],
    ['social_facebook', 'https://facebook.com/'],
    ['social_youtube', 'https://youtube.com/'],
  ]
  for (const [key, placeholder] of PLACEHOLDERS) {
    if (getSetting(key) === placeholder) setSetting(key, DEFAULT_SETTINGS[key])
  }

  if (hasProducts) return

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, slug, name, brand, category, description, price, mrp, stock_qty, low_stock, image_url, specs, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMovement = db.prepare(
    'INSERT INTO stock_movements (product_id, kind, qty, balance, note, actor) VALUES (?, ?, ?, ?, ?, ?)',
  )

  PRODUCTS.forEach(([name, brand, category, mrp, price, qty, photo, description, specs, featured], index) => {
    const sku = `VMS-${category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
    const image = `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=80`
    const result = insertProduct.run(
      sku,
      slugify(name),
      name,
      brand,
      category,
      description,
      price,
      mrp,
      qty,
      category === 'accessory' ? 15 : 3,
      image,
      JSON.stringify(specs),
      featured,
    )
    insertMovement.run(Number(result.lastInsertRowid), 'in', qty, qty, 'Opening stock', 'system')
  })

  /*
   * Sample reviews, for the CMS's moderation screen while developing. They
   * used to be inserted everywhere as approved, so the live site published
   * twelve "unedited" reviews no customer wrote, with stock faces and made-up
   * dates. Now: never in production, and pending rather than published, so
   * they cannot reach a public page even on a developer's machine.
   */
  if (process.env.NODE_ENV !== 'production') {
    const insertFeedback = db.prepare(
      "INSERT INTO feedback (name, city, rating, title, message, avatar_url, service, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now', ?))",
    )
    FEEDBACK.forEach(([name, city, rating, title, message, avatar, service], i) => {
      // Newest first in the list, roughly a week apart going back.
      insertFeedback.run(
        name, city, rating, title, message, `https://i.pravatar.cc/160?img=${avatar}`, service,
        `-${3 + i * 8} days`,
      )
    })
  }

  /*
   * Sample repair tickets and a sample enquiry, so every CMS screen has
   * something to show while developing. Never in production: with a
   * persistent disk they would sit in the shop's real ticket list and inbox
   * for good, under made-up customers and phone numbers.
   */
  if (process.env.NODE_ENV === 'production') {
    console.log(`[seed] ${PRODUCTS.length} products inserted (no sample reviews or tickets in production)`)
    return
  }

  const insertBooking = db.prepare(`
    INSERT INTO bookings (ticket, customer_name, phone, email, device_brand, device_model, imei, issue_type, issue_desc, preferred_date, status, estimate_amount, final_amount, technician, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `)
  const insertUpdate = db.prepare(
    "INSERT INTO booking_updates (booking_id, status, note, created_at) VALUES (?, ?, ?, datetime('now', ?))",
  )

  for (const b of SAMPLE_BOOKINGS) {
    const [daysAgo, cname, phone, email, brand, model, imei, issueType, issueDesc, status, est, final, tech, timeline] = b

    // Spread the timeline evenly between drop-off and now.
    const startHours = daysAgo * 24
    const stepHours = timeline.length > 1 ? Math.max(2, Math.floor(startHours / timeline.length)) : 0
    const lastOffset = startHours - stepHours * (timeline.length - 1)

    const res = insertBooking.run(
      ticketCode(), cname, phone, email, brand, model, imei, issueType, issueDesc, '', status, est, final, tech,
      `-${startHours} hours`, `-${lastOffset} hours`,
    )
    timeline.forEach(([entryStatus, note], i) => {
      insertUpdate.run(Number(res.lastInsertRowid), entryStatus, note, `-${startHours - stepHours * i} hours`)
    })
  }

  db.prepare(
    'INSERT INTO contact_messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)',
  ).run(
    'Manish Kumar',
    '9835000111',
    'manish@example.com',
    'Bulk order enquiry',
    'We need 12 budget smartphones for our field staff. Can you quote a corporate price with GST invoice?',
  )

  console.log(`[seed] ${PRODUCTS.length} products, ${FEEDBACK.length} pending sample reviews, ${SAMPLE_BOOKINGS.length} repair tickets inserted`)
}

seedIfEmpty()

/* ------------------------------------------------------------------ *
 * One-off fixes for databases that already exist. SQLite's user_version
 * counts the ones applied, so each runs exactly once per database — and,
 * because the database is replicated, once for the live site.
 * ------------------------------------------------------------------ */

function migrate() {
  const { user_version: version } = db.prepare('PRAGMA user_version').get()

  if (version < 1) {
    // The first seed published the twelve sample reviews (FEEDBACK) as
    // approved. Unpublish exactly those rows: same name and title, still on
    // the stock avatar service. They stay under Reviews in the CMS, where
    // staff can publish or delete them; real customers' reviews are untouched.
    const hide = db.prepare(
      "UPDATE feedback SET approved = 0 WHERE approved = 1 AND name = ? AND title = ? AND avatar_url LIKE 'https://i.pravatar.cc/%'",
    )
    let hidden = 0
    for (const [name, , , title] of FEEDBACK) hidden += Number(hide.run(name, title).changes)
    if (hidden) console.log(`[migrate] unpublished ${hidden} sample review(s) left by the demo seed`)
    db.exec('PRAGMA user_version = 1')
  }
}

migrate()

/** Tickets a customer can see, in the order a repair moves through them. */
export const STATUS_FLOW = ['received', 'diagnosing', 'awaiting_parts', 'repairing', 'ready', 'delivered']
export const STATUS_LABELS = {
  received: 'Device Received',
  diagnosing: 'Diagnosis in Progress',
  awaiting_parts: 'Awaiting Spare Parts',
  repairing: 'Repair in Progress',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
