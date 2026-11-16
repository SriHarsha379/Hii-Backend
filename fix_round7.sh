#!/usr/bin/env bash
# ================================================================
#  fix_round7.sh — Round 7 fixes (all in App.tsx)
#  Run from: hii-app-admin-dashboard/ root
# ================================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Round 7 — App.tsx Fixes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

python3 - << 'PYEOF'
path = "src/App.tsx"
with open(path) as f:
    content = f.read()

original = content

# ─────────────────────────────────────────────────────────────────
# Fix 1 — Ticketing: add ProtectedRoute with allowed roles
# SUPER_ADMIN manages ticketing for all venues
# CLUB_ADMIN/EVENT_ADMIN manage their own
# ─────────────────────────────────────────────────────────────────
old_ticketing = '              <Route path="ticketing" element={<Ticketing />} />'
new_ticketing = '              <Route path="ticketing" element={<ProtectedRoute allowedRoles={[\'SUPER_ADMIN\', \'CLUB_ADMIN\', \'EVENT_ADMIN\', \'NORMAL_ADMIN\']}><Ticketing /></ProtectedRoute>} />'

if old_ticketing in content:
    content = content.replace(old_ticketing, new_ticketing)
    print("✅  Fix 1: Ticketing route now wrapped with ProtectedRoute")
elif "ProtectedRoute" in content and "Ticketing" in content:
    # Check if already fixed
    import re
    if re.search(r'ProtectedRoute[^>]*>.*?<Ticketing', content):
        print("ℹ️   Fix 1: Ticketing already has ProtectedRoute — skipping")
    else:
        print("⚠️   Fix 1: Pattern not matched — manually wrap Ticketing route with ProtectedRoute")
        print("           allowedRoles={['SUPER_ADMIN','CLUB_ADMIN','EVENT_ADMIN','NORMAL_ADMIN']}")

# ─────────────────────────────────────────────────────────────────
# Fix 2 — Settings: open to NORMAL_ADMIN and CITY_ADMIN too
# They need to change their own password — the page already
# handles all roles correctly, it was just never made accessible.
# ─────────────────────────────────────────────────────────────────
old_settings = "              <Route path=\"settings\" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Settings /></ProtectedRoute>} />"
new_settings  = "              <Route path=\"settings\" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'NORMAL_ADMIN', 'CITY_ADMIN']}><Settings /></ProtectedRoute>} />"

if old_settings in content:
    content = content.replace(old_settings, new_settings)
    print("✅  Fix 2: /settings now accessible to NORMAL_ADMIN + CITY_ADMIN")
else:
    # Try flexible match
    import re
    pattern = re.compile(
        r'(<Route path="settings" element=\{<ProtectedRoute allowedRoles=\{)\[\'SUPER_ADMIN\'\](\}><Settings)'
    )
    if pattern.search(content):
        content = pattern.sub(
            r"\1['SUPER_ADMIN', 'NORMAL_ADMIN', 'CITY_ADMIN']\2",
            content
        )
        print("✅  Fix 2: /settings opened to NORMAL_ADMIN + CITY_ADMIN (via regex)")
    else:
        print("⚠️   Fix 2: Pattern not matched — manually add 'NORMAL_ADMIN', 'CITY_ADMIN'")
        print("           to the allowedRoles array on the /settings route in App.tsx")

# ─────────────────────────────────────────────────────────────────
# Fix 3 — Remove dead Recommendations import; wire ComingSoon
# to the recommendations route instead of Navigate
# ─────────────────────────────────────────────────────────────────

# 3a. Replace dead Recommendations import with ComingSoon
old_import = "import Recommendations from './pages/Recommendations';"
new_import  = "import ComingSoon from './pages/ComingSoon';"

if old_import in content:
    content = content.replace(old_import, new_import)
    print("✅  Fix 3a: Replaced dead Recommendations import with ComingSoon")
elif "import ComingSoon" in content:
    print("ℹ️   Fix 3a: ComingSoon already imported — skipping")
else:
    print("⚠️   Fix 3a: Neither Recommendations nor ComingSoon import found")

# 3b. Wire ComingSoon to the recommendations route
old_route = '              <Route path="recommendations" element={<Navigate to="/" replace />} />'
new_route  = '              <Route path="recommendations" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />'

if old_route in content:
    content = content.replace(old_route, new_route)
    print("✅  Fix 3b: /recommendations now renders ComingSoon page")
elif "ComingSoon" in content and "recommendations" in content:
    print("ℹ️   Fix 3b: ComingSoon already on recommendations route — skipping")
else:
    print("⚠️   Fix 3b: recommendations route pattern not found — update it manually")

# ─────────────────────────────────────────────────────────────────
# Write + verify
# ─────────────────────────────────────────────────────────────────
if content != original:
    with open(path, "w") as f:
        f.write(content)
    print("\n✅  App.tsx written successfully")
else:
    print("\nℹ️   No changes written — all may already be correct")

# Verify key lines
print("\nVerification:")
with open(path) as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if "ticketing" in l.lower() or \
       ("settings" in l and "allowedRoles" in l) or \
       "recommendations" in l or \
       "ComingSoon" in l:
        print(f"  LINE {i+1}: {repr(l.rstrip())}")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Round 7 fixes done."
echo "  Restart dev server:  npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
