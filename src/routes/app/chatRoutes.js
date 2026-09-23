/* =====================================================================
   HII OWL 2.0 - AI nightlife concierge            (OWL_VERSION = 2)
   ---------------------------------------------------------------------
   POST /chat/stream  -> Server-Sent Events: status / text / cards / done
   POST /chat/send    -> same answer as one JSON response (fallback and
                         older app versions): data = { reply, cards }
   Env (all optional):
     ANTHROPIC_API_KEY   required for the owl to work at all
     AI_MODEL            default "claude-sonnet-5" (falls back to
                         "claude-sonnet-4-5" automatically if unavailable)
     AI_DAILY_LIMIT      messages per member per day, default 40
     APP_TIMEZONE        default "Asia/Kolkata"
   ===================================================================== */
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import moment from "moment-timezone";
import { Venue, Event, Category, City, User, VenueLike, Ticket } from "../../model/index.js";
import AiUsage from "../../model/aiUsageModel.js";
import { appAuth } from "../../middleware/authMiddleware.js";

const route = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const PRIMARY_MODEL = process.env.AI_MODEL || "claude-sonnet-5";
const FALLBACK_MODEL = "claude-sonnet-4-5";
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 40);
const MAX_HISTORY = 12;       // only the most recent turns are sent to the AI
const MAX_MSG_CHARS = 1500;   // per message
const MAX_TOOL_TURNS = 5;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ------------------------------------------------------------ helpers */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = (s) => new RegExp(escapeRegex(String(s).trim()), "i");
const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
};

function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const R = 6371, toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// "22:00" / "9:30 PM" -> minutes after midnight
function toMinutes(t) {
  const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = Number(m[1]) % 24;
  const min = Number(m[2]);
  if (m[3]) {
    const pm = m[3].toLowerCase() === "pm";
    if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
  }
  return h * 60 + min;
}

function fmtTime(t) {
  const mins = toMinutes(t);
  if (mins == null) return String(t || "");
  return moment().startOf("day").add(mins, "minutes").format("h:mm A");
}

function isOpenNow(venue, now) {
  const start = toMinutes(venue.start_time), end = toMinutes(venue.end_time);
  if (start == null || end == null) return null;
  const days = venue.open_days || [];
  const t = now.hours() * 60 + now.minutes();
  const today = WEEKDAYS[now.day()], yesterday = WEEKDAYS[(now.day() + 6) % 7];
  if (end > start) return days.includes(today) && t >= start && t < end;
  return (days.includes(today) && t >= start) || (days.includes(yesterday) && t < end); // overnight
}

async function categoryIdsMatching(text, categoryType) {
  if (!text) return null;
  const cats = await Category.find({
    category_type: categoryType, category_name: rx(text), is_active: true, is_deleted: false,
  }).select("_id").lean();
  return cats.map((c) => c._id);
}

async function cityIdsMatching(text) {
  if (!text) return [];
  const cities = await City.find({ city_name: rx(text) }).select("_id").lean();
  return cities.map((c) => c._id);
}

/* ------------------------------------------------------ member context */
async function loadMemberContext(userId) {
  const user = await User.findById(userId)
    .select("name first_name latitude longitude radius city_id music_genre custom_music_genres event_preferences custom_event_preferences hobbies")
    .populate("city_id", "city_name")
    .populate("music_genre", "name")
    .populate("event_preferences", "category_name")
    .lean();
  const liked = await VenueLike.find({ user_id: userId, is_liked: true, is_active: true })
    .select("venue_id").lean();
  return {
    user,
    name: (user?.first_name || user?.name || "").trim().split(/\s+/)[0] || "",
    lat: user?.latitude ?? null,
    lng: user?.longitude ?? null,
    city: user?.city_id?.city_name || "",
    genres: [
      ...(user?.music_genre || []).map((g) => g?.name).filter(Boolean),
      ...(user?.custom_music_genres || []),
    ],
    eventPrefs: [
      ...(user?.event_preferences || []).map((c) => c?.category_name).filter(Boolean),
      ...(user?.custom_event_preferences || []),
    ],
    hobbies: user?.hobbies || [],
    likedVenueIds: new Set(liked.map((l) => String(l.venue_id))),
  };
}

