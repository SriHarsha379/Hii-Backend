import { User, Faq, ReportProblem, Content, Friendship, EventLike, Admin, Chat, VenueLike, UserBlock, Conversation, Booking, UserReport } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import logActivity from "../../utility/activityLogger.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import moment from "moment";
import generateToken from "../../utility/generateToken.js";
dotenv.config();



// ---------- EDIT PROFILE
const editProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      first_name,
      last_name,
      username,
      birthdate,
      gender,
      bio,

      preferred_cities,
      latitude,
      longitude,
      radius,

      instagram_account,
      spotify_account,
      snapchat_account,

      music_genre,
      custom_music_genres,
      event_preferences,
      custom_event_preferences,
      custom_vibes,
      vibe_checks,

      sexuality,
      interested_in,
      pronouns,
      custom_pronouns,
      city_id
    } = req.body;

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    /* ================= DUPLICATE USERNAME CHECK ================= */
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: user._id },
        is_deleted: false
      });

      if (usernameExists) {
        return apiResponse.badRequest(res, messages.MSG_USERNAME_EXISTS);
      }

      user.username = username.toLowerCase().trim();
    }

    /* ================= BASIC INFO ================= */
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (first_name || last_name) {
      user.name = `${first_name || user.first_name} ${last_name || user.last_name}`.trim();
    }

    if (birthdate !== undefined) {
      const ageCheck = helper.validateMinimumAge(birthdate, 18);
      if (!ageCheck.valid) {
        return apiResponse.badRequest(
          res,
          ageCheck.reason === "underage"
            ? messages.AGE_RESTRICTION
            : messages.INVALID_DOB
        );
      }
      user.birthdate = birthdate;
    }
    if (gender !== undefined) user.gender = gender;
    if (bio !== undefined) user.bio = bio;

    /* ================= LOCATION ================= */
    if (preferred_cities !== undefined) user.preferred_cities = preferred_cities;
    if (latitude !== undefined) user.latitude = latitude;
    if (longitude !== undefined) user.longitude = longitude;
    if (radius !== undefined) user.radius = radius;
    if (city_id !== undefined) {
      user.city_id = new mongoose.Types.ObjectId(city_id);
    }

    /* ================= SOCIAL LINKS ================= */
    if (instagram_account !== undefined) user.instagram_account = instagram_account;
    if (spotify_account !== undefined) user.spotify_account = spotify_account;
    if (snapchat_account !== undefined) user.snapchat_account = snapchat_account;

    /* ================= INTERESTS ================= */
    const toArray = v => (!v ? [] : Array.isArray(v) ? v : [v]);

    if (music_genre !== undefined) user.music_genre = toArray(music_genre);
    if (custom_music_genres !== undefined) user.custom_music_genres = toArray(custom_music_genres);

    if (event_preferences !== undefined) user.event_preferences = toArray(event_preferences);
    if (custom_event_preferences !== undefined)
      user.custom_event_preferences = toArray(custom_event_preferences);

    if (custom_vibes !== undefined) user.custom_vibes = toArray(custom_vibes);

    if (vibe_checks !== undefined)
      user.vibe_checks = toArray(vibe_checks).slice(0, 3);

    /* ================= IDENTITY ================= */
    if (sexuality !== undefined) user.sexuality = sexuality;
    if (interested_in !== undefined) user.interested_in = interested_in;
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (custom_pronouns !== undefined) user.custom_pronouns = custom_pronouns;

    /* ================= PROFILE IMAGE ================= */
    if (req.file) {
      user.profile_image = req.file.filename;
    }

    /* ================= GALLERY ================= */
    if (req.files?.length) {
      user.user_gallery = req.files.map(f => f.filename);
    }

    await user.save();

    /* ================= TOKEN ================= */
    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;


    return apiResponse.ok(
      res,
      userData,
      messages.PROFILE_UPDATED || "Profile updated successfully"
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- GET SWIPE PROFILE (EDIT PAGE)
const getSwipeProfileSettings = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    }).lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    const visibility = user.profile_visibility || {
      age: true,
      height: true,
      pronouns: true,
      location: true,
      hobbies: true,
      vibes: true,
      gallery: true,
      recent_events: true,
      recent_venues: true,
      instagram: true,
      spotify: true
    };

    return apiResponse.ok(
      res,
      {
        age: visibility.age,
        height: visibility.height,
        pronouns: visibility.pronouns,
        location: visibility.location,
        hobbies: visibility.hobbies,
        vibes: visibility.vibes,
        gallery: visibility.gallery,
        recent_events: visibility.recent_events,
        recent_venues: visibility.recent_venues,
        instagram: visibility.instagram,
        spotify: visibility.spotify
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

// ---------- UPDATE SWIPE PROFILE TOGGLE
const updateProfileVisibility = async (req, res) => {
  try {
    const userId = req.userId;
    const { key, value } = req.body;

    const allowedKeys = [
      "age",
      "height",
      "pronouns",
      "location",
      "hobbies",
      "vibes",
      "gallery",
      "recent_events",
      "recent_venues",
      "instagram",
      "spotify"
    ];

    if (!allowedKeys.includes(key))
      return apiResponse.badRequest(res, messages.TOGGLE_KEYS_REQ);

    // coerce common string/number booleans
    let normalizedValue = value;
    if (typeof value === "string") {
      normalizedValue = value.toLowerCase() === "true" || value === "1";
    } else if (typeof value === "number") {
      normalizedValue = value === 1;
    }

    if (typeof normalizedValue !== "boolean") {
      return apiResponse.badRequest(res, messages.ONLY_BOOLEAN || "Value must be boolean");
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, is_deleted: false },
      {
        $set: {
          [`profile_visibility.${key}`]: normalizedValue
        }
      },
      { new: true }
    ).lean();

    if (!user)
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;
    return apiResponse.ok(
      res,
      userData,
      messages.DATA_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
}

// ---------- TOGGLE GALLERY ITEM VISIBILITY (BY URL)
const updateGalleryItemVisibility = async (req, res) => {
  try {
    const userId = req.userId;
    const { url, is_visible } = req.body;

    // ================= VALIDATION =================
    if (!url)
      return apiResponse.badRequest(res, messages.MEDIA_URL_REQ);

    if (typeof is_visible !== "boolean")
      return apiResponse.badRequest(res, messages.ONLY_BOOLEAN);

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user)
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

    // ================= FIND MEDIA BY URL =================
    const media = user.user_gallery.find(item => item.url === url);

    if (!media)
      return apiResponse.badRequest(res, messages.MEDIA_NOT_FOUND);

    // ================= MAX 3 VISIBLE CHECK =================
    if (is_visible === true) {
      const visibleCount = user.user_gallery.filter(
        item => item.is_visible === true
      ).length;
    }

    // ================= UPDATE =================
    media.is_visible = is_visible;
    await user.save();

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      messages.DATA_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- My Visibility to others
const updateMyVisibility = async (req, res) => {
  try {
    const userId = req.userId;
    const { my_visibility } = req.body;

    if (my_visibility === undefined) {
      return apiResponse.badRequest(
        res,
        messages.MSG_EMPTY_PARAM
      );
    }

    const user = await User.updateOne(
      { _id: userId },
      { $set: { my_visibility: my_visibility } }
    );

    return apiResponse.ok(
      res,
      { my_visibility: my_visibility },
      messages.MSG_SUCCESS,
    );
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
};


// ------------------- DELETE ACCOUNT -------------------
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId
    const { reason } = req.body

    const user = await User.findById(userId)

    user.is_deleted = true
    user.is_active = false
    user.delete_reason = reason
    user.delete_request_date = new Date()

    await user.save()

    return apiResponse.ok(res, {}, messages.ACCOUNT_DELETED)
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}


// ---------- GET FAQ (Customer App)
const getFaqForCustomer = async (req, res) => {
  try {
    const faqs = await Faq.find({
      is_deleted: false,
      is_active: true,
      target: { $in: ["FOR_ALL", "FOR_USER"] }
    })
      .select("question answer target")
      .sort({ createdAt: -1 })
      .lean();

    return apiResponse.ok(
      res,
      faqs,
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


// ---------- REPORT A PROBLEM
const reportProblem = async (req, res) => {
  try {
    const userId = req.userId;
    const { description } = req.body;

    if (!description) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    let attachments = [];

    // ---------- IMAGES
    if (req.files?.images?.length) {
      req.files.images.forEach(file => {
        attachments.push({
          file: file.filename,
          type: "Image",
          thumbnail: null
        });
      });
    }

    // ---------- VIDEOS
    if (req.files?.videos?.length) {
      req.files.videos.forEach((video, idx) => {
        const thumbnail =
          req.files?.thumbnails?.[idx]?.filename ||
          req.files?.thumbnails?.[0]?.filename ||
          null;

        attachments.push({
          file: video.filename,
          type: "Video",
          thumbnail
        });
      });
    }

    const report = await ReportProblem.create({
      user_id: userId,
      description,
      attachments
    });

    return apiResponse.ok(
      res,
      report,
      messages.MSG_SUCCESS
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- GET SUPPORT EMAIL
const getSupportEmail = async (req, res) => {
  try {
    const supportEmail = await Content.findOne({
      content_type: 7,
      delete_flag: 0
    })
      .select("content")
      .lean();

    if (!supportEmail) {
      return apiResponse.badRequest(
        res,
        messages.NO_DATA_FOUND
      );
    }

    return apiResponse.ok(
      res,
      { support_email: supportEmail.content },
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

// Update User Interests
const updateUserInterests = async (req, res) => {
  try {
    const userId = req.userId;
    const { interests } = req.body;

    if (!Array.isArray(interests))
      return apiResponse.badRequest(res, messages.INTEREST_MUST_ARRAY);

    const user = await User.findOne({ _id: userId, is_deleted: false });
    if (!user)
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

    user.interests = [...new Set(
      interests.map(i => i.trim()).filter(Boolean)
    )];

    await user.save();

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(res, userData, messages.DATA_ADDED);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};


// Get My Profile Datas (FINAL CLEAN VERSION)
const getMyProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    })
      .populate("music_genre", "_id name image")
      .populate("event_preferences", "_id category_name image")
      .lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    const total_likes = await Friendship.countDocuments({
      user_id_2: userId,
      status: "pending",
      initiated_by: { $ne: userId }
    });

    const total_friends = await Friendship.countDocuments({
      status: "accepted",
      $or: [
        { user_id_1: userId },
        { user_id_2: userId }
      ]
    });

    /* ================= USER GALLERY ================= */
    const gallery = (user.user_gallery || [])
      .sort((a, b) => new Date(b._id.getTimestamp()) - new Date(a._id.getTimestamp()))
      .map(item => ({
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail_url || null
      }));

    /* ================= VIBES =================
       Curated Vibe collection removed - this now just passes through the
       member's free-text custom_vibes. Kept under the same "vibes" key
       so any existing app-side code reading this field doesn't need to
       change - it already only ever consumed the name/string. */
    const vibes = user.custom_vibes || [];

    /* ================= RECENTLY LIKED EVENTS ================= */
    const likedEvents = await EventLike.find({
      user_id: userId,
      is_liked: true,
      is_active: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "event_id",
        select: "venue_name venue_image start_date start_time end_time category_ids",
        populate: { path: "category_ids", select: "category_name" }
      })
      .lean();

    const recently_liked_events = likedEvents
      .filter(e => e.event_id)
      .map(e => {
        const formattedTime = helper.formatVenueTime(
          e.event_id.start_time,
          e.event_id.end_time
        );

        const day = e.event_id.start_date
          ? moment(e.event_id.start_date)
            .tz("Asia/Kolkata")
            .format("ddd")
          : "";

        return {
          _id: e.event_id._id,
          event_name: e.event_id.venue_name,
          event_image: e.event_id.venue_image,

          categories: (e.event_id.category_ids || []).map(cat => ({
            _id: cat._id,
            name: cat.category_name
          })),

          date: `${day} , ${formattedTime}`
        };
      });
    /* ================= RECENTLY LIKED VENUES ================= */
    const likedVenues = await VenueLike.find({
      user_id: userId,
      is_liked: true,
      is_active: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "venue_id",
        select: "venue_name venue_image category_ids",
        populate: { path: "category_ids", select: "category_name" }
      })
      .lean();

    const recently_liked_venues = likedVenues
      .filter(v => v.venue_id)
      .map(v => ({
        _id: v.venue_id._id,
        venue_name: v.venue_id.venue_name,
        venue_image: v.venue_id.venue_image,
        categories: (v.venue_id.category_ids || []).map(cat => ({
          _id: cat._id,
          name: cat.category_name
        }))
      }));

    /* ================= FINAL RESPONSE ================= */
    const response = {
      user_id: user._id,
      name: user.name || "",
      profile_image: user.profile_image || null,
      bio: user.bio || "",
      height: user.height || null,
      hobbies: user.hobbies || [],
      interests: user.interests || [],
      event_preferences: user.event_preferences || [],
      custom_event_preferences: user.custom_event_preferences || [],
      vibes: vibes,
      custom_vibes: user.custom_vibes || [],
      user_gallery: gallery,
      instagram: user.instagram_account || "",
      spotify: user.spotify_account || "",
      snapchat: user.snapchat_account || "",
      liked_events: recently_liked_events,
      followed_venues: recently_liked_venues,
      top_artist: {
        name: "The Weeknd",
        image: "default-artist.jpg"
      },
      total_likes: total_likes,
      total_friends: total_friends
    };

    return apiResponse.ok(res, response, messages.DATA_FOUND);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};



// ---------- UPLOAD USER GALLERY (IMAGES + VIDEOS)
const uploadUserGallery = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user)
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

    const MAX_GALLERY = 9;
    const existingCount = user.user_gallery.length;

    // 🚫 Already full
    if (existingCount >= MAX_GALLERY) {
      return apiResponse.badRequest(
        res,
        `Gallery limit reached. You can upload maximum ${MAX_GALLERY} media only`
      );
    }

    let galleryItems = [];

    /* ================= IMAGES ================= */
    if (req.files?.images?.length) {
      req.files.images.forEach(file => {
        galleryItems.push({
          url: file.filename, // or file.location (S3)
          type: "image",
          thumbnail_url: null,
          is_visible: true
        });
      });
    }

    /* ================= VIDEOS ================= */
    if (req.files?.videos?.length) {
      req.files.videos.forEach((file, index) => {
        galleryItems.push({
          url: file.filename,
          type: "video",
          thumbnail_url:
            req.files.thumbnails?.[index]?.filename || null,
          is_visible: true
        });
      });
    }

    const uploadCount = galleryItems.length;

    const remainingSlots = MAX_GALLERY - existingCount;

    // 🚫 Exceeds limit
    if (uploadCount > remainingSlots) {
      return apiResponse.badRequest(
        res,
        `You can upload maximum ${remainingSlots} more media`
      );
    }

    /* ================= SAVE ================= */
    user.user_gallery.push(...galleryItems);
    await user.save();
    helper.checkAndNotifyProfileCompletion(userId).catch(() => {});

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      messages.MEDIA_UPLOADED_SUCCESS
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- UPDATE USER HOBBIES
const updateUserHobbies = async (req, res) => {
  try {
    const userId = req.userId;
    const { hobbies } = req.body;

    if (hobbies === undefined) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    // convert to array safely
    const toArray = (h) =>
      Array.isArray(h) ? h : [h];

    // clean + trim + remove empty + unique
    const cleanedHobbies = [
      ...new Set(
        toArray(hobbies)
          .map(h => String(h).trim())
          .filter(Boolean)
      )
    ];

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, is_deleted: false },
      { $set: { hobbies: cleanedHobbies } },
      { new: true }
    );

    if (!updatedUser) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    helper.checkAndNotifyProfileCompletion(userId).catch(() => {});

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      messages.HOBBIES_UPDATE_SUCCESS
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- GET RECENT LIKED EVENTS / VENUES
const getRecentLikedItems = async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.query;

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(
        res,
        messages.VENUES_EVENTS_TYPE_REQ
      );
    }

    let data = [];

    if (type === "event") {
      data = await EventLike.find({
        user_id: userId,
        is_liked: true,
        is_active: true
      })
        .populate({
          path: "event_id",
          select: "name image start_date city_id",
          populate: {
            path: "city_id",
            select: "city_name"
          }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      data = data
        .filter(e => e.event_id)
        .map(e => ({
          id: e.event_id._id,
          name: e.event_id.name,
          image: e.event_id.image || null,
          start_date: e.event_id.start_date,
          city: e.event_id.city_id?.city_name || null,
          liked_at: e.createdAt
        }));
    }

    if (type === "venue") {
      data = await VenueLike.find({
        user_id: userId,
        is_liked: true,
        is_active: true
      })
        .populate({
          path: "venue_id",
          select: "name image city_id",
          populate: {
            path: "city_id",
            select: "city_name"
          }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      data = data
        .filter(v => v.venue_id)
        .map(v => ({
          id: v.venue_id._id,
          name: v.venue_id.name,
          image: v.venue_id.image || null,
          city: v.venue_id.city_id?.city_name || null,
          liked_at: v.createdAt
        }));
    }

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
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


// ---------- UPDATE SOCIAL ACCOUNT (INSTAGRAM / SPOTIFY / SNAPCHAT)
const updateSocialAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, url } = req.body;

    if (!type) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const allowedTypes = ["instagram", "spotify", "snapchat"];

    if (!allowedTypes.includes(type)) {
      return apiResponse.badRequest(
        res,
        "Invalid type. Allowed: instagram, spotify, snapchat"
      );
    }

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    /* ================= UPDATE FIELD ================= */
    if (type === "instagram") {
      user.instagram_account = url || "";
    }

    if (type === "spotify") {
      user.spotify_account = url || "";
    }

    if (type === "snapchat") {
      user.snapchat_account = url || "";
    }

    await user.save();

    return apiResponse.ok(
      res,
      {
        type,
        url: url || "",
        is_connected: Boolean(url)
      },
      messages.SOCIAL_ACCOUNT_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// Add / Update User Vibes
const addUserVibes = async (req, res) => {
  try {
    const userId = req.userId;
    // The curated Vibe collection was removed - this endpoint now stores
    // whatever free-text vibes the member sends directly into
    // custom_vibes. Still read from the "vibes" request-body key so the
    // app doesn't need a request-shape change, just no curated IDs.
    const { vibes } = req.body;

    if (vibes === undefined) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const toArray = (v) =>
      Array.isArray(v) ? v : [v];

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, is_deleted: false },
      {
        $set: {
          custom_vibes: toArray(vibes)
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      messages.DATA_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};


// Add User Event Preferences
const addUserEventPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const { event_preferences, custom_event_preferences } = req.body;

    if (!event_preferences && !custom_event_preferences) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const toArray = (v) =>
      !v ? [] : Array.isArray(v) ? v : [v];

    let updateData = {};

    if (event_preferences !== undefined) {
      updateData.event_preferences = toArray(event_preferences);
    }

    if (custom_event_preferences !== undefined) {
      updateData.custom_event_preferences = toArray(custom_event_preferences);
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, is_deleted: false },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      messages.DATA_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- DELETE USER GALLERY ITEM
const deleteUserGalleryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { url } = req.body; // filename or url

    if (!url) {
      return apiResponse.badRequest(res, messages.MEDIA_URL_REQ);
    }

    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    // Find media index
    const mediaIndex = user.user_gallery.findIndex(
      item => item.url === url
    );

    if (mediaIndex === -1) {
      return apiResponse.badRequest(res, messages.MEDIA_NOT_FOUND);
    }

    const mediaItem = user.user_gallery[mediaIndex];

    // Remove from DB
    user.user_gallery.splice(mediaIndex, 1);
    await user.save();

    /* ================= DELETE FILE FROM UPLOADS ================= */

    const uploadPath = path.join(
      process.cwd(),
      "uploads",
      mediaItem.url
    );

    if (fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }

    // If video thumbnail exists
    if (mediaItem.thumbnail_url) {
      const thumbPath = path.join(
        process.cwd(),
        "uploads",
        mediaItem.thumbnail_url
      );

      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    const token = generateToken.generateToken(userId);
    const userData = await helper.getUserData(userId);
    userData.token = token;

    return apiResponse.ok(
      res,
      userData,
      "Gallery item deleted successfully"
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// ---------- UPDATE NOTIFICATION TOGGLE
const updateNotificationSetting = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, value } = req.body;

    if (!type || typeof value !== "boolean") {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    const allowedTypes = [
      "event_reminder_notify",
      "friend_invites_notify",
      "msg_chats_notify",
      "club_organizer_notify",
      "promotion_offers_notify"
    ];

    if (!allowedTypes.includes(type)) {
      return apiResponse.badRequest(res, "Invalid notification type");
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, is_deleted: false },
      { $set: { [type]: value } },
      { new: true }
    ).lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    return apiResponse.ok(
      res,
      {
        type,
        value
      },
      messages.DATA_UPDATED
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

// enable 2-fa
const enableTwoFA = async (req, res) => {
  const user_id = req.userId;
  try {
    const { password } = req.body;
    if (!password) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }
    const user = await User.findOne({ _id: user_id, is_deleted: false });
    if (!user) {
      return apiResponse.notFoundResponse(res, messages.NOT_FOUND);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.notFoundResponse(res, messages.INVALID_PASSWORD);
    }
    await User.updateOne(
      { _id: user_id },
      {
        $set: {
          two_factor_enabled: true,
        }
      }
    );
    const userData = await helper.getUserData(user_id);
    if (!userData) {
      return apiResponse.notFoundResponse(res, messages.NOT_FOUND);
    }
    return apiResponse.ok(res, userData, messages.TWO_FA_ENABLED);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
}

// ---------- CHANGE PASSWORD (Protected)
const userChangePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { old_password, new_password } = req.body;

    /* ================= REQUIRED CHECK ================= */
    if (!old_password || !new_password) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ================= GET USER ================= */
    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    });

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    /* ================= CHECK OLD PASSWORD ================= */
    const isMatch = await user.comparePassword(old_password);

    if (!isMatch) {
      return apiResponse.badRequest(res, messages.MSG_INVALID_OLD_PASSWORD);
    }

    /* ================= PREVENT SAME PASSWORD ================= */
    const isSamePassword = await user.comparePassword(new_password);
    if (isSamePassword) {
      return apiResponse.badRequest(res, messages.MSG_PASSWORD_SAME);
    }

    /* ================= UPDATE PASSWORD ================= */
    user.password = new_password; // hash will run via pre-save hook
    await user.save();

    return apiResponse.ok(res, {}, messages.MSG_PASSWORD_UPDATED);

  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ---------- GET MY VISIBILITY
const getMyVisibility = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne(
      { _id: userId, is_deleted: false },
      { my_visibility: 1 }
    ).lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    return apiResponse.ok(
      res,
      { my_visibility: user.my_visibility },
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

// ---------- GET NOTIFICATION SETTINGS
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne(
      { _id: userId, is_deleted: false },
      {
        event_reminder_notify: 1,
        friend_invites_notify: 1,
        msg_chats_notify: 1,
        club_organizer_notify: 1,
        promotion_offers_notify: 1
      }
    ).lean();

    if (!user) {
      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
    }

    /* ================= RESPONSE STRUCTURE (AS PER UI) ================= */

    const response = {
      event_reminders: {
        key: "event_reminder_notify",
        title: "Event Reminders",
        description: "Get notified about upcoming events you're interested in.",
        value: user.event_reminder_notify ?? true
      },
      social: [
        {
          key: "friend_invites_notify",
          title: "Friend Invites",
          description: "Receive notifications when friends invite you to events.",
          value: user.friend_invites_notify ?? true
        },
        {
          key: "msg_chats_notify",
          title: "Messages & Chats",
          description: "Get notified about new messages and chats.",
          value: user.msg_chats_notify ?? true
        }
      ],
      updates: {
        key: "club_organizer_notify",
        title: "Club/Organizer Updates",
        description: "Stay informed about updates from clubs and organizers.",
        value: user.club_organizer_notify ?? true
      },
      promotions: {
        key: "promotion_offers_notify",
        title: "Promotions & Offers",
        description: "Receive notifications about special offers and promotions.",
        value: user.promotion_offers_notify ?? true
      }
    };

    return apiResponse.ok(res, response, messages.DATA_FOUND);

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};


const admindetails = async (req, res) => {
  try {

    let UserId = req.userId;

    // ✅ Get Admin Details
    const adminData = await Admin.findOne().lean();

    if (!adminData) {
      return apiResponse.notFound(res, "Admin not found");
    }

    // ✅ Find Conversation (Both Direction Check)
    const conversation = await Conversation.findOne({
      $or: [
        {
          sender_id: UserId,
          receiver_id: adminData._id,
        },
        {
          sender_id: adminData._id,
          receiver_id: UserId,
        },
      ],
    }).lean();
    console.log('--------------', conversation);
    return apiResponse.ok(
      res,
      "Admin details fetched successfully",
      {
        admin: adminData,
        conversation_id: conversation ? conversation._id : null,
      }
    );

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

let checkConverationId = async (req, res) => {
  try {
    let user_id = req.userId
    const { other_user_id } = req.body
    const conversation = await Conversation.findOne({
      $or: [
        {
          sender_id: user_id,
          receiver_id: other_user_id,
        },
        {
          sender_id: other_user_id,
          receiver_id: user_id,
        },
      ],
    }).lean();

    return apiResponse.ok(
      res,
      "details fetched successfully",
      {
        conversation: conversation,
        conversation_id: conversation ? conversation._id : null,
      }
    );
  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
}

/* =======================================================================
   ADMIN USER MANAGEMENT
   (list / view / activate-deactivate-ban / soft-deleted list / bookings /
   reports — powers the admin dashboard's Users page)
======================================================================= */

// Small helper: derive a display status from the boolean flags on the model,
// since the schema itself doesn't store a single "status" string.
const deriveUserStatus = (user) => {
  if (user.is_deleted) return "DELETED";
  if (user.is_banned) return "BANNED";
  return user.is_active ? "ACTIVE" : "INACTIVE";
};

const withStatus = (userDoc) => {
  const plain = typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;
  return { ...plain, status: deriveUserStatus(plain) };
};

// GET /user/get_all_user
// Supports search (?search=), status filter (?status=ACTIVE|INACTIVE|BANNED),
// city filter (?city_id=), pagination (?page=&limit=) and sorting
// (?sort_by=&sort_order=asc|desc). Always excludes soft-deleted users.
const getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      status,
      city_id,
      page = 1,
      limit = 100,
      sort_by = "createdAt",
      sort_order = "desc"
    } = req.query;

    const filter = { is_deleted: false };

    if (city_id) filter.city_id = city_id;

    if (status) {
      const normalized = String(status).toUpperCase();
      if (normalized === "ACTIVE") {
        filter.is_active = true;
        filter.is_banned = { $ne: true };
      } else if (normalized === "INACTIVE") {
        filter.is_active = false;
        filter.is_banned = { $ne: true };
      } else if (normalized === "BANNED") {
        filter.is_banned = true;
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { first_name: regex },
        { last_name: regex },
        { username: regex },
        { email: regex },
        { phone_number: regex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;
    const sortDir = String(sort_order).toLowerCase() === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -otp -email_otp -forget_otp")
        .populate("city_id", "city_name")
        .sort({ [sort_by]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    const data = users.map((u) => ({
      ...u,
      status: deriveUserStatus(u),
      city: u.city_id?.city_name || null
    }));

    return apiResponse.ok(
      res,
      { users: data, total, page: pageNum, limit: limitNum },
      messages.USER_LIST_FETCHED
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /user/get_user_by_id/:id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, is_deleted: false })
      .select("-password -otp -email_otp -forget_otp")
      .populate("city_id", "city_name")
      .populate("music_genre", "genre_name")
      .populate("event_preferences", "category_name");

    if (!user) return apiResponse.notFoundResponse(res, messages.USER_NOT_FOUND);

    return apiResponse.ok(res, withStatus(user), messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /user/change_Status/:id  body: { status: 'ACTIVE' | 'INACTIVE' | 'BANNED', reason?: string }
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const normalized = String(status || "").toUpperCase();
    if (!["ACTIVE", "INACTIVE", "BANNED"].includes(normalized)) {
      return apiResponse.badRequest(res, messages.INVALID_USER_STATUS);
    }

    const user = await User.findOne({ _id: id, is_deleted: false });
    if (!user) return apiResponse.notFoundResponse(res, messages.USER_NOT_FOUND);

    if (normalized === "BANNED") {
      user.is_banned = true;
      user.is_active = false;
      user.ban_reason = reason || user.ban_reason || null;
    } else if (normalized === "ACTIVE") {
      user.is_banned = false;
      user.is_active = true;
      user.ban_reason = null;
    } else {
      // INACTIVE
      user.is_banned = false;
      user.is_active = false;
    }

    await user.save();

    await logActivity(req, {
      action: "UPDATE",
      resource: "User",
      resource_id: user._id,
      details: `Set status to ${normalized}${reason ? ` (${reason})` : ""} for ${user.name || user.email || user._id}`,
    });

    return apiResponse.ok(res, withStatus(user), messages.USER_STATUS_UPDATED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /user/get_delete_user
const getDeletedUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find({ is_deleted: true })
        .select("-password -otp -email_otp -forget_otp")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments({ is_deleted: true })
    ]);

    return apiResponse.ok(
      res,
      { users, total, page: pageNum, limit: limitNum },
      messages.DELETED_USERS_FETCHED
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /user/get_user_details/:id — richer profile view for the admin detail drawer
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, is_deleted: false })
      .select("-password -otp -email_otp -forget_otp")
      .populate("city_id", "city_name")
      .populate("music_genre", "genre_name")
      .populate("event_preferences", "category_name")
      .lean();

    if (!user) return apiResponse.notFoundResponse(res, messages.USER_NOT_FOUND);

    const [bookingCount, reportCount] = await Promise.all([
      Booking.countDocuments({ user_id: id }),
      UserReport.countDocuments({ reported_user: id })
    ]);

    return apiResponse.ok(
      res,
      {
        ...user,
        status: deriveUserStatus(user),
        stats: { bookingCount, reportCount }
      },
      messages.SUCCESS
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /user/image_uplod  (multipart, field: image[])
const imageUpload = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return apiResponse.badRequest(res, messages.NO_FILES_UPLOADED);
    }

    const urls = files.map((f) => `/uploads/${f.filename}`);
    return apiResponse.ok(res, { files: urls }, messages.IMAGE_UPLOAD_SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /user/get_user_bookings/:id
const getUserBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find({ user_id: id })
        .populate("event_id", "venue_name start_date end_date")
        .populate("vendor_id", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments({ user_id: id })
    ]);

    return apiResponse.ok(res, { bookings, total, page: pageNum, limit: limitNum }, messages.BOOKINGS_FETCHED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /user/get_all_user_reports  (?status=Pending|Reviewed|Resolved|Rejected)
const getUserReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      UserReport.find(filter)
        .populate("reported_by", "name email profile_image")
        .populate("reported_user", "name email profile_image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserReport.countDocuments(filter)
    ]);

    return apiResponse.ok(res, { reports, total, page: pageNum, limit: limitNum }, messages.USER_REPORTS_FETCHED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /user/update_report_status  body: { report_id, status, admin_note?, action_taken? }
const updateUserReportStatus = async (req, res) => {
  try {
    const { report_id, status, admin_note, action_taken } = req.body;

    if (!report_id || !status) {
      return apiResponse.badRequest(res, messages.SERVER_ERROR);
    }

    const validStatuses = ["Pending", "Reviewed", "Resolved", "Rejected"];
    if (!validStatuses.includes(status)) {
      return apiResponse.badRequest(res, messages.INVALID_USER_STATUS);
    }

    const update = { status };
    if (admin_note !== undefined) update.admin_note = admin_note;
    if (action_taken !== undefined) update.action_taken = action_taken;

    const report = await UserReport.findByIdAndUpdate(report_id, update, { new: true });
    if (!report) return apiResponse.notFoundResponse(res, messages.REPORT_NOT_FOUND);

    return apiResponse.ok(res, report, messages.REPORT_STATUS_UPDATED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default {
  admindetails, checkConverationId,
  editProfile, updateProfileVisibility, getSwipeProfileSettings, updateMyVisibility, updateGalleryItemVisibility, deleteAccount, getFaqForCustomer, reportProblem, getSupportEmail, updateUserInterests, getMyProfile, uploadUserGallery, updateUserHobbies, getRecentLikedItems,
  updateSocialAccount, addUserVibes, addUserEventPreferences, deleteUserGalleryItem, updateNotificationSetting, userChangePassword, enableTwoFA, getMyVisibility, getNotificationSettings,
  // admin user management
  getAllUsers, getUserById, updateUserStatus, getDeletedUsers, getUserDetails, imageUpload, getUserBookings, getUserReports, updateUserReportStatus
};
