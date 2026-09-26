"""
Hii-Backend - fixes for bugs you can't see by using the app.
Run from the Hii-Backend root (after admin_notifications_backend.py):
    python3 hidden_bugs_backend.py
Safe to run more than once.

 1. Contact Us: the app sent messages to an address that didn't exist - every
    message was lost. Now filed as a support request + admins notified.
 2. Booking privacy: any member could open anyone's booking (name, email,
    phone, amounts) by ID. Now: only the booker or friends they invited.
 3. India time: "today" was UTC on the server - wrong between midnight and
    5:30 AM (ended events shown as upcoming, bookings in the wrong tab).
 4. Removed an open test endpoint that let anyone send push notifications.
 5. Admin search boxes / duplicate checks no longer break on ( ) + ? etc.
 6. Chat: only a conversation's two members can load its messages; delete /
    friends-list act only as the logged-in user; fixed a crash that could
    take the whole server down; plus a safety net for any other such error.
"""
import os, re, sys
def rd(p): return open(p, encoding="utf-8", newline="").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="").write(s)
def NL(s): return "\r\n" if "\r\n" in s else "\n"
changed = []
def done(p): changed.append(p)
def need(c, what):
    if not c: sys.exit("  !! " + what + " - stopping (files already fixed stay fixed; re-run is safe)")
def add_import(s, line):
    last = list(re.finditer(r"^import [^\r\n]*", s, re.M))[-1]
    return s[:last.end()] + NL(s) + line + s[last.end():]

if not os.path.exists("src/utility/adminNotify.js"):
    sys.exit("  !! Run admin_notifications_backend.py first, then this script.")

# ---------------------------------------------------------------- helpers
p = "src/utility/escapeRegex.js"
if not os.path.exists(p):
    wr(p, "// Makes typed text safe to use inside a search pattern: ( ) + ? * etc.\n"
          "// are matched literally instead of breaking the search.\n"
          "const escapeRegex = (s) => String(s ?? \"\").replace(/[.*+?^${}()|[\\]\\\\]/g, \"\\\\$&\");\n"
          "export default escapeRegex;\n"); done(p)
p = "src/config/timezone.js"
if not os.path.exists(p):
    wr(p, "import dotenv from \"dotenv\";\ndotenv.config();\n\n"
          "// The server's \"local time\" = India time, so every \"start of today\" and\n"
          "// date calculation matches what members see. (Servers usually run on UTC,\n"
          "// 5.5 hours behind - wrong between midnight and 5:30 AM, peak nightlife\n"
          "// hours.) Must stay the FIRST import in app.js. Change via APP_TIMEZONE.\n"
          "process.env.TZ = process.env.APP_TIMEZONE || \"Asia/Kolkata\";\n"); done(p)

# ---------------------------------------------------------------- app.js
p = "app.js"; s = rd(p); nl = NL(s)
if "./src/config/timezone.js" not in s:
    s = "import \"./src/config/timezone.js\"; // must be first - see file" + nl + s
    m = re.search(r"^dotenv\.config\(\);[^\r\n]*", s, re.M)
    need(m, "app.js: dotenv.config() not found")
    s = s[:m.end()] + nl + nl.join([
        "",
        "// Safety net: an error inside an async handler (e.g. a chat event) must",
        "// never stop the whole server - Node exits on unhandled rejections.",
        "process.on(\"unhandledRejection\", (reason) => {",
        "  console.error(\"[unhandledRejection]\", reason);",
        "});"]) + s[m.end():]
    wr(p, s); done(p)