function systemPrompt(ctx, now) {
  const lines = [
    "You are Hii Owl, the friendly nightlife concierge inside the Hii app (India).",
    "You help members find venues (clubs, bars, lounges, rooftops) and events, and plan nights out.",
    "",
    `Right now it is ${now.format("dddd D MMMM YYYY, h:mm A")} (${TZ}). Today's date is ${now.format("YYYY-MM-DD")}.`,
    "Resolve relative dates yourself before calling tools: 'tonight' = today; 'tomorrow' = the next date;",
    "'this weekend' = the coming Friday to Sunday (or today to Sunday if it is already the weekend).",
    "",
    "About this member (use it to personalise, never recite it back as a list):",
    `- Name: ${ctx.name || "unknown"}`,
    `- Home city: ${ctx.city || "unknown"}${ctx.lat != null ? " (their location is known, so distances are available)" : " (location unknown)"}`,
    `- Favourite music: ${ctx.genres.join(", ") || "not set"}`,
    `- Likes these kinds of events: ${ctx.eventPrefs.join(", ") || "not set"}`,
    `- Hobbies: ${ctx.hobbies.join(", ") || "not set"}`,
    `- Has liked ${ctx.likedVenueIds.size} venue(s) (use liked_only to search them).`,
    "",
    "Rules:",
    "- ALWAYS use the tools for recommendations. Never invent venues, events, prices, times or addresses.",
    "- Call tools straight away; don't announce that you are searching.",
    "- The app shows a tappable card for every venue/event you mention, so write each name EXACTLY as the",
    "  tool returned it, and keep the text short: 1-2 lines per place saying why it fits (vibe, distance, price, time).",
    "- Recommend at most 5 places per answer. Prices are in Indian rupees (₹).",
    "- Formatting: plain sentences, **bold** for names, and '- ' bullet lines. No headings, tables or links.",
    "- 'Near me' / 'nearby' means sort by distance (max_distance_km around 10-15 if they want close by).",
    "- If nothing matches, say so honestly and suggest a broader search (another date, area or type).",
    "- You can't book, pay or message people yourself - tell them to tap the card to Reserve or Get Tickets.",
    "- Never share personal details about other members.",
    "- Stay on nightlife, going out and plans in the Hii app; politely steer other topics back.",
    "- Keep it warm and fun, like a friend who knows every club in town. Occasional emoji is fine.",
  ];
  return lines.join("\n");
}

/* --------------------------------------------------------------- tools */
const tools = [
  {
    name: "search_venues",
    description:
      "Search nightlife venues (clubs, bars, lounges, pubs, rooftops...). Returns name, area, categories, " +
      "distance from the member, opening days/hours, whether it's open right now, cover charge and bill discount.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text matched against venue name and description, e.g. 'rooftop', 'Toit'" },
        area: { type: "string", description: "City or neighbourhood, e.g. 'Indiranagar', 'Mumbai'" },
        venue_type: { type: "string", description: "Category, e.g. club, bar, lounge, pub, rooftop" },
        open_now: { type: "boolean", description: "Only venues open at this moment" },
        max_distance_km: { type: "number", description: "Only venues within this distance of the member" },
        has_discount: { type: "boolean", description: "Only venues offering a bill discount" },
        liked_only: { type: "boolean", description: "Only venues the member has liked" },
        sort: { type: "string", enum: ["distance", "popular", "discount"], description: "Default: distance" },
        limit: { type: "integer", description: "1-8, default 5" },
      },
    },
  },
  {
    name: "search_events",
    description:
      "Search UPCOMING nightlife events (never past ones). Returns name, venue/area, dates, times, distance, " +
      "categories, artists, lowest ticket price and whether tickets are still available.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text matched against event name, description and artist names" },
        area: { type: "string", description: "City or neighbourhood" },
        event_type: { type: "string", description: "Category, e.g. techno, bollywood night, live music, DJ night" },
        date_from: { type: "string", description: "YYYY-MM-DD, inclusive" },
        date_to: { type: "string", description: "YYYY-MM-DD, inclusive" },
        max_distance_km: { type: "number" },
        max_price: { type: "number", description: "Maximum lowest-ticket price in ₹" },
        sort: { type: "string", enum: ["date", "distance", "price"], description: "Default: date" },
        limit: { type: "integer", description: "1-8, default 5" },
      },
    },
  },
];

