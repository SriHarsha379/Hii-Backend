import { Event, EventLike, User, Venue, Friendship, Ads, Notification, UserBlock, VenueLike, UserReport } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js"
import sendNotification from "../../utility/notification.js";


const getHomeData = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, page = 1, limit = 10 } = req.query;
    const { limits, offset } = helper.getPagination(page, limit);

    if (!type) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ===== INJECT ADS HELPER ===== */
    const injectAds = (list, ads, type) => {
      if (!ads.length) return list;

      const result = [];
      let adIndex = 0;

      const pattern = [2, 3, 2, 4, 2, 3];
      let patternIndex = 0;
      let nextInsertAfter = pattern[patternIndex];
      let counter = 0;

      for (let i = 0; i < list.length; i++) {
        result.push(list[i]);
        counter++;

        if (counter === nextInsertAfter && ads[adIndex]) {
          // ad_id/link_url were previously missing here, which meant the
          // app had no way to report back which ad was shown/tapped, or
          // to open the ad's link at all.
          let adObj = {
            type: "ad",
            ad_id: ads[adIndex]._id,
            link_url: ads[adIndex].link_url || null,
          };

          // ✅ SAME KEY AS ORIGINAL RESPONSE
          if (type === "member") {
            adObj.profile_image = ads[adIndex].ad_image;
          } else if (type === "event") {
            adObj.event_image = ads[adIndex].ad_image;
          } else if (type === "venue") {
            adObj.venue_image = ads[adIndex].ad_image;
          }

          result.push(adObj);

          adIndex++;
          patternIndex = (patternIndex + 1) % pattern.length;
          nextInsertAfter = pattern[patternIndex];
          counter = 0;
        }
      }

      return result;
    };

    /* ===== CURRENT USER LOCATION ===== */
    const currentUserLocation = await User.findOne({
      _id: userId,
      is_deleted: false,
      is_active: true
    })
      .select("latitude longitude")
      .lean();

    if (!currentUserLocation) {
      // This means the session's own account no longer resolves (deleted/
      // deactivated) - treat it as an invalid session (401) so the app's
      // existing session-expired handling redirects to login, instead of
      // a plain 400 which only shows a toast and leaves the user stuck
      // on stale cached data.
      return apiResponse.unauthorized(res, messages.USER_NOT_FOUND);
    }

    /* ===== SAME AS OLD API ===== */
    const hasUnreadNotifications = await Notification.exists({
      other_user_id: userId,
      read_status: 0,
      is_deleted: 0,
      action: { $ne: "new_message" }
    });

    /* ===== ADS (ONLY NON-EXPIRED) ===== */
    const ads = await Ads.find({
      is_deleted: false,
      $or: [
        { expiry_date: { $gte: new Date() } },
        { expiry_date: { $exists: false } }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    /* ================= MEMBER ================= */
    // if (type === "member") {

    //   // 👉 SAME OLD MEMBER LOGIC (UNCHANGED)
    //   const users = await User.find({
    //     is_deleted: false,
    //     is_active: true,
    //     is_profile_completed: true,
    //     _id: { $ne: userId }
    //   })
    //     .populate("vibes", "vibe")
    //     .populate("city_id", "city_name")
    //     .sort({ createdAt: -1 })
    //     .lean();

    //   const totalRecords = users.length;
    //   const totalPages = Math.ceil(totalRecords / limits);
    //   const paginatedUsers = users.slice(offset, offset + limits);

    //   let list = paginatedUsers.map(u => ({
    //     _id: u._id,
    //     name: u.name,
    //     profile_image: u.profile_image,
    //     bio: u.bio,
    //     vibes: (u.vibes || []).map(v => v.vibe),
    //     distance_km: u.city_id?.city_name || null
    //   }));

    //   list = injectAds(list, ads, type);

    //   return apiResponse.ok(res, {
    //     type,
    //     list,
    //     notification_status: hasUnreadNotifications ? true : false,
    //     total_records: totalRecords,
    //     total_pages: totalPages,
    //     current_page: parseInt(page)
    //   }, messages.DATA_FOUND);
    // }

    if (type === "member") {

      /* ===== SAME OLD FILTER LOGIC ===== */

      const blockedRelations = await UserBlock.find({
        is_blocked: true,
        $or: [
          { blocked_by: userId },
          { blocked_user: userId }
        ]
      }).lean();

      const blockedUserIds = new Set();
      blockedRelations.forEach(b => {
        if (b.blocked_by.toString() === userId.toString()) {
          blockedUserIds.add(b.blocked_user.toString());
        }
        if (b.blocked_user.toString() === userId.toString()) {
          blockedUserIds.add(b.blocked_by.toString());
        }
      });

      const friendships = await Friendship.find({
        status: { $in: ["pending", "accepted"] },
        $or: [
          { user_id_1: userId },
          { user_id_2: userId }
        ]
      }).lean();

      const rejectedByMe = await Friendship.find({
        status: "rejected",
        initiated_by: userId
      }).lean();

      const matchedUserIds = new Set();
      const likedUserIds = new Set();

      friendships.forEach(f => {
        const isFirst = f.user_id_1.toString() === userId.toString();
        const otherUserId = isFirst
          ? f.user_id_2.toString()
          : f.user_id_1.toString();

        if (f.status === "accepted") {
          matchedUserIds.add(otherUserId);
        }

        if (
          f.initiated_by?.toString() === userId.toString() &&
          (f.status === "pending" || f.status === "accepted")
        ) {
          likedUserIds.add(otherUserId);
        }
      });

      const rejectedUserIds = new Set();
      rejectedByMe.forEach(r => {
        const other =
          r.user_id_1.toString() === userId.toString()
            ? r.user_id_2.toString()
            : r.user_id_1.toString();
        rejectedUserIds.add(other);
      });

      const excludedUserIds = new Set([
        ...blockedUserIds,
        ...likedUserIds,
        ...matchedUserIds,
        ...rejectedUserIds
      ]);

      /* ===== FETCH USERS ===== */

      const users = await User.find({
        is_deleted: false,
        is_active: true,
        is_profile_completed: true,
        _id: {
          $ne: userId,
          $nin: Array.from(excludedUserIds)
        }
      })
        .populate("city_id", "city_name")
        .populate("music_genre", "name")
        .sort({ createdAt: -1 })
        .lean();

      const totalRecords = users.length;
      const totalPages = Math.ceil(totalRecords / limits);
      const paginatedUsers = users.slice(offset, offset + limits);

      let list = paginatedUsers.map(u => {
        // Vibe check has been removed - the card now surfaces the
        // member's selected music genres instead (curated + custom).
        const musicGenres = [
          ...(u.music_genre || []).map(g => g.name).filter(Boolean),
          ...(u.custom_music_genres || [])
        ];

        return {
          _id: u._id,
          name: u.name,
          profile_image: u.profile_image,
          bio: u.bio,
          music_genres: musicGenres,
          distance_km: u.city_id?.city_name || null
        };
      });

      /* ===== ADD ADS ===== */
      list = injectAds(list, ads, type);

      return apiResponse.ok(res, {
        type,
        list,
        notification_status: hasUnreadNotifications ? true : false,
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: parseInt(page)
      }, messages.DATA_FOUND);
    }

    /* ================= EVENTS ================= */
    if (type === "event") {

      const likedEventIds = await EventLike.find({
        user_id: userId,
        is_active: true
      }).distinct("event_id");

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
      });

      const allEvents = await Event.find({
        is_deleted: false,
        is_active: true,
        _id: { $nin: likedEventIds }
      })
        .populate("category_ids", "_id category_name")
        .lean();

      const filteredEvents = allEvents.filter(e => e.end_date >= today);

      const totalRecords = filteredEvents.length;
      const totalPages = Math.ceil(totalRecords / limits);

      const events = filteredEvents.slice(offset, offset + limits);

      let list = await Promise.all(events.map(async (e) => {

        const likesData = await EventLike.find({
          event_id: e._id,
          is_active: true,
          is_liked: true
        })
          .sort({ createdAt: -1 })
          .limit(2)
          .populate("user_id", "name profile_image")
          .lean();

        const totalLikes = await EventLike.countDocuments({
          event_id: e._id,
          is_active: true,
          is_liked: true
        });

        const recentUsers = likesData.map(l => ({
          _id: l.user_id?._id,
          name: l.user_id?.name,
          profile_image: l.user_id?.profile_image
        }));

        return {
          _id: e._id,
          event_name: e.venue_name,
          event_image: e.venue_image,
          categories: e.category_ids?.map(c => c.category_name),

          // Raw ISO date, alongside the pre-formatted `date` string below -
          // lets the preview card format it the exact same way the detail
          // screen already does client-side ("22nd Aug, Saturday"),
          // instead of drifting between two different date formats.
          start_date: e.start_date,

          date: helper.formatEventPreviewDate(
            e.start_date,
            e.end_date,
            e.start_time,
            e.is_multi_day
          ),

          venue_name: e.venue_name,
          about: e.about,
          address: e.address,

          distance_km: helper.getDistanceInKm(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            e.latitude,
            e.longitude
          ),

          likes: {
            total_likes: totalLikes,
            recent_users: recentUsers,
            recent_count: Math.max(totalLikes - recentUsers.length, 0)
          }
        };
      }));

      list = injectAds(list, ads, type);

      return apiResponse.ok(res, {
        type,
        list,
        notification_status: hasUnreadNotifications ? true : false,
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: parseInt(page)
      }, messages.DATA_FOUND);
    }

    /* ================= VENUES ================= */
    if (type === "venue") {

      const likedVenueIds = await VenueLike.find({
        user_id: userId,
        is_active: true
      }).distinct("venue_id");

      const totalRecords = await Venue.countDocuments({
        is_deleted: false,
        is_active: true,
        _id: { $nin: likedVenueIds }
      });

      const totalPages = Math.ceil(totalRecords / limits);

      const venues = await Venue.find({
        is_deleted: false,
        is_active: true,
        _id: { $nin: likedVenueIds }
      })
        .populate("category_ids", "_id category_name")
        .skip(offset)
        .limit(limits)
        .lean();

      let list = await Promise.all(venues.map(async (v) => {

        const likesData = await VenueLike.find({
          venue_id: v._id,
          is_active: true,
          is_liked: true
        })
          .sort({ createdAt: -1 })
          .limit(2)
          .populate("user_id", "name profile_image")
          .lean();

        const totalLikes = await VenueLike.countDocuments({
          venue_id: v._id,
          is_active: true,
          is_liked: true
        });

        const recentUsers = likesData.map(l => ({
          _id: l.user_id?._id,
          name: l.user_id?.name,
          profile_image: l.user_id?.profile_image
        }));

        return {
          _id: v._id,
          venue_name: v.venue_name,
          about: v.about,
          venue_image: v.venue_image,

          categories: v.category_ids?.map(c => c.category_name),

          timing: helper.formatVenueTime(v.start_time, v.end_time),
          address: v.address,

          distance_km: helper.getDistanceInKm(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            v.latitude,
            v.longitude
          ),

          likes: {
            total_likes: totalLikes,
            recent_users: recentUsers,
            recent_count: Math.max(totalLikes - recentUsers.length, 0)
          }
        };
      }));

      list = injectAds(list, ads, type);

      return apiResponse.ok(res, {
        type,
        list,
        notification_status: hasUnreadNotifications ? true : false,
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: parseInt(page)
      }, messages.DATA_FOUND);
    }

    return apiResponse.badRequest(res, messages.INVALID_INPUT);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

const getMemberDetail = async (req, res) => {
  try {
    const userId = req.userId;
    const { memberId } = req.params;

    /* ===== SAFE TIME FORMATTER (GLOBAL INSIDE API) ===== */
    const formatTime = (time) => {
      try {
        if (!time) return "";

        if (time instanceof Date) {
          return time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          });
        }

        if (typeof time === "string") {
          if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
            return time;
          }

          if (time.includes(":")) {
            const [hour, minute] = time.split(":");
            if (!hour || !minute) return time;

            const date = new Date();
            date.setHours(Number(hour), Number(minute));

            return date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            });
          }
        }

        return "";
      } catch {
        return "";
      }
    };

    /* ===== MEMBER ===== */
    const member = await User.findOne({
      _id: memberId,
      is_deleted: false,
      is_active: true,
      my_visibility: true
    })
      .populate("event_preferences", "name category_name")
      .populate("music_genre", "name")
      .populate("city_id", "city_name")
      .populate("vibe_checks.question_id", "question")
      .lean();

    const isBlocked = await UserBlock.exists({
      is_blocked: true,
      $or: [
        { blocked_by: userId, blocked_user: memberId },
        { blocked_by: memberId, blocked_user: userId }
      ]
    });

    if (isBlocked) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    if (!member) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    const rawVisibility = member.profile_visibility || {};
    const coerceBool = (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
      if (typeof val === "number") return val === 1;
      return Boolean(val);
    };

    const visibility = {
      age: coerceBool(rawVisibility.age),
      height: coerceBool(rawVisibility.height),
      pronouns: coerceBool(rawVisibility.pronouns),
      location: coerceBool(rawVisibility.location),
      hobbies: coerceBool(rawVisibility.hobbies),
      vibes: coerceBool(rawVisibility.vibes),
      gallery: coerceBool(rawVisibility.gallery),
      recent_events: coerceBool(rawVisibility.recent_events),
      recent_venues: coerceBool(rawVisibility.recent_venues),
      instagram: coerceBool(rawVisibility.instagram),
      spotify: coerceBool(rawVisibility.spotify)
    };

    /* ===== MY LIKE STATUS ===== */
    let isLiked = false;

    if (userId && userId !== memberId) {
      const existingLike = await Friendship.findOne({
        user_id_1: userId,
        user_id_2: memberId,
        status: { $in: ["pending", "accepted"] }
      }).lean();

      isLiked = !!existingLike;
    }

    const gallery = visibility.gallery
      ? (member.user_gallery || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(item => ({
          type: item.type,
          url: item.url,
          thumbnail: item.thumbnail_url || null
        }))
      : [];

    /* ===== INTERESTS ===== */
    const interests = member.interests || [];

    let eventPreferences = member.event_preferences?.map(e => ({
      _id: e._id,
      category_name: e.category_name || e.name || null
    })) || [];

    if (member.custom_event_preferences?.length) {
      member.custom_event_preferences.forEach(customName => {
        eventPreferences.push({
          _id: "",
          category_name: customName
        });
      });
    }

    /* ===== MUSIC GENRES ===== */
    let musicGenres = member.music_genre?.map(g => ({
      _id: g._id,
      genre_name: g.name || null
    })) || [];

    if (member.custom_music_genres?.length) {
      member.custom_music_genres.forEach(customName => {
        musicGenres.push({
          _id: "",
          genre_name: customName
        });
      });
    }

    /* ===== VIBES =====
       Curated Vibe collection removed - now just the member's free-text
       custom_vibes, still gated by the same visibility toggle. */
    const vibes = visibility.vibes
      ? member.custom_vibes || []
      : [];

    /* ===== RECENTLY LIKED EVENTS ===== */
    let recentlyLikedEvents = [];
    if (visibility.recent_events) {
      const likedEvents = await EventLike.find({
        user_id: memberId,
        is_liked: true,
        is_active: true
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: "event_id",
          select: "venue_name venue_image start_time end_time start_date end_date is_multi_day category_ids is_deleted",
          populate: {
            path: "category_ids",
            select: "category_name"
          }
        })
        .lean();

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
      });

      recentlyLikedEvents = likedEvents
        .filter(l =>
          l.event_id &&
          !l.event_id.is_deleted &&
          l.event_id.start_time &&
          l.event_id.end_time &&
          l.event_id.end_date >= today
        )
        .map(l => ({
          _id: l.event_id._id,
          event_name: l.event_id.venue_name,
          event_image: l.event_id.venue_image,

          categories: (l.event_id.category_ids || []).map(cat => ({
            _id: cat._id,
            name: cat.category_name
          })),

          date: helper.formatEventPreviewDate(
            l.event_id.start_date,
            l.event_id.end_date,
            l.event_id.start_time,
            l.event_id.is_multi_day
          )
        }));
    }

    /* ===== RECENTLY LIKED VENUES ===== */
    let recentlyLikedVenues = [];
    if (visibility.recent_venues) {
      const likedVenues = await VenueLike.find({
        user_id: memberId,
        is_liked: true,
        is_active: true
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: "venue_id",
          select: "venue_name venue_image category_ids is_deleted",
          populate: {
            path: "category_ids",
            select: "category_name"
          }
        })
        .lean();

      recentlyLikedVenues = likedVenues
        .filter(v => v.venue_id &&
          !v.venue_id.is_deleted)
        .map(v => ({
          _id: v.venue_id._id,
          venue_name: v.venue_id.venue_name,
          venue_image: v.venue_id.venue_image,

          categories: (v.venue_id.category_ids || []).map(cat => ({
            _id: cat._id,
            name: cat.category_name
          }))
        }));
    }

    /* ===== INSTAGRAM ===== */
    const instagram_url =
      visibility.instagram && member.instagram_account
        ? member.instagram_account
        : null;

    /* ===== SPOTIFY ===== */
    const top_artist = visibility.spotify
      ? {
        name: "The Weeknd",
        image: "default-artist.jpg"
      }
      : null;

    /* ===== VIBE CHECK Q&A (personality answers) ===== */
    const vibeChecks = (member.vibe_checks || [])
      .filter((vc) => vc.question_id && vc.answer)
      .map((vc) => ({
        question: vc.question_id.question || "",
        answer: vc.answer
      }));

    /* ===== RESPONSE ===== */
    const response = {
      _id: member._id,
      name: member.name,
      profile_image: member.profile_image,

      hobbies: visibility.hobbies ? member.hobbies || [] : [],

      age: visibility.age ? member.age : null,
      height: visibility.height ? (member.height ?? null) : null,
      pronouns: visibility.pronouns ? member.pronouns : null,
      interested_in: member.interested_in || null,
      sexuality: member.sexuality || null,

      city_name: visibility.location
        ? member.city_id?.city_name || null
        : null,

      bio: member.bio,
      is_liked: isLiked,

      gallery,
      interests,
      event_preferences: eventPreferences,
      music_genre: musicGenres,
      vibes,
      vibe_checks: vibeChecks,
      instagram_url,
      spotify_url: visibility.spotify && member.spotify_account
        ? member.spotify_account
        : null,
      snapchat_url: member.snapchat_account || null,

      recently_liked_events: recentlyLikedEvents,
      recently_liked_venues: recentlyLikedVenues,

      top_artist
    };

    return apiResponse.ok(res, response, messages.DATA_FOUND);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// Swipe User
const swipeUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { target_user_id, action } = req.body;

    if (!target_user_id || !["left", "right"].includes(action)) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const targetUser = await User.findOne({
      _id: target_user_id,
      is_deleted: false,
      is_active: true
    });

    if (!targetUser) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    let swipe = await Friendship.findOne({
      $or: [
        { user_id_1: userId, user_id_2: target_user_id },
        { user_id_1: target_user_id, user_id_2: userId }
      ]
    });

    if (action === "left") {
      if (!swipe) {
        await Friendship.create({
          user_id_1: userId,
          user_id_2: target_user_id,
          status: "rejected",
          initiated_by: userId
        });
      } else {
        swipe.status = "rejected";
        swipe.user_id_1 = userId;
        swipe.user_id_2 = target_user_id;
        swipe.initiated_by = userId;
        await swipe.save();
      }

      return apiResponse.ok(
        res,
        { matched: false },
        messages.SWIPE_LEFT
      );
    }

    if (
      swipe &&
      swipe.status === "pending" &&
      swipe.initiated_by.toString() === target_user_id.toString()
    ) {
      swipe.status = "accepted";
      await swipe.save();

      const currentUser = await User.findById(userId);

      if (targetUser.player_id) {
        sendNotification(
          "its_match",
          targetUser.player_id,
          {
            type: "user",
            senderId: userId,
            other_user_id: target_user_id,
            action: "its_match",
            full_name: currentUser.name
          },
          0
        ).catch(err => console.log("Match target error:", err));
      }

      if (currentUser.player_id) {
        sendNotification(
          "its_match",
          currentUser.player_id,
          {
            type: "user",
            senderId: target_user_id,
            other_user_id: userId,
            action: "its_match",
            full_name: targetUser.name
          },
          0
        ).catch(err => console.log("Match self error:", err));
      }

      return apiResponse.ok(
        res,
        { matched: true },
        messages.ITS_MATCH
      );
    }

    if (swipe && swipe.status === "accepted") {
      return apiResponse.ok(
        res,
        { matched: true },
        messages.ITS_MATCH
      );
    }

    let shouldSendLikeNotification = false;

    if (!swipe) {
      swipe = await Friendship.create({
        user_id_1: userId,
        user_id_2: target_user_id,
        status: "pending",
        initiated_by: userId
      });
      shouldSendLikeNotification = true;
    } else if (swipe.initiated_by.toString() === userId.toString()) {
      if (swipe.status === "pending") {
        return apiResponse.ok(
          res,
          { matched: false },
          messages.SWIPE_RIGHT
        );
      }

      swipe.status = "pending";
      swipe.user_id_1 = userId;
      swipe.user_id_2 = target_user_id;
      await swipe.save();
      shouldSendLikeNotification = true;
    } else {
      swipe.status = "pending";
      swipe.user_id_1 = userId;
      swipe.user_id_2 = target_user_id;
      swipe.initiated_by = userId;
      await swipe.save();
      shouldSendLikeNotification = true;
    }

    if (shouldSendLikeNotification && targetUser.player_id) {
      const currentUser = await User.findById(userId);

      sendNotification(
        "someone_liked_you",
        targetUser.player_id,
        {
          type: "user",
          senderId: userId,
          other_user_id: target_user_id,
          action: "someone_liked_you",
          full_name: currentUser.name
        },
        0
      ).catch(err => console.log("Like notification error:", err));
    }

    return apiResponse.ok(
      res,
      { matched: false },
      messages.SWIPE_RIGHT
    );

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};
// Get Events / Venues By Type
const getEventVenueByType = async (req, res) => {
  try {
    const { type, page, limit } = req.query;

    if (!type) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const { limits, offset, pages } = helper.getPagination(page, limit)

    /* ================= EVENTS ================= */
    if (type === "event") {

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
      });

      const totalCounts = await Event.countDocuments({
        is_deleted: false,
        is_active: true,
        end_date: { $gte: today }
      });

      const events = await Event.find({
        is_deleted: false,
        is_active: true,
        end_date: { $gte: today }
      })
        .populate("category_ids", "_id category_name")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limits)
        .lean();

      const list = events.map(e => ({
        _id: e._id,
        event_name: e.venue_name,
        event_image: e.venue_image,
        categories: e.category_ids
          ?.filter(c => c && c.category_name)
          .map(c => c.category_name),
        date: helper.formatEventPreviewDate(
          e.start_date,
          e.end_date,
          e.start_time,
          e.is_multi_day
        ),
        venue_name: e.venue_name,
        about: e.about,
        address: e.address
      }));

      const response = helper.getPagingData(totalCounts, list, pages, limits)

      return apiResponse.ok(res, response, messages.DATA_FOUND);
    }

    /* ================= VENUES ================= */
    if (type === "venue") {

      const totalCounts = await Venue.countDocuments({
        is_deleted: false,
        is_active: true
      });

      const venues = await Venue.find({
        is_deleted: false,
        is_active: true
      })
        .populate("category_ids", "_id category_name")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limits)
        .lean();

      const list = venues.map(v => ({
        _id: v._id,
        venue_name: v.venue_name,
        venue_image: v.venue_image,
        categories: v.category_ids
          ?.filter(c => c && c.category_name)
          .map(c => c.category_name),
        timing: helper.formatVenueTime(v.start_time, v.end_time),
        about: v.about,
        address: v.address
      }));

      const response = helper.getPagingData(totalCounts, list, pages, limits)
      return apiResponse.ok(res, response, messages.DATA_FOUND);
    }

    return apiResponse.badRequest(res, messages.INVALID_INPUT);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ---------------- UNFRIEND USER ----------------
const unfriendUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { target_user_id, action } = req.body;

    if (!target_user_id || action !== "left") {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ===== CHECK TARGET USER ===== */
    const targetUser = await User.findOne({
      _id: target_user_id,
      is_deleted: false,
      is_active: true
    });

    if (!targetUser) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    /* ===== FIND FRIENDSHIP ===== */
    const friendship = await Friendship.findOne({
      $or: [
        { user_id_1: userId, user_id_2: target_user_id },
        { user_id_1: target_user_id, user_id_2: userId }
      ]
    });

    if (!friendship) {
      return apiResponse.badRequest(res, ["Friendship not found"]);
    }


    /* ===== REMOVE MATCH ===== */
    await Friendship.deleteOne({ _id: friendship._id });

    return apiResponse.ok(
      res,
      { unmatched: true },
      messages.FRIENDSHIP_REMOVED
    );

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ---------------- USER RELATION STATUS ----------------
const getUserRelationStatus = async (req, res) => {
  try {
    const userId = req.userId; // from token
    const { other_user_id } = req.body;

    if (!other_user_id) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ===== CHECK BLOCK STATUS ===== */
    const blockRecord = await UserBlock.findOne({
      blocked_by: userId,
      blocked_user: other_user_id,
      is_blocked: true
    });

    const blocked_by_me = !!blockRecord;

    /* ===== CHECK FRIENDSHIP ===== */
    const friendship = await Friendship.findOne({
      $or: [
        { user_id_1: userId, user_id_2: other_user_id },
        { user_id_1: other_user_id, user_id_2: userId }
      ]
    });

    const is_friend =
      friendship?.status === "accepted" ||
      friendship?.status === "pending"; // treat pending as not unfriended but not accepted

    let unfriend_by_me = false;

    if (!friendship) {
      unfriend_by_me = true;
    } else if (
      friendship.status !== "accepted" &&
      friendship.initiated_by.toString() === userId.toString()
    ) {
      unfriend_by_me = true;
    }
    /* ===== CHECK REPORT STATUS ===== */
    const reportRecord = await UserReport.findOne({
      reported_by: userId,
      reported_user: other_user_id
    });

    const report_status = !!reportRecord;

    /* ===== RESPONSE ===== */
    return apiResponse.ok(res, {
      blocked_by_me,
      unfriend_by_me,
      is_friend: !!is_friend && friendship?.status === "accepted",
      report_status
    });

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ---------------- REPORT USER ----------------
const reportUser = async (req, res) => {
  try {
    const userId = req.userId; // token se
    const { other_user_id } = req.body;

    if (!other_user_id) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ===== CHECK USER EXIST ===== */
    const user = await User.findOne({
      _id: other_user_id,
      is_deleted: false,
      is_active: true
    });

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }


    /* ===== STORE REPORT ===== */
    await UserReport.create({
      reported_by: userId,
      reported_user: other_user_id
    });

    return apiResponse.ok(
      res,
      {},
      messages.USER_REPORTED_SUCCESS
    );

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

export default { getHomeData, getMemberDetail, swipeUser, getEventVenueByType, unfriendUser, getUserRelationStatus, reportUser };