# ---------------------------------------------------------------- 1. Contact Us
p = "src/controller/app/manageController.js"; s = rd(p); nl = NL(s)
if "sendMessageToAdmin" not in s:
    s = s.replace("import { User, Venue, Booking, VenueLike, Event, EventLike, TrendingSearch, Friendship, UserBlock, Content } from \"../../model/index.js\";",
                  "import { User, Venue, Booking, VenueLike, Event, EventLike, TrendingSearch, Friendship, UserBlock, Content, ReportProblem } from \"../../model/index.js\";", 1)
    need("ReportProblem } from" in s, "manageController.js: model import line not found")
    s = add_import(s, 'import { notifyMainAdmins } from "../../utility/adminNotify.js";')
    fn = nl.join([
        "",
        "// POST /common/send_messageTo_admin - app Profile > Contact Us.",
        "// The app always called this, but it never existed, so every message was",
        "// lost. Filed as a support request (admin Support & Activity > Requests)",
        "// and the main admins are notified.",
        "const sendMessageToAdmin = async (req, res) => {",
        "  try {",
        "    const description = String(req.body?.description || \"\").trim();",
        "    if (!description) return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);",
        "    const request = await ReportProblem.create({",
        "      user_id: req.userId,",
        "      description: `[Contact us] ${description}`.slice(0, 2000),",
        "      attachments: [],",
        "    });",
        "    notifyMainAdmins({",
        "      title: \"New Contact Us message\",",
        "      message: description.slice(0, 120),",
        "      action: \"support_request\",",
        "      action_json: { request_id: request._id },",
        "    });",
        "    return apiResponse.ok(res, {}, messages.CONTACT_RECEIVED);",
        "  } catch (error) {",
        "    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);",
        "  }",
        "};",
        ""])
    old = "export default { getContent,"
    need(s.count(old) == 1, "manageController.js: export not found")
    s = s.replace(old, fn + nl + "export default { sendMessageToAdmin, getContent,", 1)
    wr(p, s); done(p)
p = "src/routes/app/allRoutes.js"; s = rd(p); nl = NL(s)
if "send_messageTo_admin" not in s:
    a = "    .get('/filter_events_venues', appAuth, manageController.filterEventsVenues)"
    need(s.count(a) == 1, "allRoutes.js anchor not found")
    s = s.replace(a, "    .post('/send_messageTo_admin', appAuth, manageController.sendMessageToAdmin)" + nl + a, 1)
    wr(p, s); done(p)

# ---------------------------------------------------------------- 2. booking privacy
GUARD = [
    "        // Only the member who booked (or a friend they invited) may see it -",
    "        // it contains their name, email, phone number and payment details.",
    "        const viewerId = String(req.userId);",
    "        const invitedIds = (booking.invited_friend_ids || []).map(String);",
    "        if (String(booking.user_id) !== viewerId && !invitedIds.includes(viewerId)) {",
    "            return apiResponse.badRequest(res, messages.BOOKING_NOT_FOUND);",
    "        }"]
for p, fn in [("src/controller/app/venueController.js", "venueBookingSummary"),
              ("src/controller/app/eventController.js", "eventBookingSummary")]:
    s = rd(p); nl = NL(s)
    start = s.find("const " + fn)
    need(start >= 0, p + ": " + fn + " not found")
    if "viewerId" in s[start:start + 4000]:
        print("SKIP", p.split("/")[-1]); continue
    m = re.compile(r"if \(!booking\) \{\s*\r?\n\s*return apiResponse\.badRequest\(res, messages\.BOOKING_NOT_FOUND\);?\s*\r?\n\s*\}").search(s, start)
    need(m and m.start() - start < 1500, p + ": not-found check not found")
    s = s[:m.end()] + nl + nl + nl.join(GUARD) + s[m.end():]
    wr(p, s); done(p)

# ---------------------------------------------------------------- 3. India time (venue page)
p = "src/controller/app/venueController.js"; s = rd(p)
old = 'const today = new Date().toISOString().split("T")[0];'
if old in s:
    s = s.replace(old, 'const today = new Date().toLocaleDateString("en-CA", { timeZone: process.env.TZ || "Asia/Kolkata" }); // India date, not UTC')
    wr(p, s)
    if p not in changed: done(p)

# ---------------------------------------------------------------- 4. open test endpoint
p = "src/routes/app/userRoute.js"; s = rd(p)
i = s.find('route.get("/test-push/:token"')
if i >= 0:
    d = 0; j = s.index("{", i)
    k = j
    while True:
        if s[k] == "{": d += 1
        elif s[k] == "}":
            d -= 1
            if d == 0: break
        k += 1
    end = s.index(");", k) + 2
    s = s[:i] + "// (removed: open /test-push endpoint - anyone could send pushes)" + s[end:]
    wr(p, s); done(p)

