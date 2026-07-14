#!/bin/sh
set -e

# Railway (and most volume mounts) attach external volumes owned by root, even
# though the app runs as the non-root "nextjs" user below. Reconcile ownership
# once at startup so better-sqlite3 can create/open todos.db there.
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
  mkdir -p "$RAILWAY_VOLUME_MOUNT_PATH"
  chown -R nextjs:nodejs "$RAILWAY_VOLUME_MOUNT_PATH" || true
fi

exec su nextjs -s /bin/sh -c "exec node server.js"