async function searchVenues(input, ctx, now) {
  const match = { is_active: true, is_deleted: false };
  const or = [];
  if (input.area) {
    or.push({ address: rx(input.area) });
    const cityIds = await cityIdsMatching(input.area);
    if (cityIds.length) or.push({ city_id: { $in: cityIds } });
  }
  if (or.length) match.$or = or;
  if (input.query) {
    match.$and = [{ $or: [{ venue_name: rx(input.query) }, { about: rx(input.query) }] }];
  }
  const typeIds = await categoryIdsMatching(input.venue_type, 2);
  if (typeIds) match.category_ids = { $in: typeIds };
  if (input.has_discount) match.bill_discount_percentage = { $gt: 0 };
  if (input.liked_only) match._id = { $in: [...ctx.likedVenueIds] };

  let venues = await Venue.find(match)
    .select("venue_name venue_image address latitude longitude open_days start_time end_time table_reservation_fee bill_discount_percentage category_ids city_id")
    .populate("category_ids", "category_name")
    .populate("city_id", "city_name")
    .limit(300)
    .lean();

  venues = venues.map((v) => ({ ...v, _distance: distanceKm(ctx.lat, ctx.lng, v.latitude, v.longitude), _open: isOpenNow(v, now) }));
  if (input.open_now) venues = venues.filter((v) => v._open === true);
  if (input.max_distance_km) venues = venues.filter((v) => v._distance != null && v._distance <= Number(input.max_distance_km));

  const sort = input.sort || "distance";
  if (sort === "popular" && venues.length) {
    const counts = await VenueLike.aggregate([
      { $match: { venue_id: { $in: venues.map((v) => v._id) }, is_liked: true } },
      { $group: { _id: "$venue_id", n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    venues.forEach((v) => { v._likes = byId[String(v._id)] || 0; });
    venues.sort((a, b) => b._likes - a._likes);
  } else if (sort === "discount") {
    venues.sort((a, b) => (b.bill_discount_percentage || 0) - (a.bill_discount_percentage || 0));
  } else {
    venues.sort((a, b) => (a._distance ?? 1e9) - (b._distance ?? 1e9));
  }

  const limit = clampInt(input.limit, 5, 1, 8);
  return venues.slice(0, limit).map((v) => {
    const categories = (v.category_ids || []).map((c) => c?.category_name).filter(Boolean);
    const discount = Number(v.bill_discount_percentage || 0);
    const cover = Number(v.table_reservation_fee || 0);
    return {
      card: {
        type: "venue",
        id: String(v._id),
        title: v.venue_name,
        subtitle: [categories[0], v.city_id?.city_name].filter(Boolean).join(" · "),
        image: v.venue_image || "",
        distance_km: v._distance,
        badge: discount > 0 ? `${discount}% off bill` : v._open ? "Open now" : "",
      },
      data: {
        name: v.venue_name,
        area: v.address,
        city: v.city_id?.city_name || null,
        categories,
        distance_km: v._distance,
        open_days: v.open_days,
        hours: `${fmtTime(v.start_time)} - ${fmtTime(v.end_time)}`,
        open_now: v._open,
        cover_charge_inr: cover || null,
        bill_discount_percent: discount || null,
        liked_by_member: ctx.likedVenueIds.has(String(v._id)),
      },
    };
  });
}

async function searchEvents(input, ctx, now) {
  const today = now.format("YYYY-MM-DD");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(input.date_from || "") && input.date_from > today ? input.date_from : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(input.date_to || "") ? input.date_to : null;

  const match = { is_active: true, is_deleted: false, end_date: { $gte: from } };
  if (to) match.start_date = { $lte: to };
  const and = [];
  if (input.area) {
    const or = [{ address: rx(input.area) }];
    const cityIds = await cityIdsMatching(input.area);
    if (cityIds.length) or.push({ city_id: { $in: cityIds } });
    and.push({ $or: or });
  }
  if (input.query) {
    and.push({ $or: [{ venue_name: rx(input.query) }, { about: rx(input.query) }, { "artists.name": rx(input.query) }] });
  }
  if (and.length) match.$and = and;
  const typeIds = await categoryIdsMatching(input.event_type, 1);
  if (typeIds) match.category_ids = { $in: typeIds };

  let events = await Event.find(match)
    .select("venue_name venue_image address latitude longitude start_date end_date start_time end_time category_ids city_id artists")
    .populate("category_ids", "category_name")
    .populate("city_id", "city_name")
    .sort({ start_date: 1 })
    .limit(300)
    .lean();

  // Today's events that have already finished (non-overnight) are dropped.
  const nowMin = now.hours() * 60 + now.minutes();
  events = events.filter((e) => {
    if (e.end_date !== today || e.start_date !== today) return true;
    const s = toMinutes(e.start_time), en = toMinutes(e.end_time);
    return s == null || en == null || en <= s || en > nowMin;
  });

  const tickets = events.length
    ? await Ticket.find({ event_id: { $in: events.map((e) => e._id) }, is_active: true, is_deleted: false })
        .select("event_id ticket_price available_tickets").lean()
    : [];
  const priceInfo = {};
  // "From ₹X" = cheapest ticket still on sale (all tiers only if sold out).
  tickets.forEach((t) => {
    const k = String(t.event_id);
    const p = priceInfo[k] || (priceInfo[k] = { min: null, minAll: null, available: false });
    const price = Number(t.ticket_price);
    const onSale = t.available_tickets == null || t.available_tickets > 0;
    if (Number.isFinite(price)) {
      if (p.minAll == null || price < p.minAll) p.minAll = price;
      if (onSale && (p.min == null || price < p.min)) p.min = price;
    }
    if (onSale) p.available = true;
  });
  Object.values(priceInfo).forEach((p) => { if (p.min == null) p.min = p.minAll; });

  events = events.map((e) => ({
    ...e,
    _distance: distanceKm(ctx.lat, ctx.lng, e.latitude, e.longitude),
    _price: priceInfo[String(e._id)]?.min ?? null,
    _available: priceInfo[String(e._id)] ? priceInfo[String(e._id)].available : null,
  }));
  if (input.max_distance_km) events = events.filter((e) => e._distance != null && e._distance <= Number(input.max_distance_km));
  if (input.max_price != null) events = events.filter((e) => e._price == null || e._price <= Number(input.max_price));

  const sort = input.sort || "date";
  if (sort === "distance") events.sort((a, b) => (a._distance ?? 1e9) - (b._distance ?? 1e9));
  else if (sort === "price") events.sort((a, b) => (a._price ?? 1e9) - (b._price ?? 1e9));

  const limit = clampInt(input.limit, 5, 1, 8);
  return events.slice(0, limit).map((e) => {
    const categories = (e.category_ids || []).map((c) => c?.category_name).filter(Boolean);
    const when = `${moment.tz(e.start_date, TZ).format("ddd D MMM")} · ${fmtTime(e.start_time)}`;
    const priceLabel = e._available === false ? "Sold out"
      : e._price === 0 ? "Free" : e._price != null ? `From ₹${e._price}` : "";
    return {
      card: {
        type: "event",
        id: String(e._id),
        title: e.venue_name,
        subtitle: when,
        image: e.venue_image || "",
        distance_km: e._distance,
        badge: priceLabel,
      },
      data: {
        name: e.venue_name,
        area: e.address,
        city: e.city_id?.city_name || null,
        categories,
        artists: (e.artists || []).map((a) => a?.name).filter(Boolean).slice(0, 5),
        start_date: e.start_date,
        end_date: e.end_date,
        time: `${fmtTime(e.start_time)} - ${fmtTime(e.end_time)}`,
        distance_km: e._distance,
        lowest_ticket_price_inr: e._price,
        tickets_available: e._available,
      },
    };
  });
}

const TOOL_STATUS = {
  search_venues: "Finding venues…",
  search_events: "Checking events…",
};

async function runTool(toolUse, ctx, now) {
  const input = toolUse.input || {};
  if (toolUse.name === "search_venues") return searchVenues(input, ctx, now);
  if (toolUse.name === "search_events") return searchEvents(input, ctx, now);
  return null;
}

/* ------------------------------------------------- conversation engine */
function cleanHistory(raw) {
  let msgs = (Array.isArray(raw) ? raw : [])
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? "").trim().slice(0, MAX_MSG_CHARS),
    }))
    .filter((m) => m.content)
    .slice(-MAX_HISTORY);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  // merge accidental back-to-back messages from the same side
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else merged.push({ ...m });
  }
  return merged;
}

