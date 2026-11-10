#!/bin/sh
# Container entrypoint.
#
# 1. As root, only long enough to make the data and upload folders writable by
#    the unprivileged `node` user: a freshly mounted disk can arrive owned by
#    root, and a chown in the Dockerfile cannot reach a mount.
# 2. When LITESTREAM_REPLICA_URL is set, restore the database from object
#    storage and run the server under Litestream, which streams every change
#    back (litestream.yml). This is what keeps bookings and repair tickets on a
#    host whose disk is wiped on every restart, such as Render's free plan.
#
# Named vmp-entrypoint.sh so it does not replace the node base image's own
# docker-entrypoint.sh.
set -e

export DATA_DIR="${DATA_DIR:-/app/data}"
export UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"

AS_NODE=""
if [ "$(id -u)" = "0" ]; then
  for dir in "$DATA_DIR" "$UPLOAD_DIR"; do
    mkdir -p "$dir"
    # Recursive, so a file left behind by a root shell is fixed on the next
    # start. Not fatal: a Docker Desktop bind mount (docker-compose.yml)
    # belongs to the host and is already writable — but say so when the
    # folder really is not, instead of letting the server fail later.
    if ! chown -R node:node "$dir" 2>/dev/null && ! su-exec node test -w "$dir"; then
      echo "vmp-entrypoint: $dir is not writable by the node user" >&2
    fi
  done
  AS_NODE="su-exec node"
fi

if [ -n "${LITESTREAM_REPLICA_URL:-}" ]; then
  # Restore before the server opens the database. If a backup exists but
  # cannot be read, stop here (set -e) and let the host restart us: starting
  # on an empty database would stream it over the real one. Only the very
  # first boot, with no backup yet, may start empty (-if-replica-exists).
  $AS_NODE litestream restore -config /etc/litestream.yml \
    -if-db-not-exists -if-replica-exists "$DATA_DIR/vaishnavi.sqlite"
  # Litestream runs the server as its child, passes SIGTERM on to it, and
  # ships the last changes before it exits.
  exec $AS_NODE litestream replicate -config /etc/litestream.yml -exec "$*"
fi

exec $AS_NODE "$@"
