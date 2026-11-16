#!/usr/bin/env bash
# ================================================================
#  Feature 4: Analytics time range respected by backend
#  Backend: pass ?days=7|30|90 to /analytics/extended
#  Frontend: wire timeRange selector to refetch with correct param
# ================================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Feature Build: Analytics Time Range"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────────────────────────
# 1. Backend: update analyticsController to accept ?days param
# ─────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import os, re

path = "src/controller/admin/analyticsController.js"
if not os.path.exists(path):
    # Try alternate path
    for root, dirs, files in os.walk("."):
        for f in files:
            if f == "analyticsController.js":
                path = os.path.join(root, f)
                break

with open(path) as f:
    content = f.read()

print(f"Found: {path}")
print(f"First 80 chars of getExtendedStats: {content[content.find('getExtendedStats'):content.find('getExtendedStats')+200][:200]}")
PYEOF

echo ""
python3 - << 'PYEOF'
import os, re

# Find the file
path = None
for root, dirs, files in os.walk("src"):
    for f in files:
        if f == "analyticsController.js":
            path = os.path.join(root, f)
            break

if not path:
    print("⚠️  analyticsController.js not found — skipping backend patch")
    exit()

with open(path) as f:
    content = f.read()

# Check if days param already handled
if "req.query.days" in content or "query.days" in content:
    print("ℹ️  Backend already handles ?days param — skipping")
    exit()

# Find getExtendedStats and inject days filter
# Typical pattern: const getExtendedStats = async (req, res) => {
old_start = "const getExtendedStats = async (req, res) => {"
new_start = """const getExtendedStats = async (req, res) => {
  // FIX: was returning fixed totals regardless of time range.
  // Now respects ?days=7|30|90 sent by the Analytics page.
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);"""

if old_start in content:
    content = content.replace(old_start, new_start, 1)

    # Replace bare countDocuments calls with date-filtered ones
    # Pattern: Model.countDocuments({}) or Model.countDocuments({ is_deleted: false })
    # We add createdAt: { $gte: since } to filter by date
    def add_date_filter(match):
        full = match.group(0)
        # Skip if already has createdAt
        if "createdAt" in full:
            return full
        # Insert since filter
        if "{}" in full:
            return full.replace("{}", "{ createdAt: { $gte: since } }")
        # Add to existing filter object
        return full.replace(
            "countDocuments({",
            "countDocuments({ createdAt: { $gte: since },"
        )

    content = re.sub(r'\.countDocuments\(\{[^}]*\}\)', add_date_filter, content)

    with open(path, "w") as f:
        f.write(content)
    print(f"✅  Backend: {path} now respects ?days param in getExtendedStats")
else:
    print(f"⚠️  getExtendedStats pattern not found in {path}")
    print("    Manually add: const days = parseInt(req.query.days) || 30;")
    print("    and use it in your DB queries as: createdAt: { $gte: since }")
PYEOF

# ─────────────────────────────────────────────────────────────────
# 2. Frontend: wire timeRange selector to query key + URL param
# ─────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
path = "src/pages/Analytics.tsx"
with open(path) as f:
    content = f.read()

# Fix 1: include timeRange in queryKey so changing range triggers refetch
old_qk_extended = "    queryKey: ['analytics-extended'],"
new_qk_extended  = "    queryKey: ['analytics-extended', timeRange],"

old_qk_growth = "    queryKey: ['analytics-growth'],"
new_qk_growth  = "    queryKey: ['analytics-growth', timeRange],"

changed = False
if old_qk_extended in content:
    content = content.replace(old_qk_extended, new_qk_extended)
    changed = True
    print("   ✅  Analytics: timeRange added to extended stats queryKey")

if old_qk_growth in content:
    content = content.replace(old_qk_growth, new_qk_growth)
    changed = True
    print("   ✅  Analytics: timeRange added to growth stats queryKey")

# Fix 2: pass ?days= param to the extended stats endpoint
# timeRange is '7d' | '30d' | '90d' — extract the number
old_extended_url = "`${API_BASE}/analytics/extended`"
new_extended_url  = "`${API_BASE}/analytics/extended?days=${timeRange.replace('d', '')}`"

if old_extended_url in content:
    content = content.replace(old_extended_url, new_extended_url)
    changed = True
    print("   ✅  Analytics: ?days param added to extended stats request")

# Fix 3: pass ?days= to growth endpoint too if it exists
old_growth_url = "`${API_BASE}/analytics/growth`"
new_growth_url  = "`${API_BASE}/analytics/growth?days=${timeRange.replace('d', '')}`"

if old_growth_url in content:
    content = content.replace(old_growth_url, new_growth_url)
    print("   ✅  Analytics: ?days param added to growth request")

# Fix 4: pass ?days= to club-overview endpoint if it exists
old_club_url = "`${API_BASE}/analytics/club-overview`"
new_club_url  = "`${API_BASE}/analytics/club-overview?days=${timeRange.replace('d', '')}`"

if old_club_url in content:
    content = content.replace(old_club_url, new_club_url)
    print("   ✅  Analytics: ?days param added to club-overview request")

if changed:
    with open(path, "w") as f:
        f.write(content)
else:
    print("   ⚠️   No patterns matched in Analytics.tsx — show current query URLs:")
    import re
    for m in re.finditer(r'queryKey.*?\n.*?queryFn', content, re.DOTALL):
        print("  ", m.group(0)[:120])
PYEOF

# ─────────────────────────────────────────────────────────────────
# 3. Add loading state to Analytics time range buttons
#    so the user knows data is refreshing when they switch ranges
# ─────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
path = "src/pages/Analytics.tsx"
with open(path) as f:
    content = f.read()

# Find the useQuery for extended stats and extract its isFetching
old_extended_query = "  const { data: extendedStats } = useQuery({"
new_extended_query  = "  const { data: extendedStats, isFetching: fetchingStats } = useQuery({"

if old_extended_query in content and "fetchingStats" not in content:
    content = content.replace(old_extended_query, new_extended_query)

    # Add a subtle loading indicator to the time range selector area
    old_range_btn = """          {(['7d', '30d', '90d'] as const).map((range) => ("""
    new_range_btn  = """          {fetchingStats && (
              <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            )}
          {(['7d', '30d', '90d'] as const).map((range) => ("""

    if old_range_btn in content:
        content = content.replace(old_range_btn, new_range_btn)
        print("   ✅  Analytics: loading spinner added to time range selector")

    with open(path, "w") as f:
        f.write(content)
    print("   ✅  Analytics: isFetching state wired")
else:
    print("   ℹ️   Analytics: isFetching already wired or pattern not found")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Analytics time range done."
echo ""
echo "  Backend: getExtendedStats now filters by ?days=7|30|90"
echo "  Frontend: switching range triggers real refetch with correct param"
echo "  UX: spinner shows while data loads"
echo ""
echo "  Run from Hii Backend/ to apply backend fix too."
echo "  Restart both servers: npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