const isModelUnavailable = (e) =>
  e?.status === 404 || e?.error?.error?.type === "not_found_error" ||
  (e?.status === 400 && /model/i.test(String(e?.message || "")));

let activeModel = PRIMARY_MODEL;

async function streamTurn(params, onText) {
  const attempt = async (model) => {
    const stream = anthropic.messages.stream({ ...params, model });
    if (onText) stream.on("text", (delta) => onText(delta));
    return stream.finalMessage();
  };
  try {
    return await attempt(activeModel);
  } catch (e) {
    if (activeModel !== FALLBACK_MODEL && isModelUnavailable(e)) {
      console.warn(`Hii Owl: model ${activeModel} unavailable, falling back to ${FALLBACK_MODEL}`);
      activeModel = FALLBACK_MODEL;
      return attempt(activeModel);
    }
    throw e;
  }
}

function pickCards(reply, found) {
  const text = reply.toLowerCase();
  const mentioned = [];
  for (const item of found.values()) {
    const name = String(item.title || "").toLowerCase();
    if (name.length >= 3) {
      const at = text.indexOf(name);
      if (at >= 0) mentioned.push({ at, item });
    }
  }
  mentioned.sort((a, b) => a.at - b.at);
  return mentioned.map((m) => m.item).slice(0, 6);
}

