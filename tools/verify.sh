#!/usr/bin/env bash
# Smoke test for the Vaishnavi Mobile Point site.
#
#   ./tools/verify.sh              # checks http://localhost:8470
#   BASE=https://... ./tools/verify.sh
#
# Covers the three things that actually matter and are easy to break:
#   1. stock levels never reach a public response
#   2. a repair ticket needs BOTH the ticket number and the booking phone
#   3. every /api/admin route is closed until you log in

BASE="${BASE:-http://localhost:8470}"
PASS=0; FAIL=0; FAILED_NAMES=()

ok()   { PASS=$((PASS+1)); printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); FAILED_NAMES+=("$1"); printf '  \033[31m✗\033[0m %s\n     %s\n' "$1" "$2"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# check <name> <expected-substring> <actual>
check() { [[ "$3" == *"$2"* ]] && ok "$1" || bad "$1" "expected to contain '$2', got: $(printf '%.160s' "$3")"; }
# absent <name> <forbidden-substring> <actual>
absent() { [[ "$3" != *"$2"* ]] && ok "$1" || bad "$1" "must NOT contain '$2'"; }
# status <name> <expected-code> <url> [curl args...]
status() {
  local name="$1" want="$2" url="$3"; shift 3
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' "$@" "$BASE$url")
  [[ "$got" == "$want" ]] && ok "$name" || bad "$name" "expected HTTP $want, got $got"
}

printf '\033[1mVerifying %s\033[0m\n' "$BASE"

PRE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/captcha")
if [[ "$PRE" == "429" ]]; then
  printf '\033[33mNote: this host is currently rate limited. Wait a minute and re-run,\n'
  printf 'or results below will show 429 rather than the real behaviour.\033[0m\n'
fi

head_ "Container & health"
if command -v docker >/dev/null; then
  H=$(docker inspect -f '{{.State.Health.Status}}' vaishnavi-mobile-shop 2>/dev/null)
  [[ "$H" == "healthy" ]] && ok "container reports healthy" || bad "container health" "status: ${H:-not running}"
  M=$(docker inspect -f '{{range .Mounts}}{{.Source}};{{end}}' vaishnavi-mobile-shop 2>/dev/null)
  check "data/ and uploads/ bind-mounted from this folder" "$(pwd)/data" "$M"
fi
check "/api/health" '"ok":true' "$(curl -s "$BASE/api/health")"

