"""
Hii-Backend - table reservations & tickets on the right dates.
Run from the Hii-Backend root, AFTER hidden_bugs_backend.py (India time):
    python3 booking_dates_backend.py
Safe to run more than once.

 * After-midnight reservations were saved a DAY EARLY ("Fri + 1:00 am" means
   Saturday 1 AM, but was stored as Friday 1 AM).
 * Booking for tonight hid all after-midnight slots (1 AM "looked" earlier
   than 9 PM because only hours were compared).
 * The server now refuses reservations in the past, on a closed day or outside
   opening hours, and tickets for events that have already ended.
"""
import os, re, sys
def rd(p): return open(p, encoding="utf-8", newline="").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="").write(s)
if not os.path.exists("src/config/timezone.js"):
    sys.exit("  !! Run hidden_bugs_backend.py first (server must run on India time).")
p = "src/controller/app/bookingController.js"; s = rd(p); nl = "\r\n" if "\r\n" in s else "\n"
if "nightStartDay" in s:
    print("SKIP bookingController.js (already updated)"); sys.exit()

# 1) slot list: compare the full date & time, not just hours
m = re.search(r"if \(\s*isToday &&\s*\(\s*slotStart\.getHours\(\) < now\.getHours\(\) \|\|\s*\(slotStart\.getHours\(\) === now\.getHours\(\) &&\s*slotStart\.getMinutes\(\) <= now\.getMinutes\(\)\)\s*\)\s*\) continue", s)
if not m: sys.exit("  !! slot-list time filter not found")
s = s[:m.start()] + "// Hide slots that have already started - full date & time, so tonight's" + nl + \
    "      // after-midnight slots (e.g. 1 AM) aren't hidden as \"earlier\" than 9 PM." + nl + \
    "      if (slotStart.getTime() <= Date.now()) continue" + s[m.end():]

# 2) reservation: right day for after-midnight slots + past / closed / hours checks
a = s.find("const createVenueBooking")
m = re.compile(r"if \(isNaN\(slotDateTime\.getTime\(\)\)\) \{\s*\r?\n\s*return apiResponse\.badRequest\(res, messages\.INVALID_SLOTS\);\s*\r?\n\s*\}").search(s, a)
if not m or a < 0: sys.exit("  !! reservation slot check not found")
block = nl.join([
    "",
    "",
    "    /* ============ RIGHT NIGHT, NOT IN THE PAST, CLUB OPEN ============ */",
    "    // The slot list shows a night's slots under the date the night STARTS:",
    "    // \"Fri + 1:00 am\" means Saturday 1 AM (it used to be saved a day early).",
    "    const toMinutes = (t) => {",
    "      const mm = String(t || \"\").trim().match(/^(\\d{1,2}):(\\d{2})\\s*([AaPp][Mm])?$/);",
    "      if (!mm) return null;",
    "      let h = Number(mm[1]) % 24;",
    "      if (mm[3]) { const pm = mm[3].toLowerCase() === \"pm\"; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }",
    "      return h * 60 + Number(mm[2]);",
    "    };",
    "    const openMin = toMinutes(venue.start_time);",
    "    const closeMin = toMinutes(venue.end_time);",
    "    const slotMin = hours * 60 + minutes;",
    "    const overnight = openMin != null && closeMin != null && closeMin <= openMin;",
    "    if (overnight && slotMin < closeMin) {",
    "      slotDateTime.setTime(slotDateTime.getTime() + 24 * 60 * 60 * 1000);",
    "    }",
    "    if (slotDateTime.getTime() < Date.now() - 15 * 60 * 1000) {",
    "      return apiResponse.badRequest(res, \"That time has already passed. Please pick another slot.\");",
    "    }",
    "    const nightStartDay = [\"Sunday\", \"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\", \"Saturday\"][",
    "      new Date(`${date}T12:00:00+05:30`).getUTCDay()];",
    "    if (Array.isArray(venue.open_days) && venue.open_days.length && !venue.open_days.includes(nightStartDay)) {",
    "      return apiResponse.badRequest(res, `${venue.venue_name || \"The venue\"} is closed on ${nightStartDay}.`);",
    "    }",
    "    if (openMin != null && closeMin != null) {",
    "      const inHours = overnight ? (slotMin >= openMin || slotMin < closeMin) : (slotMin >= openMin && slotMin < closeMin);",
    "      if (!inHours) {",
    "        return apiResponse.badRequest(res, `${venue.venue_name || \"The venue\"} isn't open at that time. Please pick another slot.`);",
    "      }",
    "    }"])
s = s[:m.end()] + block + s[m.end():]

# 3) tickets: not for events that have already ended
a = s.find("const createEventBooking")
m = re.compile(r"if \(!event\) \{\s*\r?\n\s*await session\.abortTransaction\(\)\s*\r?\n\s*return apiResponse\.badRequest\(res, messages\.NO_DATA_FOUND\)\s*\r?\n\s*\}").search(s, a)
if not m or a < 0: sys.exit("  !! event lookup not found")
s = s[:m.end()] + nl + nl.join([
    "",
    "    // No tickets for an event that has already ended (dates are YYYY-MM-DD).",
    "    const todayIndia = new Date().toLocaleDateString(\"en-CA\", { timeZone: \"Asia/Kolkata\" })",
    "    if (event.end_date && String(event.end_date) < todayIndia) {",
    "      await session.abortTransaction()",
    "      return apiResponse.badRequest(res, \"This event has already ended.\")",
    "    }"]) + s[m.end():]
wr(p, s)
print("OK: bookingController.js - right night for after-midnight slots, past/closed/hours checks, ended events")