async function runOwl({ userId, rawMessages, onStatus, onText }) {
  const now = moment().tz(TZ);
  const ctx = await loadMemberContext(userId);
  const messages = cleanHistory(rawMessages);
  if (!messages.length) throw Object.assign(new Error("empty"), { http: 400 });

  const system = systemPrompt(ctx, now);
  const found = new Map(); // id -> card
  let reply = "";

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const msg = await streamTurn(
      { max_tokens: 1024, system, tools, messages },
      (delta) => { reply += delta; onText && onText(delta); }
    );
    if (msg.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: msg.content });
    const results = [];
    for (const block of msg.content.filter((b) => b.type === "tool_use")) {
      onStatus && onStatus(TOOL_STATUS[block.name] || "Looking that up…");
      let content;
      try {
        const rows = (await runTool(block, ctx, now)) || [];
        rows.forEach((r) => found.set(r.card.id, r.card));
        content = JSON.stringify(rows.map((r) => r.data));
      } catch (err) {
        console.error("Hii Owl tool error:", err);
        content = JSON.stringify({ error: "Search failed, try a simpler search." });
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content });
    }
    messages.push({ role: "user", content: results });
    if (reply && !reply.endsWith("\n")) { reply += "\n\n"; onText && onText("\n\n"); }
  }

  reply = reply.trim() || "Hmm, I couldn't find anything for that. Want to try another area or date?";
  return { reply, cards: pickCards(reply, found) };
}

async function checkDailyLimit(userId) {
  const day = moment().tz(TZ).format("YYYY-MM-DD");
  const usage = await AiUsage.findOneAndUpdate(
    { user_id: userId, day },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return usage.count <= DAILY_LIMIT;
}

const LIMIT_MSG = "You've chatted with Hii Owl a lot today 🦉 — I'll be back tomorrow!";

/* -------------------------------------------------------------- routes */
async function sendMessage(req, res) {
  try {
    if (!(await checkDailyLimit(req.userId))) {
      return res.json({ success: true, message: ["Success", "Success"], data: { reply: LIMIT_MSG, cards: [], limit_reached: true } });
    }
    const { reply, cards } = await runOwl({ userId: req.userId, rawMessages: req.body?.messages });
    return res.json({ success: true, message: ["Success", "Success"], data: { reply, cards } });
  } catch (err) {
    console.error("chat/send error:", err);
    const code = err?.http || 500;
    const text = code === 400 ? "Message history is required" : "Chat request failed. Please try again.";
    return res.status(code).json({ success: false, message: [text, text] });
  }
}

async function streamMessage(req, res) {
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // stop nginx from buffering the stream
  });
  res.flushHeaders?.();
  let closed = false;
  // NB: listen on the response - in Node 16+ req "close" fires as soon as the
  // request body has been read, which would silence the whole stream.
  res.on("close", () => { closed = true; });
  const send = (obj) => { if (!closed) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

  try {
    if (!(await checkDailyLimit(req.userId))) {
      send({ type: "text", text: LIMIT_MSG });
      send({ type: "done", reply: LIMIT_MSG, cards: [], limit_reached: true });
      return res.end();
    }
    const { reply, cards } = await runOwl({
      userId: req.userId,
      rawMessages: req.body?.messages,
      onStatus: (text) => send({ type: "status", text }),
      onText: (text) => send({ type: "text", text }),
    });
    send({ type: "done", reply, cards });
  } catch (err) {
    console.error("chat/stream error:", err);
    send({ type: "error", message: "Sorry, something went wrong. Please try again." });
  }
  res.end();
}

route.post("/send", appAuth, sendMessage);
route.post("/stream", appAuth, streamMessage);

export default route;
