#!/usr/bin/env bash
# ================================================================
#  fix_backend.sh  — Fixes 3 bugs in Hii-Backend
#  Run from: Hii-Backend/ root directory
#  Usage:    bash fix_backend.sh
# ================================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Hii Backend — Bug Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────────────────────────
# Fix 1 of 3 — Create the missing userRolesRoute.js
# Without this the server crashes immediately on startup:
#   ReferenceError: userRolesRoute is not defined
# ─────────────────────────────────────────────────────────────────
echo ""
echo "[ Fix 1/3 ]  Creating missing userRolesRoute.js..."

cat > src/routes/admin/userRolesRoute.js << 'EOF'
/** @format */
import express from "express";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

/**
 * GET  /user-roles
 * Returns all available admin role names.
 * Extend with real CRUD role-management logic as the feature grows.
 */
route.get("/", adminauth, (req, res) => {
  res.json({
    success: true,
    message: "User roles fetched successfully",
    data: [
      "SUPER_ADMIN",
      "NORMAL_ADMIN",
      "CLUB_ADMIN",
      "EVENT_ADMIN",
      "CITY_ADMIN",
    ],
  });
});

export default route;
EOF

echo "   ✅  Created src/routes/admin/userRolesRoute.js"

# Add the missing import into admin/index.js
python3 - << 'PYEOF'
path = "src/routes/admin/index.js"
with open(path, "r") as f:
    content = f.read()

marker     = 'import searchRoute from "./searchRoute.js"'
new_import = 'import userRolesRoute from "./userRolesRoute.js"'

if new_import in content:
    print("   ℹ️   userRolesRoute import already present — skipping")
elif marker in content:
    content = content.replace(marker, f'{marker}\n{new_import}')
    with open(path, "w") as f:
        f.write(content)
    print("   ✅  Added userRolesRoute import to src/routes/admin/index.js")
else:
    print("   ⚠️   Anchor line not found — add this import manually:")
    print(f"         {new_import}")
PYEOF

# ─────────────────────────────────────────────────────────────────
# Fix 2 of 3 — socket_config.js: offline status was never sent
# The else-branch repeated the same condition that was just proven
# false, so "offline" could never be emitted.
# ─────────────────────────────────────────────────────────────────
echo ""
echo "[ Fix 2/3 ]  Fixing socket user_status offline bug..."

python3 - << 'PYEOF'
import re

path = "src/config/socket_config.js"
with open(path, "r") as f:
    content = f.read()

# Match the broken handler loosely so minor whitespace doesn't matter
pattern = re.compile(
    r"socket\.on\('user_status',\s*\(\{\s*user_id,\s*check_user_id\s*\}\)\s*=>\s*\{.*?\}\s*\)\s*\n",
    re.DOTALL
)

replacement = """    socket.on('user_status', ({ user_id, check_user_id }) => {
      const activeUser = userManager.getActiveUserById(user_id);
      const checked    = userManager.getActiveUserById(check_user_id);
      // FIX: the original else-branch re-checked the SAME condition
      // that was just proven false, so "offline" was NEVER emitted.
      // Now: if the requesting socket is online, always reply with
      // the correct status of the user they asked about.
      if (activeUser) {
        const status = checked ? "online" : "offline";
        io.to(activeUser.socketId).emit("user_status", {
          userId: check_user_id,
          status,
        });
      }
    })
"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open(path, "w") as f:
        f.write(content)
    print("   ✅  Fixed user_status offline bug in socket_config.js")
else:
    print("   ⚠️   Pattern not matched — apply manually:")
    print("        In socket.on('user_status', ...) replace the entire")
    print("        if/else block with:  if (activeUser) { const status =")
    print("        checked ? 'online' : 'offline'; io.to(...).emit(...) }")
PYEOF

# ─────────────────────────────────────────────────────────────────
# Fix 3 of 3 — socket_config.js: replace the fragile
# `configureSocket.io = io` function-property pattern with a
# safe getter so callers always hold a live reference
# ─────────────────────────────────────────────────────────────────
echo ""
echo "[ Fix 3/3 ]  Replacing configureSocket.io stale-reference pattern..."

python3 - << 'PYEOF'
path = "src/config/socket_config.js"
with open(path, "r") as f:
    content = f.read()

old = "configureSocket.io = io;"
new = (
    "// Use a getter instead of a bare property assignment so callers\n"
    "// always receive the live io reference, not a stale snapshot.\n"
    "configureSocket.getIO = () => io;"
)

if old in content:
    content = content.replace(old, new)
    with open(path, "w") as f:
        f.write(content)
    print("   ✅  Replaced configureSocket.io = io with configureSocket.getIO()")
elif "configureSocket.getIO" in content:
    print("   ℹ️   getIO pattern already present — skipping")
else:
    print("   ⚠️   Pattern not found — skipping (non-critical)")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  All backend fixes applied."
echo "  Restart the server:  npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