# ---------------------------------------------------------------- 5. admin search boxes
EDITS = {
 "src/controller/admin/userController.js": [('new RegExp(search.trim(), "i")', 'new RegExp(escapeRegex(search.trim()), "i")')],
 "src/controller/admin/activityLogController.js": [('new RegExp(search.trim(), "i")', 'new RegExp(escapeRegex(search.trim()), "i")')],
 "src/controller/admin/genreController.js": [("$regex: search,", "$regex: escapeRegex(search),"), ("new RegExp(`^${name}$`", "new RegExp(`^${escapeRegex(name)}$`")],
 "src/controller/admin/faqController.js": [("new RegExp(`^${question}$`", "new RegExp(`^${escapeRegex(question)}$`")],
 "src/controller/admin/interestController.js": [("new RegExp(`^${interest}$`", "new RegExp(`^${escapeRegex(interest)}$`"), ("$regex: `^${interest}$`", "$regex: `^${escapeRegex(interest)}$`")],
 "src/controller/admin/vibeController.js": [("$regex: `^${vibe}$`", "$regex: `^${escapeRegex(vibe)}$`")],
}
for p, pairs in EDITS.items():
    if not os.path.exists(p): continue
    s = rd(p)
    if "utility/escapeRegex.js" in s:
        print("SKIP", p.split("/")[-1]); continue
    before = s
    for old, new in pairs: s = s.replace(old, new)
    if s != before:
        s = add_import(s, 'import escapeRegex from "../../utility/escapeRegex.js";')
        wr(p, s); done(p)

# ---------------------------------------------------------------- 6. chat (socket)
p = "src/config/socket_config.js"; s = rd(p); nl = NL(s)
if "only the logged-in member" in s:
    print("SKIP socket_config.js")
else:
    def rep(pattern, new):
        global s
        m = re.search(pattern, s)
        need(m, "socket_config.js: handler not found: " + pattern[:50])
        s = s[:m.start()] + new.replace("\n", nl) + s[m.end():]
    rep(r'socket\.on\("get_message_list", async \(data\) => \{[\s\S]*?\n    \}\);',
        '''socket.on("get_message_list", async (data) => {
      // Security: only the logged-in member, and only for a conversation they
      // are part of (it used to trust ids sent by the app, so anyone with a
      // conversation id could load its messages).
      try {
        if (!data?.conversation_id) return;
        const conv = await Conversation.findById(data.conversation_id).select("sender_id receiver_id").lean();
        if (!conv || ![String(conv.sender_id), String(conv.receiver_id)].includes(String(userId))) return;
        const result = await getMessage({ ...data, user_id: userId });
        const user = userManager.getUserById(userId);
        if (user && user.socketId) io.to(user.socketId).emit("get_message_list", result);
      } catch (err) {
        console.error("[socket get_message_list]", err.message);
      }
    });''')
    rep(r'socket\.on\("get_conversation_list", async \(data\) => \{[\s\S]*?\n    \}\);',
        '''socket.on("get_conversation_list", async (data) => {
      try {
        const result = await getConversation({ ...(data || {}), user_id: userId }); // only the logged-in member
        const user = userManager.getUserById(userId);
        if (user && user.socketId) io.to(user.socketId).emit("get_conversation_list", result);
      } catch (err) {
        console.error("[socket get_conversation_list]", err.message);
      }
    });''')
    rep(r'socket\.on\("message_deleted", async \(data\) => \{[\s\S]*?\n    \}\);',
        '''socket.on("message_deleted", async (data) => {
      try {
        if (!data?.message_id) return;
        const result = await deleteMessage({ ...data, user_id: userId }); // only the logged-in member
        const user = userManager.getUserById(userId);
        if (user && user.socketId) io.to(user.socketId).emit("delete_message", result); // was: crashed the server if not found
      } catch (err) {
        console.error("[socket message_deleted]", err.message);
      }
    });''')
    rep(r'socket\.on\("recend_firends_list", async \(data\) => \{[\s\S]*?\n    \}\);',
        '''socket.on("recend_firends_list", async (data) => {
      try {
        const result = await recendFirendsList({ ...(data || {}), user_id: userId }); // only the logged-in member
        const user = userManager.getUserById(userId);
        if (user && user.socketId) io.to(user.socketId).emit("recend_firends_list", result); // was: crashed the server if not found
      } catch (err) {
        console.error("[socket recend_firends_list]", err.message);
      }
    });''')
    wr(p, s); done(p)

print("\nDone. Files changed:" if changed else "\nNothing to change.")
for c in changed: print("  -", c)