head_ "Public pages & SEO"
HOME_HTML=$(curl -s "$BASE/")
check "homepage serves HTML"            "<!doctype html"              "$(printf "%s" "$HOME_HTML" | tr "[:upper:]" "[:lower:]")"
check "page title names the shop"       "Vaishnavi Mobile Point"      "$HOME_HTML"
check "canonical link present"          'rel="canonical"'             "$HOME_HTML"
check "og:image is the shop's banner"   "banner-design-social.jpg"    "$HOME_HTML"
check "twitter large-image card"        'twitter:card" content="summary_large_image"' "$HOME_HTML"
check "JSON-LD local business"          '"@type":"MobilePhoneStore"'  "$HOME_HTML"
JSONLD_DIGITS=$(printf '%s' "$HOME_HTML" | python3 -c "
import sys,re,json
m=re.search(r'<script type=\"application/ld\+json\">(.*?)</script>',sys.stdin.read(),re.S)
d=json.loads(m.group(1)); t=d.get('telephone')
print(re.sub(r'\\D','',' '.join(t if isinstance(t,list) else [t or ''])))")
check "JSON-LD carries the shop phone"  "9122266800"                  "$JSONLD_DIGITS"
ROBOTS=$(curl -s "$BASE/robots.txt")
check "robots.txt allows crawling"      "User-agent"                  "$ROBOTS"
check "robots.txt points to sitemap"    "sitemap"                     "$(printf "%s" "$ROBOTS" | tr "[:upper:]" "[:lower:]")"
SITEMAP=$(curl -s "$BASE/sitemap.xml")
check "sitemap.xml is a urlset"         "<urlset"                     "$SITEMAP"
SITEMAP_N=$(grep -o '<loc>' <<<"$SITEMAP" | wc -l | tr -d ' ')
[[ "$SITEMAP_N" -ge 5 ]] && ok "sitemap lists $SITEMAP_N pages" || bad "sitemap page count" "only $SITEMAP_N <loc> entries"
# A React SPA serves the SAME shell for EVERY path - /total-nonsense returns 200
# too - so "GET /page == 200" proves nothing about whether that page exists.
# What can actually drift is the three places a page has to be declared:
# the router, the sitemap, and the links pointing at it. Compare those instead.
ROUTES=$(python3 - <<'PY'
import re
src = open('client/src/App.tsx').read()
block = re.search(r'<Route element=\{<Layout\s*/>\}>(.*?)</Route>', src, re.S).group(1)
paths = re.findall(r'path="([^"]+)"', block)
print('\n'.join(['/'] + ['/' + p for p in paths if p != '*' and ':' not in p]))
PY
)
ROUTES=$(printf '%s\n' "$ROUTES" | sort -u)
SITEMAP_PATHS=$(printf '%s' "$SITEMAP" | grep -o '<loc>[^<]*</loc>' | sed 's|<[^>]*>||g' \
  | sed "s|^$BASE||" | grep -vE '^/products/.+' | sed 's|^$|/|' | sort -u)

N_ROUTES=$(printf '%s\n' "$ROUTES" | grep -c .)
ok "router declares $N_ROUTES public pages: $(printf '%s ' $ROUTES)"

MISSING=$(comm -23 <(printf '%s\n' "$ROUTES") <(printf '%s\n' "$SITEMAP_PATHS"))
[ -z "$MISSING" ] && ok "every public page is listed in sitemap.xml" \
  || bad "sitemap is missing real pages" "not advertised to Google: $(printf '%s ' $MISSING)"

PHANTOM=$(comm -13 <(printf '%s\n' "$ROUTES") <(printf '%s\n' "$SITEMAP_PATHS"))
[ -z "$PHANTOM" ] && ok "sitemap advertises no page that does not exist" \
  || bad "sitemap points Google at dead pages" "no such route: $(printf '%s ' $PHANTOM)"

# A dead <Link to="..."> renders the Not Found page instead of navigating.
ADMIN_ROUTES='/admin
/admin/login
/admin/stock
/admin/bookings
/admin/reviews
/admin/messages
/admin/settings'
ALL_ROUTES=$(printf '%s\n%s\n' "$ROUTES" "$ADMIN_ROUTES" | sort -u)
DEAD=$(grep -rhoE 'to="/[a-zA-Z0-9/_-]*"' client/src | sed 's/to="//; s/"$//' | sort -u \
  | while read -r l; do [ -n "$l" ] && { printf '%s\n' "$ALL_ROUTES" | grep -qx "$l" || echo "$l"; }; done)
[ -z "$DEAD" ] && ok "every internal link points at a real route" \
  || bad "dead internal link(s)" "these go to Not Found: $(printf '%s ' $DEAD)"

# Record the fallback explicitly, so a 200 is never mistaken for proof of a route.
NONSENSE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/zzz-not-a-real-page")
[ "$NONSENSE" = "200" ] && ok "unknown paths get the SPA shell (React renders Not Found)" \
  || bad "SPA fallback" "unknown path returned $NONSENSE, expected the 200 shell"

head_ "Catalogue — stock must stay private"
PRODUCTS=$(curl -s "$BASE/api/products")
P_COUNT=$(jq '.products | length' <<<"$PRODUCTS" 2>/dev/null)
[[ "${P_COUNT:-0}" -gt 0 ]] && ok "public catalogue returns $P_COUNT products" || bad "catalogue" "no products returned"
absent "no stock_qty in public payload"      "stock_qty"   "$PRODUCTS"
absent "no low_stock threshold leaked"       "low_stock\"" "$PRODUCTS"
absent "no cost price leaked"                "cost_price"  "$PRODUCTS"
check  "availability shown as a label"       "availability" "$PRODUCTS"
AVAIL=$(jq -r '[.products[].availability] | unique | join(",")' <<<"$PRODUCTS" 2>/dev/null)
[[ "$AVAIL" =~ ^(in_stock|low_stock|out_of_stock|,)+$ ]] && ok "availability values are safe labels ($AVAIL)" \
  || bad "availability values" "unexpected: $AVAIL"
SLUG=$(jq -r '.products[0].slug' <<<"$PRODUCTS" 2>/dev/null)
ONE=$(curl -s "$BASE/api/products/$SLUG")
check  "single product /api/products/$SLUG" '"slug"' "$ONE"
absent "single product hides stock_qty"     "stock_qty" "$ONE"

head_ "Reviews, stats, settings"
check "/api/feedback returns reviews"  '"reviews"'      "$(curl -s "$BASE/api/feedback")"
check "/api/stats returns counts"      '"products"'     "$(curl -s "$BASE/api/stats")"
check "/api/service-options"           "["              "$(curl -s "$BASE/api/service-options")"
SETTINGS=$(curl -s "$BASE/api/settings")
check  "/api/settings has shop name"   "Vaishnavi Mobile Point" "$SETTINGS"
check  "/api/settings has phone"       "9122266800"             "$SETTINGS"
absent "settings never expose a hash"  "password_hash"          "$SETTINGS"

head_ "Repair tracking (CAPTCHA + ticket + phone)"
CAP=$(curl -s "$BASE/api/captcha")
CAP_ID=$(jq -r '.id' <<<"$CAP" 2>/dev/null)
[[ -n "$CAP_ID" && "$CAP_ID" != "null" ]] && ok "CAPTCHA issued" || bad "CAPTCHA" "no id returned"

# The answer must not be recoverable from the response. It used to be drawn as
# <text>X</text> per character, in order, so one regex solved it — this very
# script relied on that. Glyphs are stroke geometry now.
CAP_LEAK=$(jq -r '.svg' <<<"$CAP" | python3 -c "
import sys,re
svg=sys.stdin.read()
print(''.join(re.findall(r'<text[^>]*>(.)</text>', svg)) + ''.join(re.findall(r'>\s*([A-Z0-9])\s*<', svg)))
")
[[ -z "$CAP_LEAK" ]] && ok "CAPTCHA answer is not in the SVG markup" \
  || bad "CAPTCHA ANSWER LEAKED" "recovered '$CAP_LEAK' from the response markup — it is solvable by regex"

PAIR=$(sqlite3 -separator '|' data/vaishnavi.sqlite "SELECT ticket, phone FROM bookings ORDER BY id LIMIT 1;" 2>/dev/null)
TICKET="${PAIR%%|*}"; PHONE="${PAIR##*|}"

trk() { curl -s -X POST "$BASE/api/track" -H 'content-type: application/json' \
  --data-binary "{\"ticket\":\"$1\",\"phone\":\"$2\",\"captchaId\":\"$CAP_ID\",\"captchaText\":\"$3\"}"; }

check "wrong CAPTCHA is rejected" "security code" "$(trk "$TICKET" "$PHONE" 'ZZZZZ')"

# With a bad code, a real ticket and a nonsense one must be indistinguishable,
# or the error itself tells an attacker which tickets exist.
R_REAL=$(trk "$TICKET" "$PHONE" 'ZZZZZ')
R_FAKE=$(trk 'VMS-000000' '0000000000' 'ZZZZZ')
[[ "$R_REAL" == "$R_FAKE" ]] && ok "a bad CAPTCHA reveals nothing about which tickets exist" \
  || bad "ticket enumeration" "a real and a fake ticket gave different answers behind a failed CAPTCHA"

# The privacy rule itself — both fields must match — asserted at the query.
grep -q "WHERE ticket = ? AND phone = ?" server/routes/public.js \
  && ok "lookup requires BOTH ticket and phone" \
  || bad "ticket privacy" "the track query no longer binds ticket AND phone"

# NOTE: the end-to-end "correct ticket + phone returns the repair" test is gone
# on purpose. Solving the CAPTCHA from a script is exactly what this change
# prevents, so that path is now checked by hand instead.

head_ "Admin is locked down"
for ep in /me /products /stats /settings /bookings /feedback /messages /stock-movements; do
  status "GET /api/admin$ep without login → 401" 401 "/api/admin$ep"
done
status "wrong password → 401" 401 /api/admin/login -X POST -H 'content-type: application/json' \
  -d '{"username":"admin","password":"definitely-not-it"}'

# Credentials come from .env; nothing secret is written in this file.
if [[ -f .env ]]; then
  ADMIN_USERNAME=${ADMIN_USERNAME:-$(grep -E '^ADMIN_USERNAME=' .env | cut -d= -f2-)}
  ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(grep -E '^ADMIN_PASSWORD=' .env | cut -d= -f2-)}
fi
JAR=$(mktemp)
LOGIN=$(curl -s -c "$JAR" -X POST "$BASE/api/admin/login" -H 'content-type: application/json' \
  --data-binary "$(printf '{"username":"%s","password":"%s"}' "${ADMIN_USERNAME:-admin}" "$ADMIN_PASSWORD")")
check "correct password logs in" '"user"' "$LOGIN"
grep -q "vms_session" "$JAR" 2>/dev/null && ok "session cookie set" || bad "session cookie" "vms_session not in jar"
grep -q "#HttpOnly_" "$JAR" 2>/dev/null && ok "session cookie is HttpOnly" || bad "cookie hardening" "not HttpOnly"

ADM_PRODUCTS=$(curl -s -b "$JAR" "$BASE/api/admin/products")
check "admin sees products"            '"products"'  "$ADM_PRODUCTS"
check "admin DOES see stock_qty"       "stock_qty"   "$ADM_PRODUCTS"
check "admin stats"                    "{"           "$(curl -s -b "$JAR" "$BASE/api/admin/stats")"
check "admin settings"                 "shop_name"   "$(curl -s -b "$JAR" "$BASE/api/admin/settings")"
check "admin bookings"                 "["           "$(curl -s -b "$JAR" "$BASE/api/admin/bookings")"
check "admin stock movements"          "["           "$(curl -s -b "$JAR" "$BASE/api/admin/stock-movements")"
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/admin/logout" >/dev/null
grep -q "vms_session" "$JAR" 2>/dev/null \
  && bad "logout clears the browser cookie" "vms_session still in the jar" \
  || ok "logout clears the browser cookie"
status "after logout /api/admin/me → 401" 401 /api/admin/me -b "$JAR"
# NOTE: the cookie is a stateless HMAC token with a 12h TTL and there is no
# server-side revocation list, so a token copied before logout stays valid
# until it expires. Fine for one owner on their own machine; worth hardening
# if staff ever sign in from a shared counter PC.
rm -f "$JAR"

head_ "Images & bundles"
img() {
  local name="$1" path="$2"
  local out; out=$(curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}' "$BASE$path")
  read -r code ctype size <<<"$out"
  if [[ "$code" == "200" && "$ctype" == image/* && "$size" -gt 1000 ]]; then
    ok "$name ($((size/1024))KB $ctype)"
  else
    bad "$name" "HTTP $code, type $ctype, $size bytes"
  fi
}
img "banner artwork (full design)" /shop/banner-design.jpg
img "banner artwork (wide crop)"   /shop/banner-design-wide.jpg
img "social card"                  /shop/banner-design-social.jpg
img "graded storefront (hero)"     /shop/storefront-graded.jpg

# Link-preview crawlers expect 1200x630; a wrong size gets cropped or dropped.
SOCIAL_DIM=$(curl -s "$BASE/shop/banner-design-social.jpg" | python3 -c "
import sys,struct
d=sys.stdin.buffer.read(); i=2
while i<len(d)-9:
    if d[i]!=0xFF: i+=1; continue
    m=d[i+1]
    if m in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
        h,w=struct.unpack('>HH',d[i+5:i+9]); print(f'{w}x{h}'); break
    i+=2+struct.unpack('>H',d[i+2:i+4])[0]
")
check "social card is 1200x630" "1200x630" "$SOCIAL_DIM"

# The catalogue band must show the artwork uncropped, so its ratio has to match.
PRODUCTS_SRC=$(cat client/src/pages/Products.tsx)
check "catalogue banner uses the wide file" "banner-wide.jpg" "$PRODUCTS_SRC"
check "catalogue banner is full-bleed"      "full-bleed"      "$PRODUCTS_SRC"
img   "wide catalogue banner"               /shop/banner-wide.jpg
JS=$(grep -o '/assets/[^"]*\.js'  <<<"$HOME_HTML" | head -1)
CSS=$(grep -o '/assets/[^"]*\.css' <<<"$HOME_HTML" | head -1)
[[ -n "$JS"  ]] && status "JS bundle $JS"  200 "$JS"  || bad "JS bundle"  "no /assets/*.js in the shell"
[[ -n "$CSS" ]] && status "CSS bundle $CSS" 200 "$CSS" || bad "CSS bundle" "no /assets/*.css in the shell"
SHOP_IMGS=$(ls client/public/shop/*.jpg 2>/dev/null | wc -l | tr -d ' ')
[[ "$SHOP_IMGS" -ge 20 ]] && ok "$SHOP_IMGS shop photos on disk" || bad "shop photos" "only $SHOP_IMGS found"

head_ "Data survived the move"
for pair in products:20 bookings:4 feedback:10 settings:30 admin_users:1 stock_movements:20; do
  t="${pair%%:*}"; min="${pair##*:}"
  n=$(sqlite3 data/vaishnavi.sqlite "SELECT COUNT(*) FROM $t;" 2>/dev/null)
  [[ "${n:-0}" -ge "$min" ]] && ok "$t: $n rows" || bad "$t row count" "expected >= $min, found ${n:-0}"
done
INTEG=$(sqlite3 data/vaishnavi.sqlite "PRAGMA integrity_check;" 2>/dev/null)
[[ "$INTEG" == "ok" ]] && ok "SQLite integrity_check: ok" || bad "SQLite integrity" "$INTEG"

head_ "Security"
SEC_H=$(curl -sI "$BASE/")
for h in content-security-policy x-content-type-options x-frame-options referrer-policy permissions-policy cross-origin-opener-policy; do
  grep -qi "^$h:" <<<"$SEC_H" && ok "$h header sent" || bad "$h" "header missing"
done
check "API responses are not cached"  "no-store" "$(curl -sI "$BASE/api/products" | tr -d '\r')"
absent "no server banner"             "X-Powered-By" "$SEC_H"

# A session cookie is a signed token: if the signing key is a placeholder that
# ships with the project, anyone can mint an owner session. This forges one with
# each known placeholder and expects to be turned away.
for weak in 'vaishnavi-dev-secret' 'change-me-vaishnavi-ranchi-secret-key' 'changeme' 'secret'; do
  FORGED=$(node -e "
    const c=require('node:crypto');
    const b=Buffer.from(JSON.stringify({id:1,username:'admin',role:'owner',exp:Date.now()+3600000})).toString('base64url');
    process.stdout.write(b+'.'+c.createHmac('sha256',process.argv[1]).update(b).digest('base64url'));" "$weak")
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: vms_session=$FORGED" "$BASE/api/admin/me")
  [[ "$CODE" == "401" ]] && ok "token forged with '$weak' is rejected" \
    || bad "FORGEABLE SESSION" "a token signed with '$weak' returned HTTP $CODE on /api/admin/me"
done

# A 500 should not describe the failure to the caller.
MALFORMED=$(curl -s -H 'Cookie: vms_session=%ZZ' "$BASE/api/health")
check  "malformed cookie does not 500" '"ok":true' "$MALFORMED"
BADJSON=$(curl -s -X POST "$BASE/api/contact" -H 'content-type: application/json' --data-binary '{"a":')
absent "errors do not leak internals"  "at Object" "$BADJSON"
absent "errors do not leak file paths" "/app/server" "$BADJSON"

# Nothing outside the built client should be reachable.
for p in /server/db.js /package.json /Dockerfile /docker-compose.yml /.env /data/vaishnavi.sqlite; do
  CT=$(curl -s -o /dev/null -w '%{content_type}' "$BASE$p")
  [[ "$CT" == text/html* ]] && ok "$p is not served as a file" \
    || bad "EXPOSED FILE" "$p served as $CT"
done

if command -v docker >/dev/null; then
  WHO=$(docker exec vaishnavi-mobile-shop id -u 2>/dev/null)
  [[ -n "$WHO" && "$WHO" != "0" ]] && ok "container runs unprivileged (uid $WHO)" \
    || bad "container runs as root" "uid $WHO"
fi

# Compression was off entirely: 606KB of JS where 177KB would do, about 3.5s
# of extra download on a 1Mbps connection. Guard it.
JS_PATH=$(printf '%s' "$HOME_HTML" | grep -o '/assets/index-[^"]*\.js' | head -1)
if [[ -n "$JS_PATH" ]]; then
  RAW=$(curl -s -H 'Accept-Encoding: identity' -o /dev/null -w '%{size_download}' "$BASE$JS_PATH")
  GZ=$(curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w '%{size_download}' "$BASE$JS_PATH")
  ENC=$(curl -s -H 'Accept-Encoding: gzip' -D - -o /dev/null "$BASE$JS_PATH" | grep -i '^content-encoding' | tr -d '\r' | cut -d' ' -f2-)
  [[ "$ENC" == *gzip* ]] && ok "JS is served gzipped" || bad "NO COMPRESSION" "content-encoding was '${ENC:-none}' — the bundle ships uncompressed"
  if [[ "$RAW" -gt 0 && "$GZ" -gt 0 ]]; then
    PCT=$(( 100 - (GZ * 100 / RAW) ))
    [[ "$PCT" -ge 50 ]] && ok "JS compresses by ${PCT}% ($((RAW/1024))KB -> $((GZ/1024))KB)" \
      || bad "weak compression" "only ${PCT}% saved"
  fi
  VARY=$(curl -s -H 'Accept-Encoding: gzip' -D - -o /dev/null "$BASE$JS_PATH" | grep -ci '^vary:.*accept-encoding')
  [[ "$VARY" -ge 1 ]] && ok "Vary: Accept-Encoding sent (safe for shared caches)" \
    || bad "missing Vary header" "a shared cache could serve gzip to a client that cannot read it"
fi
IMG_ENC=$(curl -s -H 'Accept-Encoding: gzip' -D - -o /dev/null "$BASE/shop/banner-wide.jpg" | grep -i '^content-encoding' | tr -d '\r')
[[ -z "$IMG_ENC" ]] && ok "JPEGs are not re-compressed" || bad "wasted CPU" "images are being gzipped: $IMG_ENC"


head_ "Misc"
status "unknown API endpoint → 404" 404 /api/does-not-exist

head_ "Rate limiting (runs last — it deliberately exhausts a limit)"
# Uses /api/captcha because its window is one minute, so a re-run of this
# script recovers quickly. The earlier version hammered /api/track, whose
# window is ten minutes, which starved every later test on a second run.
LIMITED=0
for i in $(seq 1 70); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Forwarded-For: 203.0.113.250' "$BASE/api/captcha")
  if [[ "$C" == "429" ]]; then LIMITED=1; break; fi
done
if [[ "$LIMITED" == "1" ]]; then
  ok "rate limit engages after $i requests"
  # A limit keyed on a header the caller controls is not a limit. This used to
  # reset on every new X-Forwarded-For value.
  C2=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Forwarded-For: 198.51.100.77' "$BASE/api/captcha")
  [[ "$C2" == "429" ]] && ok "limit survives a spoofed X-Forwarded-For" \
    || bad "RATE LIMIT BYPASS" "changing X-Forwarded-For reset the limit (HTTP $C2) — check 'trust proxy'"
else
  bad "rate limit" "70 requests to /api/captcha were never limited"
fi

printf '\n\033[1m%d passed, %d failed\033[0m\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  printf '\033[31mFailed:\033[0m\n'; printf '  - %s\n' "${FAILED_NAMES[@]}"; exit 1
fi
printf '\033[32mAll checks passed.\033[0m\n'
