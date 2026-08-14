import { User, Venue, Booking, VenueLike, Event, EventLike, TrendingSearch, Friendship, UserBlock, Content } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import moment from "moment-timezone"
import dotenv from "dotenv";
dotenv.config();

/**
 * Escapes regex metacharacters in user input so search is
 * treated as a plain substring match, not a regex pattern.
 * Fixes: crash/wrong results when user types ( ) . * + ? [ ] ^ $ { } | \
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Filter Events and Venue
const filterEventsVenues = async (req, res) => {
  try {
    const { type, search, latitude, longitude, radius } = req.query;
    console.log("searching", search)

    if (!type || !["venue", "event", "member"].includes(type)) {
      return apiResponse.badRequest(res, messages.VENUES_EVENTS_TYPE_REQ);
    }

    const user = await User.findById(req.userId)
      .select("latitude longitude radius preferred_cities city_id")
      .lean();

    const userBookings = await Booking.find({
      user_id: req.userId,
      is_deleted: false,
      is_active: true
    })
      .select("booking_type event_id venue_id")
      .lean();

    const originPoints = [];

    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      const queryRadius = Number(radius);
      originPoints.push({ lat, lng, radius: queryRadius });
    }

    if (user?.latitude != null && user?.longitude != null) {
      originPoints.push({
        lat: user.latitude,
        lng: user.longitude,
        radius: user.radius || Number(radius) || 50
      });
    }

    if (user?.preferred_cities?.length) {
      user.preferred_cities.forEach(c => {
        originPoints.push({
          lat: c.latitude,
          lng: c.longitude,
          radius: c.radius
        });
      });
    }

    let maxRadiusKm = Math.max(...originPoints.map(p => p.radius || 0)) || 50;

    const computeDistanceWithOrigins = (targetLat, targetLng) => {
      let minDistance = null;
      let withinAnyRadius = false;

      for (const origin of originPoints) {
        const dist = helper.getDistanceInKm(
          origin.lat,
          origin.lng,
          Number(targetLat),
          Number(targetLng)
        );

        if (dist == null) continue;
        if (minDistance == null || dist < minDistance) minDistance = dist;
        if (dist <= origin.radius) withinAnyRadius = true;
      }

      return { minDistance, withinAnyRadius };
    };

    let response = {};

    /* ================= VENUE ================= */
    if (type === "venue") {

      const venues = await Venue.find({
        is_deleted: false,
        is_active: true
      })
        .populate("category_ids", "_id category_name")
        .lean();

      const validVenues = venues.map(v => {
        const { minDistance, withinAnyRadius } = computeDistanceWithOrigins(v.latitude, v.longitude);
        return { ...v, distance_km: minDistance, withinAnyRadius };
      }).filter(v => v.withinAnyRadius);

      const venueLikes = await VenueLike.find({ is_liked: true, is_active: true }).lean();

      const likeCount = {};
      venueLikes.forEach(l => {
        const id = l.venue_id.toString();
        likeCount[id] = (likeCount[id] || 0) + 1;
      });

      const topVenueIds = Object.entries(likeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const FEATURED_LIMIT = 2;

      let featuredRaw = validVenues
        .filter(v => topVenueIds.includes(v._id.toString()))
        .slice(0, FEATURED_LIMIT);

      const featuredIds = new Set(
        featuredRaw.map(v => v._id.toString())
      );

      let nearbyRaw = validVenues
        .filter(v =>
          v.distance_km != null &&
          !featuredIds.has(v._id.toString())
        )
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3);

      const nearbyIds = new Set(
        nearbyRaw.map(v => v._id.toString())
      );

      let recommendedRaw = [];

      if (req.userId) {
        const userLikedVenues = await VenueLike.find({
          user_id: req.userId,
          is_liked: true,
          is_active: true
        }).populate("venue_id", "category_ids").lean();

        const likedCats = new Set();
        userLikedVenues.forEach(l => {
          l.venue_id?.category_ids?.forEach(c => likedCats.add(c._id.toString()));
        });

        if (likedCats.size > 0) {
          recommendedRaw = validVenues.filter(v =>
            !featuredIds.has(v._id.toString()) &&
            !nearbyIds.has(v._id.toString()) &&
            v.category_ids?.some(c => likedCats.has(c._id.toString()))
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validVenues.filter(v =>
            !nearbyIds.has(v._id.toString())
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validVenues.filter(v =>
            !featuredIds.has(v._id.toString())
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validVenues;
        }

        recommendedRaw = recommendedRaw
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
      }

      // FIX 1: escape user input before building regex to prevent crash
      // on special characters like ( ) . * + ? [ ] ^ $ { } | \
      if (search && search.trim()) {
        console.log("Search term:", search);
        if (req.userId) {
          await TrendingSearch.create({
            user_id: req.userId,
            keyword: search.trim().toLowerCase(),
            type
          });
        }
        const regex = new RegExp(escapeRegex(search.trim()), "i");

        const match = (v) =>
          regex.test(v.venue_name || "") ||
          regex.test(v.address || "") ||
          regex.test(v.about || "");

        featuredRaw = featuredRaw.filter(match);
        nearbyRaw = nearbyRaw.filter(match);
        recommendedRaw = recommendedRaw.filter(match);
      }

      response = {
        type: "venue",
        featured: featuredRaw.map(v => ({
          venue_id: v._id,
          venue_name: v.venue_name,
          venue_image: v.venue_image,
          location: v.address,
          categories: v.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        })),
        nearby: nearbyRaw.map(v => ({
          venue_id: v._id,
          venue_name: v.venue_name,
          venue_image: v.venue_image,
          location: v.address,
          distance_km: v.distance_km,
          address: v.address,
          categories: v.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        })),
        recommended: recommendedRaw.map(v => ({
          venue_id: v._id,
          venue_name: v.venue_name,
          venue_image: v.venue_image,
          location: v.address,
          distance_km: v.distance_km,
          address: v.address,
          categories: v.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        }))
      };
    }

    /* ================= EVENT ================= */
    else if (type === "event") {

      const events = await Event.find({
        is_deleted: false,
        is_active: true
      })
        .populate("category_ids", "_id category_name")
        .lean();

      const validEvents = events.map(e => {
        const { minDistance, withinAnyRadius } = computeDistanceWithOrigins(e.latitude, e.longitude);
        return { ...e, distance_km: minDistance, withinAnyRadius };
      }).filter(e => e.withinAnyRadius);

      const eventLikes = await EventLike.find({ is_liked: true, is_active: true }).lean();

      const likeCount = {};
      eventLikes.forEach(l => {
        const id = l.event_id.toString();
        likeCount[id] = (likeCount[id] || 0) + 1;
      });

      const topEventIds = Object.entries(likeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const FEATURED_LIMIT = 2;

      let featuredRaw = validEvents
        .filter(e => topEventIds.includes(e._id.toString()))
        .slice(0, FEATURED_LIMIT);

      const featuredIds = new Set(
        featuredRaw.map(e => e._id.toString())
      );

      let nearbyRaw = validEvents
        .filter(e =>
          e.distance_km != null &&
          !featuredIds.has(e._id.toString())
        )
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3);

      const nearbyIds = new Set(
        nearbyRaw.map(e => e._id.toString())
      );

      let recommendedRaw = [];

      if (req.userId) {
        const user = await User.findById(req.userId)
          .select("event_preferences")
          .lean();

        if (user?.event_preferences?.length > 0) {
          const prefIds = user.event_preferences.map(id => id.toString());

          recommendedRaw = validEvents.filter(e =>
            !featuredIds.has(e._id.toString()) &&
            !nearbyIds.has(e._id.toString()) &&
            e.category_ids?.some(c => prefIds.includes(c._id.toString()))
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validEvents.filter(e =>
            !nearbyIds.has(e._id.toString())
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validEvents.filter(e =>
            !featuredIds.has(e._id.toString())
          );
        }

        if (recommendedRaw.length === 0) {
          recommendedRaw = validEvents;
        }

        recommendedRaw = recommendedRaw
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
      }

      // FIX 2: escape user input before building regex + test event_name
      // (original code was only testing venue_name on events, so event
      // name search never matched anything)
      if (search && search.trim()) {
        if (req.userId) {
          await TrendingSearch.create({
            user_id: req.userId,
            keyword: search.trim().toLowerCase(),
            type
          });
        }
        const regex = new RegExp(escapeRegex(search.trim()), "i");

        const match = (e) =>
          regex.test(e.event_name || "") ||  // correct primary field
          regex.test(e.venue_name || "") ||  // fallback (some events reuse this field)
          regex.test(e.address || "") ||
          regex.test(e.about || "");

        featuredRaw = featuredRaw.filter(match);
        nearbyRaw = nearbyRaw.filter(match);
        recommendedRaw = recommendedRaw.filter(match);
      }

      response = {
        type: "event",
        featured: featuredRaw.map(e => ({
          event_id: e._id,
          event_name: e.venue_name,
          event_image: e.venue_image,
          event_date: `${new Date(e.start_date).toLocaleDateString('en-US', { weekday: 'short' })} , ${new Date(`1970-01-01T${e.start_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date(`1970-01-01T${e.end_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          categories: e.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        })),
        nearby: nearbyRaw.map(e => ({
          event_id: e._id,
          event_name: e.venue_name,
          event_image: e.venue_image,
          distance_km: e.distance_km,
          address: e.address,
          categories: e.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        })),
        recommended: recommendedRaw.map(e => ({
          event_id: e._id,
          event_name: e.venue_name,
          event_image: e.venue_image,
          distance_km: e.distance_km,
          address: e.address,
          categories: e.category_ids?.map(c => ({
            _id: c._id,
            category_name: c.category_name
          }))
        }))
      };
    }

    /* ================= MEMBER ================= */
    else if (type === "member") {

      const blockRelations = await UserBlock.find({
        is_blocked: true,
        $or: [{ blocked_by: req.userId }, { blocked_user: req.userId }]
      }).select("blocked_by blocked_user").lean();

      const excludedIds = [req.userId];
      blockRelations.forEach(b => {
        excludedIds.push(
          b.blocked_by.toString() === req.userId.toString()
            ? b.blocked_user
            : b.blocked_by
        );
      });

      const members = await User.find({
        _id: { $nin: excludedIds },
        is_deleted: false,
        is_active: true,
        is_profile_completed: true
      })
        .select("name bio profile_image latitude longitude music_genre custom_music_genres createdAt")
        .populate("music_genre", "name")
        .lean();

      const validMembers = members.map(m => {
        const { minDistance, withinAnyRadius } = computeDistanceWithOrigins(m.latitude, m.longitude);
        return { ...m, distance_km: minDistance, withinAnyRadius };
      }).filter(m => m.withinAnyRadius);

      // Popularity signal = accepted friendships, same "count relations,
      // rank by count" pattern as venue/event likes above.
      const friendships = await Friendship.find({ status: "accepted" })
        .select("user_id_1 user_id_2")
        .lean();

      const likeCount = {};
      friendships.forEach(f => {
        [f.user_id_1, f.user_id_2].forEach(id => {
          const key = id.toString();
          likeCount[key] = (likeCount[key] || 0) + 1;
        });
      });

      const topMemberIds = Object.entries(likeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const FEATURED_LIMIT = 2;

      let featuredRaw = validMembers
        .filter(m => topMemberIds.includes(m._id.toString()))
        .slice(0, FEATURED_LIMIT);

      const featuredIds = new Set(
        featuredRaw.map(m => m._id.toString())
      );

      let nearbyRaw = validMembers
        .filter(m =>
          m.distance_km != null &&
          !featuredIds.has(m._id.toString())
        )
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3);

      const nearbyIds = new Set(
        nearbyRaw.map(m => m._id.toString())
      );

      let recommendedRaw = validMembers.filter(m =>
        !featuredIds.has(m._id.toString()) &&
        !nearbyIds.has(m._id.toString())
      );

      recommendedRaw = recommendedRaw
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);

      const genresOf = (m) => [
        ...(m.music_genre || []).map(g => g.name).filter(Boolean),
        ...(m.custom_music_genres || [])
      ];

      if (search && search.trim()) {
        if (req.userId) {
          await TrendingSearch.create({
            user_id: req.userId,
            keyword: search.trim().toLowerCase(),
            type
          });
        }
        const regex = new RegExp(escapeRegex(search.trim()), "i");

        const match = (m) =>
          regex.test(m.name || "") ||
          regex.test(m.bio || "");

        featuredRaw = featuredRaw.filter(match);
        nearbyRaw = nearbyRaw.filter(match);
        recommendedRaw = recommendedRaw.filter(match);
      }

      response = {
        type: "member",
        featured: featuredRaw.map(m => ({
          member_id: m._id,
          name: m.name,
          profile_image: m.profile_image,
          bio: m.bio,
          music_genres: genresOf(m)
        })),
        nearby: nearbyRaw.map(m => ({
          member_id: m._id,
          name: m.name,
          profile_image: m.profile_image,
          distance_km: m.distance_km,
          bio: m.bio,
          music_genres: genresOf(m)
        })),
        recommended: recommendedRaw.map(m => ({
          member_id: m._id,
          name: m.name,
          profile_image: m.profile_image,
          distance_km: m.distance_km,
          bio: m.bio,
          music_genres: genresOf(m)
        }))
      };
    }

    return apiResponse.ok(res, response, messages.DATA_FOUND);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};


const getTrendingSearches = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type || !["event", "venue", "member"].includes(type)) {
      return apiResponse.badRequest(res, "Type is required");
    }

    const searches = await TrendingSearch.aggregate([
      {
        $match: {
          type
        }
      },
      {
        $group: {
          _id: "$keyword",
          count: { $sum: 1 },
          last_search: { $max: "$createdAt" }
        }
      },
      {
        $sort: {
          count: -1,
          last_search: -1
        }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          keyword: "$_id"
        }
      }
    ]);

    const keywords = searches.map(item => item.keyword);

    return apiResponse.ok(
      res,
      keywords,
      messages.DATA_FOUND
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};




// Get Events / Venues By Date (Calendar API)
const calenderFilter = async (req, res) => {
  try {
    const { type, date, search } = req.query;

    if (!type || !["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, "Type must be event or venue");
    }

    if (!date) {
      return apiResponse.badRequest(res, "Date is required (yyyy-mm-dd)");
    }

    // Validate date format
    const selectedDate = moment(date, "YYYY-MM-DD", true);
    if (!selectedDate.isValid()) {
      return apiResponse.badRequest(res, "Invalid date format (yyyy-mm-dd)");
    }

    // Create day start & end
    const startOfDay = selectedDate.startOf("day").toDate();
    const endOfDay = selectedDate.endOf("day").toDate();

    /* ================= COMMON FILTER ================= */
    const commonFilters = {
      is_deleted: false,
      is_active: true
    };

    // FIX 3: escape user input before building regex + include event_name
    // in the $or so calendar search works for both venues and events
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");

      commonFilters.$or = [
        { venue_name: regex },
        { event_name: regex },
        { address: regex },
        { about: regex }
      ];
    }

    let data = [];

    /*  EVENT */
    if (type === "event") {

      const events = await Event.find({
        ...commonFilters,
        start_date: { $lte: date },
        end_date: { $gte: date }
      })
        .sort({ start_date: 1 })
        .select("venue_name venue_image start_time end_time address start_date end_date")
        .lean();

      data = events.map(e => ({
        event_id: e._id,
        event_name: e.venue_name,
        event_image: e.venue_image,
        event_date: moment(e.start_date).format("ddd DD MMM"),
        time: `${e.start_time} - ${e.end_time}`,
        address: e.address
      }));
    }

    /*  VENUE  */
    else {

      const venues = await Venue.find({
        ...commonFilters,
        start_time: { $lte: endOfDay },
        end_time: { $gte: startOfDay }
      })
        .sort({ start_time: 1 })
        .select("venue_name venue_image start_time end_time address")
        .lean();

      data = venues.map(v => ({
        venue_id: v._id,
        venue_name: v.venue_name,
        venue_image: v.venue_image,
        venue_date: helper.formatVenueTime(
          v.start_time,
          v.end_time
        ),
        address: v.address
      }));
    }

    return apiResponse.ok(
      res,
      data,
      data.length ? messages.DATA_FOUND : messages.NO_DATA_FOUND
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};


// Get My Members (with Pagination inside data)
const getMyMembers = async (req, res) => {
  try {
    const userId = req.userId
    const { type, page = 1, limit = 10 } = req.query

    const pageNumber = parseInt(page)
    const pageSize = parseInt(limit)
    const skip = (pageNumber - 1) * pageSize

    // ================= VALIDATION =================
    if (!["liked", "connected"].includes(type)) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM)
    }

    // ================= FRIEND FILTER =================
    const friendFilter =
      type === "liked"
        ? { initiated_by: userId, status: "pending" }
        : {
          status: "accepted",
          $or: [{ user_id_1: userId }, { user_id_2: userId }]
        }

    // ================= FETCH FRIENDSHIPS =================
    const friendships = await Friendship.find(friendFilter)
      .select("user_id_1 user_id_2")
      .lean()

    if (!friendships.length) {
      return apiResponse.ok(
        res,
        {
          list: [],
          total_records: 0,
          total_pages: 0,
          current_page: pageNumber
        },
        messages.NO_DATA_FOUND
      )
    }

    // ================= EXTRACT MEMBER IDS =================
    const memberIds = []

    for (const f of friendships) {
      if (type === "liked") {
        memberIds.push(f.user_id_2)
      } else {
        memberIds.push(
          f.user_id_1.toString() === userId.toString()
            ? f.user_id_2
            : f.user_id_1
        )
      }
    }

    // ================= TOTAL COUNT =================
    const totalRecords = await User.countDocuments({
      _id: { $in: memberIds },
      is_active: true,
      is_deleted: false
    })

    // ================= FETCH USERS (PAGINATED) =================
    const users = await User.find({
      _id: { $in: memberIds },
      is_active: true,
      is_deleted: false
    })
      .select("name profile_image createdAt city_id latitude longitude")
      .populate({
        path: "city_id",
        select: "city_name state"
      })
      .skip(skip)
      .limit(pageSize)
      .lean()

    // ================= CURRENT USER LOCATION =================
    const currentUser = await User.findById(userId)
      .select("latitude longitude")
      .lean()

    // ================= BUILD RESPONSE =================
    const list = []

    for (const u of users) {
      list.push({
        _id: u._id,
        name: u.name,
        profile_image: u.profile_image,
        member_since: u.createdAt,
        address:
          u.city_id && u.city_id.city_name
            ? `${u.city_id.city_name}${u.city_id.state ? `, ${u.city_id.state}` : ""
            } `
            : "",
        distance_km:
          currentUser?.latitude &&
            currentUser?.longitude &&
            u.latitude &&
            u.longitude
            ? helper.getDistanceInKm(
              currentUser.latitude,
              currentUser.longitude,
              u.latitude,
              u.longitude
            )
            : 0,
        matched: type === "connected"
      })
    }

    // ================= RETURN FINAL RESPONSE =================
    return apiResponse.ok(
      res,
      {
        list,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / pageSize),
        current_page: pageNumber
      },
      messages.DATA_FOUND
    )
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}

// Get My Venues (Liked / Reserved with Upcoming & Past)
const getMyVenues = async (req, res) => {
  try {
    const { type, page, limit } = req.query;
    const userId = req.userId;

    if (!["liked", "reserved"].includes(type)) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const { limits, offset, pages } = helper.getPagination(page, limit);

    /* ================= LIKED ================= */
    if (type === "liked") {

      const likedVenueIds = await VenueLike.find({
        user_id: userId,
        is_liked: true,
        is_active: true
      }).distinct("venue_id");

      const totalCounts = await Venue.countDocuments({
        _id: { $in: likedVenueIds },
        is_deleted: false,
        is_active: true
      });

      const venues = await Venue.find({
        _id: { $in: likedVenueIds },
        is_deleted: false,
        is_active: true
      })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limits)
        .lean();

      const list = venues.map(v => {

        const formattedTime = helper.formatVenueTime(
          v.start_time,
          v.end_time
        );

        const day = moment().tz("Asia/Kolkata").format("ddd"); // generic day label for liked venues

        return {
          _id: v._id,
          venue_name: v.venue_name,
          venue_image: v.venue_image || "",
          date: day ? `${day} ${formattedTime}` : formattedTime,

          location: v.address,
          is_liked: true
        };
      });

      const response = helper.getPagingData(totalCounts, list, pages, limits);
      return apiResponse.ok(res, response, messages.DATA_FOUND);
    }

    /* ================= RESERVED ================= */

    // 🔥 FETCH ALL BOOKINGS (no DB pagination here)
    const allBookings = await Booking.find({
      user_id: userId,
      booking_type: "venue",
      is_active: true,
      is_deleted: false
    })
      .populate("venue_id", "venue_name venue_image start_time end_time address")
      .sort({ booking_date: -1 })
      .lean();


    const upcoming = [];
    const past = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const b of allBookings) {
      if (!b.venue_id) continue;

      const formattedTime = helper.formatVenueTime(
        b.venue_id.start_time,
        b.venue_id.end_time
      );

      const data = {
        booking_id: b._id,
        venue_id: b.venue_id._id,
        venue_name: b.venue_id.venue_name,
        venue_image: b.venue_id.venue_image || "",
        date: moment(b.booking_date).tz("Asia/Kolkata").format("ddd"),
        time_slot: `${moment(b.booking_date).tz("Asia/Kolkata").format("ddd")}, ${helper.formatVenueTime(b.venue_id.start_time, b.venue_id.end_time)}`,
        location: b.venue_id.address,
        booking_date: b.booking_date,
        slot_time: (() => {
          if (!b.booking_date) return "";

          const dt = new Date(b.booking_date);

          const datePart = dt.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata"
          });

          const timePart = dt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
          });

          return `${datePart} - ${timePart}`;
        })(),
        number_of_guests: b.number_of_guests,
        booking_status: b.booking_status
      };

      const bookingDate = new Date(b.booking_date);
      bookingDate.setHours(0, 0, 0, 0);

      if (bookingDate >= now) {
        upcoming.push(data);
      } else {
        past.push({
          ...data,
          can_review: true
        });
      }
    }

    // ✅ Apply pagination ONLY on past
    const totalCounts = past.length;
    const paginatedPast = past.slice(offset, offset + limits);

    return apiResponse.ok(
      res,
      {
        upcoming,
        past: paginatedPast,
        total_records: totalCounts,
        total_pages: pages,
        current_page: parseInt(page) || 1
      },
      messages.DATA_FOUND
    );

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};


const getMyEvents = async (req, res) => {
  try {
    const userId = req.userId
    const { type, page, limit } = req.query

    if (!["liked", "booked"].includes(type)) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM)
    }

    const { limits, offset, pages } = helper.getPagination(page, limit)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    /* =====================================================
       TYPE : LIKED EVENTS
    ===================================================== */
    if (type === "liked") {

      const liked = await EventLike.find({
        user_id: userId,
        is_liked: true,
        is_active: true
      }).distinct("event_id")

      const totalRecords = await Event.countDocuments({
        _id: { $in: liked },
        is_active: true,
        is_deleted: false
      })

      const events = await Event.find({
        _id: { $in: liked },
        is_active: true,
        is_deleted: false
      })
        .select("venue_name venue_image  start_date start_time end_time address date")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limits)
        .lean()

      const list = events.map(e => {

        const formattedTime = helper.formatVenueTime(
          e.start_time,
          e.end_time
        )
        const day = e.start_date
          ? moment(e.start_date).tz("Asia/Kolkata").format("ddd")
          : ""

        return {
          _id: e._id,
          event_name: e.venue_name,
          event_image: e.venue_image,
          date: day ? `${day} ${formattedTime}` : formattedTime,

          address: e.address,
          is_liked: true
        }
      })

      const response = helper.getPagingData(totalRecords, list, pages, limits)
      return apiResponse.ok(res, response, messages.DATA_FOUND)
    }

    /* =====================================================
       TYPE : BOOKED EVENTS
    ===================================================== */

    const allBookings = await Booking.find({
      user_id: userId,
      booking_type: "event",
      is_active: true,
      is_deleted: false
    })
      .populate(
        "event_id",
        "venue_name venue_image start_time end_time start_date start_date end_date address"
      )
      .sort({ createdAt: -1 })
      .lean()

    const upcoming = []
    const past = []

    for (const b of allBookings) {
      if (!b.event_id) continue

      const formattedTime = helper.formatVenueTime(
        b.event_id.start_time,
        b.event_id.end_time
      )

      const data = {
        booking_id: b._id,
        event_id: b.event_id._id,
        event_name: b.event_id.venue_name,
        event_image: b.event_id.venue_image,

        date: moment(b.event_id.start_date)
          .tz("Asia/Kolkata")
          .format("ddd") + " " +
          helper.formatVenueTime(
            b.event_id.start_time,
            b.event_id.end_time
          ),

        address: b.event_id.address
      };

      const eventDate = new Date(b.event_id.end_date)
      eventDate.setHours(23, 59, 59, 999)

      if (eventDate >= new Date()) {
        upcoming.push(data)
      } else {
        past.push(data)
      }
    }

    // ✅ Pagination only on past
    const totalRecords = past.length
    const paginatedPast = past.slice(offset, offset + limits)

    return apiResponse.ok(
      res,
      {
        upcoming,
        past: paginatedPast,
        total_records: totalRecords,
        total_pages: pages,
        current_page: parseInt(page) || 1
      },
      messages.DATA_FOUND
    )

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}


// ---------- BLOCK / UNBLOCK USER
const blockUnblockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { target_user_id, action } = req.body;

    if (!target_user_id || !action) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    if (!["block", "unblock"].includes(action)) {
      return apiResponse.badRequest(res, "Invalid action");
    }

    const targetUser = await User.findOne({
      _id: target_user_id,
      is_deleted: false
    });

    if (!targetUser) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    let blockRecord = await UserBlock.findOne({
      blocked_by: userId,
      blocked_user: target_user_id
    });

    if (action === "block") {
      if (blockRecord) {
        blockRecord.is_blocked = true;
        await blockRecord.save();
      } else {
        await UserBlock.create({
          blocked_by: userId,
          blocked_user: target_user_id,
          is_blocked: true
        });
      }

      // 🔥 Optional: Remove friendship when blocking
      // await Friendship.deleteMany({
      //   $or: [
      //     { user_id_1: userId, user_id_2: target_user_id },
      //     { user_id_1: target_user_id, user_id_2: userId }
      //   ]
      // });

      return apiResponse.ok(
        res,
        { blocked: true },
        messages.BLOCKED_SUCESS
      );
    }

    if (action === "unblock") {

      blockRecord.is_blocked = false;
      await blockRecord.save();

      return apiResponse.ok(
        res,
        { blocked: false },
        messages.UNBLOCKED_SUCESS
      );
    }

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- GET MY BLOCKED USERS
const getMyBlockedUsers = async (req, res) => {
  try {
    const userId = req.userId;

    const blockedUsers = await UserBlock.find({
      blocked_by: userId,
      is_blocked: true
    })
      .populate({
        path: "blocked_user",
        select: "first_name last_name name username profile_image bio"
      })
      .sort({ createdAt: -1 })
      .lean();

    return apiResponse.ok(
      res,
      blockedUsers,
      messages.DATA_FOUND
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// Get All Content
const getContent = async (req, res) => {
  try {
    const baseURL = process.env.FRONTEND_URL || ''
    console.log('Base URL:', baseURL) // Debugging line

    // Live URL
    const endpoint = 'https://hii.life/app/server/api/v1/app/common/content_by_id/'

    // Local URL
    // const endpoint = 'http://localhost:5000/app/server/api/v1/app/common/content_by_id/'

    const webPath = `${baseURL}${endpoint} `

    // Fetch only non-deleted content
    const contents = await Content.find({ delete_flag: 0 })

    if (!contents || contents.length === 0) {
      return apiResponse.notFoundResponse(res, messages.NOT_FOUND)
    }

    const content_arr = contents.map(data => ({
      content_id: data._id,
      content_type: data.content_type,
      content: data.content,
      content_url: `${endpoint}${data._id}/${data.content_type}`,

      createtime: moment(data.createdAt).format('MMMM DD, YYYY'),
      updatetime: moment(data.updatedAt).format('MMMM DD, YYYY')
    }))
    return apiResponse.ok(res, content_arr, messages.DATA_FOUND)
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}

// Get Content By Id
const getContentById = async (req, res) => {
  try {
    const { content_id, content_type } = req.params

    if (!content_id || !content_type) {
      return apiResponse.badRequest(
        res,
        'content_id and content_type are required'
      )
    }

    const contentType = parseInt(content_type, 10)

    const contentData = await Content.findOne({
      _id: content_id,
      content_type: contentType,
      delete_flag: 0
    })

    if (!contentData) {
      return apiResponse.notFoundResponse(res, messages.NOT_FOUND)
    }

    // CLEANING CONTENT — FIX EXTRA SPACES 🔥
    let cleanContent = contentData.content
      .replace(/<br\s*\/?>/gi, '') // remove all <br>
      .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '') // remove empty <pre>
      .replace(/<p>\s*<\/p>/gi, '') // remove empty <p></p>
      .replace(/^\s+|\s+$/g, '') // trim whitespace
      .trim() // final safety trim

    const htmlPage = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Data</title>

          <style>
              body {
                  margin: 0;
                  padding: 12px;
                  font-family: Arial;
                  line-height: 1.7;
                  word-break: break-word;
                  white-space: normal;
              background: black;
              color: white;
              }
              img, iframe {
                  max-width: 100%;
                  height: auto;
              }
          </style>
      </head>

      <body>
          ${cleanContent}
      </body>
      </html>
    `

    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(htmlPage)
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}

const getProfileCompletionStatus = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    }).select("is_profile_completed user_gallery bio instagram_account hobbies vibe_checks")
      .lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    // Percentage/messages calculation now lives in a single shared helper
    // (helper.calculateProfileCompletion) so this endpoint and the
    // notification-trigger logic (helper.checkAndNotifyProfileCompletion)
    // can never drift out of sync with each other.
    const { percentage, messages: messagesList } = helper.calculateProfileCompletion(user);

    return apiResponse.ok(
      res,
      {
        profile_completion_percentage: percentage,
        messages: messagesList
      },
      messages.DATA_FOUND
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

/* -------------------------------------------------
   DOWNLOAD APP (LOCAL)
--------------------------------------------------*/
const downloadApp = async (request, response) => {
  response.send(`
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
        <title>Hustle App</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:image" content="https://hii.life/app/server/uploads/playstore.png" />
    </head>
    <body>
        <section style="text-align:center;margin-top:80px;">
            <a href="#">
                <img src="https://hii.life/app/server/uploads/playstore.png">
            </a>
        </section>
    </body>
    </html>
  `);
};

// SHARE / DEEP LINK HUSTLE POST

const deepLink = async (req, res) => {
  const { type, id } = req.query;

  if (!type || !id) {
    return res.status(400).json({
      success: false,
      msg: "type and id are required",
    });
  }

  try {
    let title = "Hii App";
    let description = "";
    let image = "https://hii.life/app/server/uploads/hii_dark_logo.png";
    let appDeepLink = "";

    /* ==============================
       FETCH DATA BASED ON TYPE
    ============================== */

    if (type === "venue") {
      const venue = await Venue.findOne({
        _id: id,
        is_deleted: false,
        is_active: true,
      }).lean();

      if (!venue) {
        return res.status(404).json({ success: false, msg: "Venue not found" });
      }

      title = venue.venue_name;
      description =
        venue.about?.length > 120
          ? venue.about.substring(0, 120) + "..."
          : venue.about || "Explore venue on Hii App";

      image = venue.venue_image || image;

      appDeepLink = `hii://venue/${venue._id}`;
    }

    else if (type === "event") {
      const event = await Event.findOne({
        _id: id,
        is_deleted: false,
        is_active: true,
      }).lean();

      if (!event) {
        return res.status(404).json({ success: false, msg: "Event not found" });
      }

      title = event.venue_name;
      description =
        event.about?.length > 120
          ? event.about.substring(0, 120) + "..."
          : event.about || "Explore event on Hii App";

      image = event.venue_image || image;

      appDeepLink = `hii://event/${event._id}`;
    }

    else {
      return res.status(400).json({
        success: false,
        msg: "Invalid type. Must be event or venue",
      });
    }

    /* RETURN HTML WITH OG + REDIRECT */

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">

          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${image}" />
          <meta property="og:type" content="website" />

          <script>
              (function() {
                  var userAgent = navigator.userAgent || navigator.vendor || window.opera;

                  // Android
                  if (/android/i.test(userAgent)) {
                      window.location.href =
                        "intent://${type}/${id}#Intent;scheme=hii;package=com.app.night_life;end";
                  }
                  // iOS
                  else if (/iPad|iPhone|iPod/.test(userAgent)) {
                      window.location.href = "${appDeepLink}";
                  }

                  // fallback
                  setTimeout(function() {
                      window.location.href =
                        "https://hii.life/app/server/api/v1/app/common/downloadApp";
                  }, 2000);
              })();
          </script>

          <style>
              body {
                  font-family: Arial;
                  text-align: center;
                  padding-top: 60px;
              }
          </style>
      </head>
      <body>
          <p>Opening in Hii App...</p>
      </body>
      </html>
    `);

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};

//  GET EVENTS / VENUES
const getEventVenueList = async (req, res) => {
  try {
    const { type, page, limit } = req.query;

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, messages.INVALID_INPUT);
    }

    // ✅ Pagination from helper
    const { limits, offset, pages } = helper.getPagination(page, limit);

    const Model = type === "event" ? Event : Venue;

    // ================= TOTAL COUNT =================
    const totalRecords = await Model.countDocuments({
      is_deleted: false,
      is_active: true
    });

    if (!totalRecords) {
      return apiResponse.ok(
        res,
        helper.getPagingData(0, [], pages, limits),
        messages.NO_DATA_FOUND
      );
    }

    // ================= FETCH DATA =================
    const data = await Model.find({
      is_deleted: false,
      is_active: true
    })
      .select("venue_name venue_image category_ids address end_time start_time start_date")
      .populate("category_ids", "_id category_name")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limits)
      .lean();

    // ================= BUILD RESPONSE =================
    const list = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // max 2 categories
      const categories = [];
      if (item.category_ids && item.category_ids.length) {
        for (let j = 0; j < item.category_ids.length && j < 2; j++) {
          categories.push({
            _id: item.category_ids[j]._id,
            category_name: item.category_ids[j].category_name
          });
        }
      }

      if (type === "event") {

        const formattedTime = helper.formatVenueTime(
          item.start_time,
          item.end_time
        );

        const day = item.start_date
          ? moment(item.start_date)
            .tz("Asia/Kolkata")
            .format("ddd")
          : "";

        list.push({
          event_id: item._id,
          address: item.address,
          date: `${day} , ${formattedTime}`,
          event_name: item.venue_name,
          event_image: item.venue_image,
          categories
        });
      } else {
        list.push({
          address: item.address,
          timing: helper.formatVenueTime(item.start_time, item.end_time),
          venue_id: item._id,
          venue_name: item.venue_name,
          venue_image: item.venue_image,
          categories
        });
      }
    }

    // ✅ Final pagination response like getMyEvents
    const response = helper.getPagingData(totalRecords, list, pages, limits);

    return apiResponse.ok(res, response, messages.DATA_FOUND);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

//  GET MEMBERS
const getAllMembers = async (req, res) => {
  try {
    const userId = req.userId;
    const { page, limit } = req.query;

    // Pagination
    const { limits, offset, pages } = helper.getPagination(page, limit);

    /* STEP 1 : GET BLOCK RELATIONS */
    const blockRelations = await UserBlock.find({
      is_blocked: true,
      $or: [{ blocked_by: userId }, { blocked_user: userId }]
    })
      .select("blocked_by blocked_user")
      .lean();

    const excludedIds = [];

    blockRelations.forEach((b) => {
      if (b.blocked_by.toString() === userId.toString()) {
        excludedIds.push(b.blocked_user);
      } else {
        excludedIds.push(b.blocked_by);
      }
    });

    /* STEP 2 : TOTAL FRIEND COUNT */
    const totalRecords = await Friendship.countDocuments({
      status: "accepted",
      $or: [{ user_id_1: userId }, { user_id_2: userId }]
    });

    if (!totalRecords) {
      return apiResponse.ok(
        res,
        helper.getPagingData(0, [], pages, limits),
        messages.NO_DATA_FOUND
      );
    }

    /* STEP 3 : FETCH FRIENDSHIPS */
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ user_id_1: userId }, { user_id_2: userId }]
    })
      .populate({
        path: "user_id_1 user_id_2",
        select: "first_name last_name name username profile_image is_active is_deleted"
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limits)
      .lean();

    /* STEP 4 : BUILD RESPONSE */
    const list = [];

    friendships.forEach((f) => {
      let otherUser;

      if (f.user_id_1._id.toString() === userId.toString()) {
        otherUser = f.user_id_2;
      } else {
        otherUser = f.user_id_1;
      }

      // Skip blocked or inactive users
      if (
        !otherUser ||
        excludedIds.includes(otherUser._id.toString()) ||
        !otherUser.is_active ||
        otherUser.is_deleted
      ) {
        return;
      }

      list.push({
        user_id: otherUser._id,
        profile_image: otherUser.profile_image,
        full_name:
          otherUser.name ||
          `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim(),
        username: otherUser.username
      });
    });

    /* FINAL RESPONSE */
    const response = helper.getPagingData(totalRecords, list, pages, limits);

    return apiResponse.ok(res, response, messages.DATA_FOUND);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

export default { getContent, getContentById, filterEventsVenues, getTrendingSearches, calenderFilter, getMyMembers, getMyVenues, getMyEvents, blockUnblockUser, getMyBlockedUsers, getProfileCompletionStatus, getEventVenueList, getAllMembers, deepLink, downloadApp };