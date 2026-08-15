#!/usr/bin/env bash
set -e
# Run this from the ROOT of your backend repo (the folder that contains `src/`).
echo "Applying files..."

mkdir -p "src/model"
cat > "src/model/userModel.js" << 'CLAUDE_EOF'
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */

    phone_number: { type: String },
    email: { type: String, required: true, unique: true },
    another_email: { type: String, required: false },
    is_another_email_verify: { type: Boolean, default: false },
    password: { type: String },

    first_name: { type: String },
    last_name: { type: String },
    name: { type: String },
    username: { type: String },

    birthdate: { type: Date },
    age: { type: Number },

    weight: { type: Number },
    height: { type: String },

    bio: { type: String },
    country_code: { type: Number },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"]
    },

    profile_image: { type: String, default: "" },

    /* ================= VERIFICATION ================= */

    is_verified: { type: Boolean, default: false },
    is_profile_completed: { type: Boolean, default: false },

    // Last profile-completion percentage we sent a notification for.
    // Used to avoid re-notifying the user on every small edit when the
    // percentage hasn't actually improved since the last notification.
    last_notified_profile_completion: { type: Number, default: null },

    otp: {
      code: { type: String },
      expires_at: { type: Date }
    },

    email_otp: {
      code: { type: String },
      expires_at: { type: Date }
    },

    expiry_time_otp: { type: Date },

    forget_otp: { type: String },
    is_forget_otp: { type: Boolean, default: false },

    /* ================= NOTIFICATIONS ================= */

    notification_push: { type: Boolean, default: true },
    notification_payment: { type: Boolean, default: true },
    event_reminder_notify: { type: Boolean, default: true },
    friend_invites_notify: { type: Boolean, default: true },
    msg_chats_notify: { type: Boolean, default: true },
    club_organizer_notify: { type: Boolean, default: true },
    promotion_offers_notify: { type: Boolean, default: true },

    /* ================= AUTH ================= */

    login_type: {
      type: String,
      enum: ["apple", "google", "email"],
      default: "email"
    },

    socialkey_google: { type: String },
    socialkey_apple: { type: String },

    /* ================= MEDIA ================= */

    user_gallery: [
      {
        url: { type: String, required: true },          // File URL (image or video)
        type: { type: String, enum: ["image", "video"], required: true }, // Type
        thumbnail_url: { type: String, default: null }, // Only for videos
        is_visible: { type: Boolean, default: true }
      },
      { timestamps: true }
    ],

    /* ================= LOCATION ================= */

    city_id: { type: mongoose.Schema.Types.ObjectId, ref: "City" },

    preferred_cities: [
      {
        city_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "City",
          required: true
        },
        latitude: {
          type: Number,
          required: true
        },
        longitude: {
          type: Number,
          required: true
        },
        radius: {
          type: Number,
          required: true
        }
      }
    ],

    /* ================= STATUS ================= */
    referral_code: { type: String, default: null },
    my_referral_code: { type: String, default: null },

    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number },

    /* ================= SOCIAL LINKS ================= */

    instagram_account: { type: String, default: "" },
    spotify_account: { type: String, default: "" },
    snapchat_account: { type: String, default: "" },

    /* ================= HOBBIES ================= */

    hobbies: [{ type: String }],

    /* ================= STEP 3 – MUSIC ================= */

    music_genre: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Genre" }
    ],
    custom_music_genres: [{ type: String }],

    /* ================= STEP 3 – EVENTS ================= */

    event_preferences: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" }
    ],
    custom_event_preferences: [{ type: String }],

    /* ================= STEP 3 - VIBES =================
       The curated Vibe collection (fixed picker list like "Chill pill",
       "High Energy") has been removed entirely - members now only have
       custom_vibes (free text they type themselves). No replacement
       picker was introduced. */

    custom_vibes: [{ type: String }],
    vibe_checks: [
      {
        question_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "VibeCheckQuestion",
          required: true
        },
        answer: {
          type: String,
          required: true
        }
      }
    ],

    /* ================= IDENTITY ================= */

    sexuality: { type: String },

    interested_in: {
      type: String,
      enum: ["Men", "Women", "Everyone"]
    },

    interests: [{ type: String }],

    pronouns: { type: String },

    profile_visibility: {
      age: { type: Boolean, default: true },
      height: { type: Boolean, default: true },
      pronouns: { type: Boolean, default: true },
      location: { type: Boolean, default: true },

      hobbies: { type: Boolean, default: true },
      vibes: { type: Boolean, default: true },
      gallery: { type: Boolean, default: true },

      recent_events: { type: Boolean, default: true },
      recent_venues: { type: Boolean, default: true },

      instagram: { type: Boolean, default: true },
      spotify: { type: Boolean, default: true }
    },

    /* ================= STATUS ================= */

    accepted_terms: { type: Boolean, default: false },
    accepted_privacy_policy: { type: Boolean, default: false },

    is_active: { type: Boolean, default: true },
    is_banned: { type: Boolean, default: false },
    ban_reason: { type: String, default: null },
    is_deleted: { type: Boolean, default: false },
    my_visibility: { type: Boolean, default: true },

    signup_step: { type: Number, default: 0 },
    delete_reason: { type: String },

    /* ================= DEVICE ================= */

    player_id: { type: String, default: null },
    device_type: { type: String, default: null }
  },
  { timestamps: true }
);

/* ================= PASSWORD HASH ================= */

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ================= AGE CALC ================= */

UserSchema.pre("save", function (next) {
  if (this.birthdate) {
    const today = new Date();
    let age = today.getFullYear() - this.birthdate.getFullYear();
    const m = today.getMonth() - this.birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < this.birthdate.getDate())) age--;
    this.age = age;
  }
  next();
});

/* ================= PASSWORD COMPARE ================= */

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
CLAUDE_EOF
echo "  wrote src/model/userModel.js"

mkdir -p "src/model"
cat > "src/model/adsModel.js" << 'CLAUDE_EOF'
import mongoose from "mongoose";
import helper from "../utility/helper.js"

const AdSchema = new mongoose.Schema(
    {

        // ad_title: {
        //     type: String,
        // },
        ad_image: {
            type: String,
            required: true,
        },
        ad_video: {
            type: String,
            default: null,
        },
        link_url: {
            type: String,
            default: null,
        },
        expiry_date: {
            type: Date, // ✅ new field
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true
    }
);

AdSchema.post("find", function (docs) {
    docs.forEach(doc => {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    });
});

AdSchema.post("findOne", function (doc) {
    if (doc) {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    }
});

const Ads = mongoose.model("Ads", AdSchema);
export default Ads;
CLAUDE_EOF
echo "  wrote src/model/adsModel.js"

mkdir -p "src/model"
cat > "src/model/activityLogModel.js" << 'CLAUDE_EOF'
import mongoose from "mongoose";

// Tracks admin/vendor write actions for the Super Admin "Activity Logs" page.
// This model did not exist anywhere in the codebase before — the Activity
// Logs page in the dashboard was calling a `${API_BASE}/activity-logs`
// endpoint that had no route, model, or controller behind it at all.
const ActivityLogSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "actor_type",
    },
    actor_type: {
      type: String,
      enum: ["Admin", "Vendor"],
      default: "Admin",
    },
    admin_name: {
      type: String,
      default: "Unknown",
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
      required: true,
    },
    resource: {
      type: String, // e.g. "User", "Ad", "City", "Genre", "Category"
      required: true,
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      default: "",
    },
    ip_address: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
export default ActivityLog;
CLAUDE_EOF
echo "  wrote src/model/activityLogModel.js"

mkdir -p "src/model"
cat > "src/model/VendorModel.js" << 'CLAUDE_EOF'
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    phone_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    vendor_type: {
      type: String,
      enum: ['owner', 'event_organizer'],
      default: 'owner',
      required: true
    },

    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    landmark: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    business_image: {
      type: String,
      default: "",
    },

    // Bank Details for Indian Banks
    bank_details: {
      account_holder_name: {
        type: String,
        trim: true,
        default: null
      },
      bank_name: {
        type: String,
        trim: true,
        default: null
      },
      account_number: {
        type: String,
        trim: true,
        default: null
      },
      ifsc_code: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },
      account_type: {
        type: String,
        enum: ['savings', 'current'],
        default: 'savings'
      },
      is_verified: {
        type: Boolean,
        default: false
      },
      verified_at: {
        type: Date,
        default: null
      }
    },

    is_verified: {
      type: Boolean,
      // New organiser signups now require Super Admin approval before they
      // can log in — see the "Organiser Requests" review queue. Existing
      // vendors already in the DB keep whatever value they had; this only
      // changes the default for new documents.
      default: false,
    },

    rejection_reason: {
      type: String,
      default: null,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    last_login: {
      type: Date,
    }
  },
  { timestamps: true }
);


VendorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

VendorSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Guard against "OverwriteModelError: Cannot overwrite `Vendor` model once
// compiled" - happens if this file ends up imported via two different
// module paths in the same process (e.g. a script importing it directly
// alongside something that pulls it in via model/index.js). Reusing the
// already-compiled model instead of re-registering fixes it regardless of
// which import path caused the double-load.
const Vendor = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

export default Vendor;
CLAUDE_EOF
echo "  wrote src/model/VendorModel.js"

mkdir -p "src/model"
cat > "src/model/reportProblemModel.js" << 'CLAUDE_EOF'
import mongoose from "mongoose";

const ReportProblemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    attachments: [
      {
        file: {
          type: String,
          required: true
        },
        type: {
          type: String,
          enum: ["Image", "Video"],
          required: true
        },
        thumbnail: {
          type: String,
          default: null
        }
      }
    ],

    status: {
      type: String,
      enum: ["Pending", "Inprogress", "Resolve", "Closed"],
      default: "Pending"
    },

    admin_reply: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const ReportProblem = mongoose.model(
  "ReportProblem",
  ReportProblemSchema
);

export default ReportProblem;
CLAUDE_EOF
echo "  wrote src/model/reportProblemModel.js"

mkdir -p "src/model"
cat > "src/model/index.js" << 'CLAUDE_EOF'
import Admin from "./adminModel.js";

// app model 
import User from "./userModel.js";
import UserSubmitAnswer from "./usersubmitanswerModel.js"
import QuestionAnswer from "./questionanswerModel.js"
import Notification from "./notificationModel.js"
import Faq from "./faqModel.js"
import State from "./stateModel.js"
import City from "./cityModel.js"
import Category from "./categoryModel.js"
import Interest from "./interestModel.js"
import Content from "./contentModel.js"
import Contact from "./contactModel.js"
import Booking from "./bookingModel.js"
import Event from "./eventModel.js"
import Blog from './blogModel.js'
import Amenity from './amenityModel.js'
import Venue from './venueModel.js'
import VenueLike from './venueLikeModel.js'
import Ticket from './ticketModel.js'
import Genre from './genreModel.js'
import Vendor from './vendorModel.js'
import Service from './serviceModel.js'
import withdraw from "./withdrawModel.js";
import Earning from "./earningModel.js";

import Offer from "./offerModel.js"
import Coupon from "./couponModel.js";
import Commission from "./commissionModel.js"
import WithdrawRequest from "./withdrawModel.js";
import SwipeProfile from "./swipeProfileModel.js";
import EventLike from "./eventLikeModel.js";
import VenueFollow from "./venueFollowModel.js";
import Friendship from "./frendshipModel.js";
import ReportProblem from "./reportProblemModel.js";
import VibeCheckQuestion from "./vibeCheckQuestion.js";
import VibeCheck from "./vibeCheckModel.js";
import TrendingSearch from "./trendingSearchModel.js";
import UserBlock from "./userBlockModel.js";
import Conversation from "./conversationModel.js";
import Chat from "./chatModel.js";
import Rating from "./ratingModel.js";
import UserReport from "./userReportModel.js";
import Ads from "./adsModel.js"
import ActivityLog from "./activityLogModel.js"
export {
  // admin model
  Admin,
  QuestionAnswer,
  Faq,
  State,
  City,
  Interest,
  Content,
  Contact,
  Commission,
  Blog,
  Venue,
  VenueLike,
  Event,
  Amenity,
  Category,
  Genre,
  Vendor,
  Service,
  // app model
  User,
  Notification,
  Booking,
  UserSubmitAnswer,
  Ticket,
  withdraw,
  Earning,
  Offer,
  Coupon,
  WithdrawRequest,
  SwipeProfile,
  EventLike,
  VenueFollow,
  Friendship,
  ReportProblem,
  VibeCheckQuestion,
  VibeCheck,
  TrendingSearch,
  UserBlock,
  Conversation,
  Chat,
  Rating,
  UserReport,
  Ads,
  ActivityLog
};
CLAUDE_EOF
echo "  wrote src/model/index.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/userController.js" << 'CLAUDE_EOF'
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
CLAUDE_EOF
echo "  wrote src/controller/admin/userController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/adsController.js" << 'CLAUDE_EOF'
import { Ads } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import logActivity from "../../utility/activityLogger.js";

/* ================= CREATE AD ================= */
const createAd = async (req, res) => {
    try {
        const { expiry_date, link_url } = req.body;
        const ad_image = req.files?.ad_image?.[0]?.filename;
        const ad_video = req.files?.ad_video?.[0]?.filename;

        if (!expiry_date) {
            return apiResponse.badRequest(res, messages.EXPIRYDATE_REQ);
        }

        if (!ad_image) {
            return apiResponse.badRequest(res, messages.ADS_REQ);
        }

        if (link_url && !/^https?:\/\/.+/i.test(link_url)) {
            return apiResponse.badRequest(res, messages.INVALID_AD_LINK);
        }

        const ad = new Ads({
            ad_image,
            ad_video: ad_video || null,
            link_url: link_url || null,
            expiry_date: expiry_date || null
        });

        await ad.save();

        await logActivity(req, { action: "CREATE", resource: "Ad", resource_id: ad._id, details: `Created ad (expires ${expiry_date})` });

        return apiResponse.ok(res, ad, messages.ADS_CREATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= GET ALL ADS ================= */
const getAds = async (req, res) => {
    try {
        const ads = await Ads.find({
            is_deleted: false
        }).sort({ createdAt: -1 });

        return apiResponse.ok(res, ads, messages.ADS_FOUND);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= UPDATE AD ================= */
const updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiry_date, link_url } = req.body;

        const ad_image = req.files?.ad_image?.[0]?.filename;
        const ad_video = req.files?.ad_video?.[0]?.filename;

        const ad = await Ads.findOne({
            _id: id,
            is_deleted: false
        });

        if (!ad) {
            return apiResponse.notFoundResponse(res, messages.ADS_NOT_FOUND);
        }

        if (link_url && !/^https?:\/\/.+/i.test(link_url)) {
            return apiResponse.badRequest(res, messages.INVALID_AD_LINK);
        }

        // ✅ All fields optional
        if (expiry_date !== undefined) {
            ad.expiry_date = expiry_date;
        }

        if (ad_image !== undefined) {
            ad.ad_image = ad_image;
        }

        if (ad_video !== undefined) {
            ad.ad_video = ad_video;
        }

        if (link_url !== undefined) {
            ad.link_url = link_url || null;
        }

        await ad.save();

        await logActivity(req, { action: "UPDATE", resource: "Ad", resource_id: ad._id, details: "Updated ad" });

        return apiResponse.ok(res, ad, messages.ADS_UPDATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= DELETE AD ================= */
const deleteAd = async (req, res) => {
    try {
        const ad = await Ads.findOne({
            _id: req.params.id,
            is_deleted: false
        });

        if (!ad) {
            return apiResponse.notFoundResponse(res, messages.ADS_NOT_FOUND);
        }

        ad.is_deleted = true;

        await ad.save();

        await logActivity(req, { action: "DELETE", resource: "Ad", resource_id: ad._id, details: "Deleted ad" });

        return apiResponse.ok(res, ad, messages.ADS_DELETED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default {
    createAd,
    getAds,
    updateAd,
    deleteAd
};
CLAUDE_EOF
echo "  wrote src/controller/admin/adsController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/cityController.js" << 'CLAUDE_EOF'
import { City, State } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from 'moment';
import logActivity from "../../utility/activityLogger.js";

const createCity = async (req, res) => {
    try {
        const { city_name, state_id, latitude, longitude } = req.body;

        const city_image = req.file ? req.file.filename : null;

        // ================= CHECK STATE =================
        const existState = await State.findById(state_id);
        if (!existState) {
            return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);
        }

        // ================= CHECK CITY =================
        const existCity = await City.findOne({
            city_name: city_name.trim(),
            state_id,
            is_deleted: false
        });

        if (existCity) {
            return apiResponse.badRequest(res, messages.CITY_ALREADY);
        }

        // ================= CREATE CITY =================
        const city = new City({
            city_name: city_name.trim(),
            state_id,
            city_image,
            latitude: Number(latitude),
            longitude: Number(longitude)
        });

        await city.save();

        await logActivity(req, { action: "CREATE", resource: "City", resource_id: city._id, details: `Created city "${city.city_name}"` });

        return apiResponse.ok(res, city, messages.CITY_CREATED);
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


const getCity = async (req, res) => {
    try {
        const city = await City.find({ is_active: true, is_deleted: false })
            .populate({
                path: "state_id",
                select: "state_name",
            })
            .sort({ createdAt: -1 });

        return apiResponse.ok(res, city, messages.SUCCESS);
    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { city_name, state_id, latitude, longitude } = req.body;

        const city_image = req.file ? req.file.filename : undefined;

        const city = await City.findOne({ _id: id, is_deleted: false });
        if (!city) {
            return apiResponse.notFoundResponse(res, messages.CITY_NOT_FOUND);
        }

        if (state_id) {
            const existState = await State.findById(state_id);
            if (!existState) {
                return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);
            }
        }

        // 🔥 Proper trim validation
        let updatedName = city.city_name;

        if (city_name !== undefined) {
            const trimmedName = city_name.trim();

            if (!trimmedName) {
                return apiResponse.badRequest(res, "City name cannot be empty");
            }

            updatedName = trimmedName;
        }

        const updatedState = state_id ? state_id : city.state_id;

        const existCity = await City.findOne({
            city_name: updatedName,
            state_id: updatedState,
            _id: { $ne: id },
            is_deleted: false
        });

        if (existCity) {
            return apiResponse.badRequest(res, messages.CITY_ALREADY);
        }

        const updateData = {
            city_name: updatedName,
            state_id: updatedState,
        };

        if (latitude) updateData.latitude = latitude;
        if (longitude) updateData.longitude = longitude;
        if (city_image !== undefined) updateData.city_image = city_image;

        const updatedCity = await City.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        return apiResponse.ok(res, updatedCity, messages.CITY_UPDATED);

    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;

        const city = await City.findByIdAndUpdate(
            id,
            {
                is_deleted: true,
                is_active: false
            },
            { new: true } // return updated doc
        );

        if (!city) {
            return apiResponse.notFoundResponse(res, messages.CITY_NOT_FOUND);
        }

        return apiResponse.ok(res, city, messages.CITY_DELETED_SUCCESSFULLY);

    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

export default { createCity, getCity, updateCity, deleteCity }
CLAUDE_EOF
echo "  wrote src/controller/admin/cityController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/activityLogController.js" << 'CLAUDE_EOF'
import { ActivityLog } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /activity-logs/get_all
// Supports search (?search=), action filter (?action=CREATE|UPDATE|DELETE|LOGIN|LOGOUT),
// pagination (?page=&limit=).
const getAllLogs = async (req, res) => {
  try {
    const { search = "", action, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (action) filter.action = String(action).toUpperCase();
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ admin_name: regex }, { action: regex }, { resource: regex }, { details: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return apiResponse.ok(res, { logs, total, page: pageNum, limit: limitNum }, messages.ACTIVITY_LOGS_FETCHED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllLogs };
CLAUDE_EOF
echo "  wrote src/controller/admin/activityLogController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/vendorController.js" << 'CLAUDE_EOF'
// Update your vendorController.js with these changes

import bcrypt from "bcryptjs";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import { Vendor, Event, Venue, Booking, WithdrawRequest } from "../../model/index.js";
import { updateVendorSchema } from "../../validation/admin/vendorValidation.js";
import sendmail from "../../utility/sendmail.js"; // Add this import
import logActivity from "../../utility/activityLogger.js";


/* GET ALL VENDORS
   Supports optional ?is_verified=true|false filter — used by the "Organiser
   Requests" review queue to list only pending (unapproved) signups, without
   changing behavior for existing callers that don't pass it. */
const getAllVendors = async (req, res) => {
  try {
    console.log('Fetching all vendors...');

    const filter = { is_deleted: false };
    if (req.query.is_verified === 'true') filter.is_verified = true;
    if (req.query.is_verified === 'false') filter.is_verified = false;

    const vendors = await Vendor.find(filter)
      .select("name email phone_number city state is_active is_verified rejection_reason business_image createdAt vendor_type") // Add vendor_type
      .populate('city', 'city_name')
      .populate('state', 'state_name')
      .sort({ createdAt: -1 });

    console.log(`Found ${vendors.length} vendors`);
    return apiResponse.ok(res, vendors, messages.VENDOR_LIST_FETCHED);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET SINGLE VENDOR */
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching vendor by ID:', id);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    })
      .select("name email phone_number city state is_active business_image createdAt address landmark vendor_type")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    if (!vendor) {
      console.log('Vendor not found with ID:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    console.log('Vendor found:', vendor.email);
    return apiResponse.ok(res, vendor, messages.SUCCESS);
  } catch (err) {
    console.error('Error fetching vendor by ID:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* ================= ORGANISER REQUESTS: APPROVE / REJECT =================
   Powers the "Organiser Requests" review queue — new club/event organiser
   signups land with is_verified: false and can't log in (see
   vendorAuthController.vendorLogin) until a Super Admin approves them here.
*/

/* APPROVE VENDOR */
const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({ _id: id, is_deleted: false });
    if (!vendor) return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);

    if (vendor.is_verified) {
      return apiResponse.ok(res, vendor, "Vendor is already approved");
    }

    vendor.is_verified = true;
    vendor.rejection_reason = null;
    await vendor.save();

    await logActivity(req, {
      action: "UPDATE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `Approved ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} "${vendor.name}"`,
    });

    return apiResponse.ok(res, vendor, messages.VENDOR_APPROVED);
  } catch (err) {
    console.error('Error approving vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* REJECT VENDOR */
const rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findOne({ _id: id, is_deleted: false });
    if (!vendor) return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);

    vendor.is_verified = false;
    vendor.is_active = false;
    vendor.is_deleted = true;
    vendor.rejection_reason = reason || null;
    await vendor.save();

    await logActivity(req, {
      action: "DELETE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `Rejected ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} "${vendor.name}"${reason ? ` (${reason})` : ""}`,
    });

    return apiResponse.ok(res, vendor, messages.VENDOR_REJECTED);
  } catch (err) {
    console.error('Error rejecting vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* CREATE VENDOR */
const createVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone_number,
      city,
      state,
      address,
      landmark,
      password,
      vendor_type  // NEW: vendor_type field
    } = req.body;

    console.log('🔨 Creating vendor with data:', {
      name,
      email,
      phone_number,
      city,
      state,
      address,
      landmark,
      vendor_type
    });

    // Validate required fields
    if (!name || !email || !phone_number || !city || !state || !address || !password || !vendor_type) {
      console.log('Missing required fields');
      return apiResponse.badRequest(res, "All fields are required including vendor type");
    }

    // Validate vendor_type
    if (!['owner', 'event_organizer'].includes(vendor_type)) {
      return apiResponse.badRequest(res, "Vendor type must be either 'owner' or 'event_organizer'");
    }

    // Check if email already exists
    const emailExists = await Vendor.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: false,
    });

    if (emailExists) {
      console.log('❌ Email already exists:', email);
      return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
    }

    // Check if phone number already exists
    const phoneExists = await Vendor.findOne({
      phone_number: phone_number.trim(),
      is_deleted: false,
    });

    if (phoneExists) {
      console.log('❌ Phone already exists:', phone_number);
      return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
    }

    // Create vendor object with new field
    const vendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone_number: phone_number.trim(),
      vendor_type: vendor_type,  // Add vendor type
      city,
      state,
      address: address.trim(),
      landmark: landmark ? landmark.trim() : "",
      password,
      business_image: req.file ? req.file.filename : "",
    };

    console.log('📝 Vendor data to save:', vendorData);

    // Create vendor
    const vendor = await Vendor.create(vendorData);

    console.log('✅ Vendor created successfully:', {
      id: vendor._id,
      email: vendor.email,
      name: vendor.name,
      vendor_type: vendor.vendor_type
    });

    /* ================= SEND WELCOME EMAIL ================= */

    try {

      console.log("📧 Sending welcome email to:", vendor.email);

      const mailResponse = await sendmail.vendorNotificationMailer(
        vendor.name,
        vendor.email,
        password,
        process.env.APP_NAME || "Nightlife",
        `Welcome to ${process.env.APP_NAME || "Nightlife"} as a ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}`,
        `Congratulations! Your ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'} account has been successfully created.<br><br>
    <strong>Account Details:</strong><br>
    • Vendor Name: ${vendor.name}<br>
    • Email: ${vendor.email}<br>
    • Phone: ${vendor.phone_number}<br>
    • Type: ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}<br>
    You can now log in to your vendor dashboard and start managing your services.`,
        "Please login to your account to complete your profile setup.",
        'https://hii.life/app/server/uploads/hii_dark_logo.png'
      );

      console.log("📨 Mail response:", mailResponse);

      if (mailResponse !== "yes") {
        console.error("❌ Email failed");

        return apiResponse.serverError(
          res,
          "Vendor created but email not sent"
        );
      }

      console.log("✅ Email sent successfully");

    } catch (emailError) {

      console.error("❌ Email exception:", emailError);

      return apiResponse.serverError(
        res,
        "Vendor created but email crashed",
        emailError.message
      );
    }

    // Return vendor without password
    const vendorResponse = await Vendor.findById(vendor._id)
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    await logActivity(req, {
      action: "CREATE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `New ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} signup: "${vendor.name}" — pending approval`,
    });

    return apiResponse.created(res, vendorResponse, messages.VENDOR_CREATED);
  } catch (err) {
    console.error('❌ Error creating vendor:', err);

    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
      }
      if (err.keyPattern && err.keyPattern.phone_number) {
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return apiResponse.badRequest(res, errors.join(', '));
    }

    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


/* UPDATE VENDOR */
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone_number, city, state, address, landmark, password, vendor_type } = req.body;

    console.log('🔄 Updating vendor:', id);
    console.log('📥 Request body:', req.body);

    // ✅ ADD VALIDATION
    const { error } = updateVendorSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      return apiResponse.badRequest(res, error.details[0].message);
    }

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!vendor) {
      console.log('❌ Vendor not found for update:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    const updates = {};
    let hasChanges = false;

    // Track what changed for email notification
    const changes = [];

    // ✅ FIX: Always include email in updates if provided
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Only check for duplicates if email is actually changing
      if (normalizedEmail !== vendor.email) {
        const emailExists = await Vendor.findOne({
          email: normalizedEmail,
          _id: { $ne: vendor._id },
          is_deleted: false,
        });

        if (emailExists) {
          console.log('❌ Email already exists during update:', email);
          return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
        }

        changes.push(`Email changed from ${vendor.email} to ${normalizedEmail}`);
      }

      updates.email = normalizedEmail;
      hasChanges = true;
      console.log('📧 Email updated:', normalizedEmail);
    }

    // Phone update check
    if (phone_number && phone_number !== vendor.phone_number) {
      const phoneExists = await Vendor.findOne({
        phone_number,
        _id: { $ne: vendor._id },
        is_deleted: false,
      });

      if (phoneExists) {
        console.log('❌ Phone already exists during update:', phone_number);
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }

      updates.phone_number = phone_number;
      changes.push(`Phone number updated`);
      hasChanges = true;
      console.log('📞 Phone updated');
    }

    // Vendor type update
    if (vendor_type && vendor_type !== vendor.vendor_type) {
      if (!['owner', 'event_organizer'].includes(vendor_type)) {
        return apiResponse.badRequest(res, "Vendor type must be either 'owner' or 'event_organizer'");
      }

      updates.vendor_type = vendor_type;
      changes.push(`Vendor type changed to ${vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}`);
      hasChanges = true;
      console.log('👤 Vendor type updated:', vendor_type);
    }

    // Normal fields - always update if provided
    if (name && name !== vendor.name) {
      updates.name = name;
      changes.push(`Name updated to "${name}"`);
      hasChanges = true;
    }
    if (city && city.toString() !== vendor.city?.toString()) {
      updates.city = city;
      changes.push(`City updated`);
      hasChanges = true;
    }
    if (state && state.toString() !== vendor.state?.toString()) {
      updates.state = state;
      changes.push(`State updated`);
      hasChanges = true;
    }
    if (address && address !== vendor.address) {
      updates.address = address;
      changes.push(`Address updated`);
      hasChanges = true;
    }
    if (landmark !== undefined && landmark !== vendor.landmark) {
      updates.landmark = landmark;
      changes.push(`Landmark updated`);
      hasChanges = true;
    }

    // Password update
    if (password) {
      updates.password = await bcrypt.hash(password, 12);
      changes.push(`Password updated`);
      hasChanges = true;
      console.log('🔑 Password updated');
    }

    // Image update
    if (req.file) {
      updates.business_image = req.file.filename;
      changes.push(`Business image updated`);
      hasChanges = true;
      console.log('🖼️ Image updated');
    }

    if (!hasChanges) {
      console.log('ℹ️ No changes detected for vendor:', id);
      return apiResponse.ok(res, vendor, "No changes made");
    }

    console.log('📝 Updates to apply:', updates);

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    )
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    console.log('✅ Vendor updated successfully:', updatedVendor.email);

    // ✅ Send update notification email
    if (changes.length > 0) {
      try {
        await sendmail.vendorNotificationMailer(
          updatedVendor.name,
          updatedVendor.email,
          process.env.APP_NAME || "Nightlife",
          "Your Vendor Account Has Been Updated",
          `Your vendor account information has been updated by the administration.<br><br>
          <strong>Changes Made:</strong><br>
          • ${changes.join('<br>• ')}<br><br>
          <strong>Updated Account Information:</strong><br>
          • Name: ${updatedVendor.name}<br>
          • Email: ${updatedVendor.email}<br>
          • Phone: ${updatedVendor.phone_number}<br>
          • Type: ${updatedVendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}<br>
          • Status: ${updatedVendor.is_active ? 'Active' : 'Inactive'}<br><br>
          If you did not request these changes or have any concerns, please contact our support team immediately.`,
          "Please review your account information and contact support if needed.",
          process.env.APP_LOGO
        );
        console.log('📧 Update notification email sent to vendor:', updatedVendor.email);
      } catch (emailError) {
        console.error('❌ Failed to send update email:', emailError.message);
      }
    }

    return apiResponse.ok(res, updatedVendor, messages.VENDOR_UPDATED);

  } catch (err) {
    console.error("❌ Error updating vendor:", err);

    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
      }
      if (err.keyPattern?.phone_number) {
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return apiResponse.badRequest(res, errors.join(', '));
    }

    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* CHANGE STATUS - UPDATED WITH EMAIL NOTIFICATION */
const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('🔄 CHANGE_STATUS endpoint called for vendor:', id);
    console.log('📧 Request body:', req.body);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!vendor) {
      console.log('❌ Vendor not found for status change:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    console.log('🔍 Current vendor status:', {
      name: vendor.name,
      email: vendor.email,
      currentStatus: vendor.is_active ? 'active' : 'inactive'
    });

    // Store old status for comparison
    const oldStatus = vendor.is_active;
    vendor.is_active = !vendor.is_active;
    await vendor.save();

    // Determine status for email
    const statusType = vendor.is_active ? 'activated' : 'deactivated';

    console.log('✅ Vendor status changed:', {
      id: vendor._id,
      email: vendor.email,
      oldStatus: oldStatus ? 'active' : 'inactive',
      newStatus: vendor.is_active ? 'active' : 'inactive',
      statusType: statusType,
      reason: reason
    });

    // ✅ Send status change email to vendor
    try {
      console.log(`📧 Calling vendorStatusMailer with statusType: "${statusType}"`);

      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        statusType, // This should be "activated" or "deactivated"
        reason || (statusType === 'activated'
          ? "Your account has been reviewed and approved by our administration team."
          : "Please contact support for more information about this action."),
        process.env.APP_LOGO
      );

      console.log(`📧 Email sending result for ${statusType}:`, {
        success: emailResult.success,
        messageId: emailResult.messageId,
        subject: emailResult.subject,
        error: emailResult.error
      });

      if (emailResult.success) {
        console.log(`✅ ${statusType} email sent successfully to ${vendor.email}`);
      } else {
        console.warn(`⚠️ ${statusType} email failed for ${vendor.email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error(`❌ Error sending ${statusType} email:`, emailError.message);
      console.error(`❌ Email error stack:`, emailError.stack);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: vendor.is_active,
        statusText: vendor.is_active ? 'active' : 'inactive'
      },
      vendor.is_active
        ? messages.VENDOR_ACTIVATED
        : messages.VENDOR_DEACTIVATED
    );
  } catch (err) {
    console.error('❌ Error changing vendor status:', err);
    console.error('❌ Error stack:', err.stack);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};
/* SOFT DELETE - UPDATED WITH EMAIL NOTIFICATION */
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional deletion reason

    console.log('🗑️ Soft deleting vendor:', id, 'Reason:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!vendor) {
      console.log('❌ Vendor not found for deletion:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    // Store vendor info before deletion for email
    const vendorInfo = {
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone_number
    };

    vendor.is_deleted = true;
    vendor.is_active = false;
    vendor.deleted_at = new Date();
    await vendor.save();

    console.log('✅ Vendor soft deleted:', {
      id: vendor._id,
      email: vendor.email,
      deleted_at: vendor.deleted_at
    });

    // ✅ Send deletion notification email to vendor
    try {
      await sendmail.vendorNotificationMailer(
        vendorInfo.name,
        vendorInfo.email,
        process.env.APP_NAME || "Nightlife",
        "Your Vendor Account Has Been Deleted",
        `We regret to inform you that your vendor account has been deleted from our platform.<br><br>
        <strong>Account Information:</strong><br>
        • Vendor Name: ${vendorInfo.name}<br>
        • Email: ${vendorInfo.email}<br>
        • Phone: ${vendorInfo.phone}<br>
        • Deletion Date: ${new Date().toLocaleDateString()}<br>
        ${reason ? `<br><strong>Reason for Deletion:</strong> ${reason}` : ''}<br><br>
        All your data will be permanently removed from our system within 30 days as per our data retention policy.<br><br>
        If you believe this was done in error or have any questions, please contact our support team immediately.`,
        "Contact support within 30 days if you want to restore your account.",
        process.env.APP_LOGO
      );
      console.log('📧 Deletion notification email sent to vendor:', vendorInfo.email);
    } catch (emailError) {
      console.error('❌ Failed to send deletion email:', emailError.message);
    }

    // Send notification to admin
    try {
      await sendmail.vendorNotificationMailer(
        "Admin Team",
        process.env.ADMIN_EMAIL || "admin@nightlife.com",
        process.env.APP_NAME || "Nightlife",
        `Vendor Account Deleted - ${vendorInfo.name}`,
        `A vendor account has been deleted from the system.<br><br>
        <strong>Deleted Vendor Details:</strong><br>
        • Name: ${vendorInfo.name}<br>
        • Email: ${vendorInfo.email}<br>
        • Phone: ${vendorInfo.phone}<br>
        • Deleted By: Admin<br>
        • Deletion Date: ${new Date().toLocaleString()}<br>
        ${reason ? `<br><strong>Reason:</strong> ${reason}` : ''}<br><br>
        This vendor account has been soft deleted and can be restored if needed.`,
        "Check the deleted vendors list in admin panel for restoration options.",
        process.env.APP_LOGO
      );
      console.log('📧 Admin deletion notification sent');
    } catch (adminEmailError) {
      console.error('❌ Admin deletion notification failed:', adminEmailError.message);
    }

    return apiResponse.ok(res, {
      message: messages.VENDOR_DELETED,
      vendor: vendorInfo,
      deleted_at: vendor.deleted_at
    }, messages.VENDOR_DELETED);
  } catch (err) {
    console.error('❌ Error deleting vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* ACTIVATE VENDOR SPECIFICALLY */
const activateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('✅ ACTIVATE VENDOR CALLED:', id);
    console.log('📧 Reason provided:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!vendor) {
      console.log('❌ Vendor not found for activation:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    if (vendor.is_active) {
      console.log('ℹ️ Vendor already active:', id);
      return apiResponse.ok(res, vendor, "Vendor is already active");
    }

    // Store old status
    const oldStatus = vendor.is_active;
    vendor.is_active = true;
    vendor.activated_at = new Date();
    await vendor.save();

    console.log('✅ Vendor activated:', {
      id: vendor._id,
      email: vendor.email,
      activated_at: vendor.activated_at,
      new_status: vendor.is_active
    });

    // ✅ Send activation email
    try {
      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        "activated",  // Correct: "activated"
        reason || "Your account has been reviewed and approved by our administration team.",
        process.env.APP_LOGO
      );

      console.log('📧 Activation email result:', emailResult);

      if (emailResult.success) {
        console.log('✅ Activation email sent to vendor:', vendor.email);
        console.log('✅ Email subject:', emailResult.subject);
      } else {
        console.error('❌ Activation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Activation email failed with error:', emailResult?.error || emailError.message);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: true,
        activated_at: vendor.activated_at
      },
      messages.VENDOR_ACTIVATED
    );
  } catch (err) {
    console.error('❌ Error activating vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* DEACTIVATE VENDOR SPECIFICALLY */
const deactivateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('⛔ DEACTIVATE VENDOR CALLED:', id);
    console.log('📧 Reason provided:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!vendor) {
      console.log('❌ Vendor not found for deactivation:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    if (!vendor.is_active) {
      console.log('ℹ️ Vendor already inactive:', id);
      return apiResponse.ok(res, vendor, "Vendor is already inactive");
    }

    // Store old status
    const oldStatus = vendor.is_active;
    vendor.is_active = false;
    vendor.deactivated_at = new Date();
    await vendor.save();

    console.log('✅ Vendor deactivated:', {
      id: vendor._id,
      email: vendor.email,
      deactivated_at: vendor.deactivated_at,
      new_status: vendor.is_active
    });

    // ✅ Send deactivation email
    try {
      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        "deactivated",  // Correct: "deactivated"
        reason || "Please contact support for more information about this action.",
        process.env.APP_LOGO
      );

      console.log('📧 Deactivation email result:', emailResult);

      if (emailResult.success) {
        console.log('✅ Deactivation email sent to vendor:', vendor.email);
        console.log('✅ Email subject:', emailResult.subject);
      } else {
        console.error('❌ Deactivation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Deactivation email failed with error:', emailResult?.error || emailError.message);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: false,
        deactivated_at: vendor.deactivated_at
      },
      messages.VENDOR_DEACTIVATED
    );
  } catch (err) {
    console.error('❌ Error deactivating vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR SERVICES (EVENT / VENUE) */
const getVendorServices = async (req, res) => {
  try {
    const { vendor_id, type } = req.query;

    if (!vendor_id || !type) {
      return apiResponse.badRequest(res, "vendor_id and type are required");
    }

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, "type must be event or venue");
    }

    let data = [];

    if (type === "event") {
      data = await Event.find({
        vendor_id,
        is_deleted: false,
      })
        .populate("category_ids", "category_name")
        .sort({ createdAt: -1 });
    }

    if (type === "venue") {
      data = await Venue.find({
        vendor_id,
        is_deleted: false,
      })
        .populate("category_ids", "category_name")
        .sort({ createdAt: -1 });
    }

    return apiResponse.ok(res, data, "Vendor services fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR BOOKINGS */
const getVendorBookings = async (req, res) => {
  try {
    const { vendor_id, type } = req.query;

    if (!vendor_id || !type) {
      return apiResponse.badRequest(res, "vendor_id and type are required");
    }

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, "type must be event or venue");
    }

    const bookings = await Booking.find({
      vendor_id,
      booking_type: type,
      is_deleted: false,
    })
      .populate("user_id", "name email")
      .populate("event_id")
      .populate("venue_id")
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, bookings, "Vendor bookings fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR EARNINGS */
const getVendorEarnings = async (req, res) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return apiResponse.badRequest(res, "vendor_id is required");
    }

    const bookings = await Booking.find({
      vendor_id,
      payment_status: "success",
      booking_status: { $ne: "cancelled" },
      is_deleted: false,
    });

    let totalEarnings = 0;

    bookings.forEach((b) => {
      totalEarnings += b.total;
    });

    return apiResponse.ok(
      res,
      {
        total_bookings: bookings.length,
        total_earnings: totalEarnings,
      },
      "Vendor earnings fetched"
    );
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR WITHDRAWALS */
const getVendorWithdrawals = async (req, res) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return apiResponse.badRequest(res, "vendor_id is required");
    }

    const withdrawals = await WithdrawRequest.find({
      vendor_id,
    }).sort({ createdAt: -1 });

    return apiResponse.ok(res, withdrawals, "Vendor withdrawals fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* 1. GET BANK DETAILS */
const getBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: false,
    }).select('bank_details');

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    return apiResponse.ok(
      res,
      vendor.bank_details || {
        account_holder_name: null,
        bank_name: null,
        account_number: null,
        ifsc_code: null,
        account_type: 'savings',
        is_verified: false,
        verified_at: null
      },
      "Bank details fetched successfully"
    );

  } catch (err) {
    console.error('Error fetching bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 2. ADD BANK DETAILS */
const addBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      account_type
    } = req.body;

    // Validation
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code || !account_type) {
      return apiResponse.badRequest(res, "All fields are required");
    }

    if (!['savings', 'current'].includes(account_type)) {
      return apiResponse.badRequest(res, "Account type must be savings or current");
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: false,
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details already exist
    if (vendor.bank_details && vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "Bank details already exist. Use edit to update.");
    }

    // Add bank details
    vendor.bank_details = {
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.toUpperCase().trim(),
      account_type: account_type,
      is_verified: false,
      verified_at: null
    };

    await vendor.save();

    return apiResponse.created(
      res,
      vendor.bank_details,
      "Bank details added successfully"
    );

  } catch (err) {
    console.error('Error adding bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 3. EDIT/UPDATE BANK DETAILS */
const editBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      account_type
    } = req.body;

    // Validation
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code || !account_type) {
      return apiResponse.badRequest(res, "All fields are required");
    }

    if (!['savings', 'current'].includes(account_type)) {
      return apiResponse.badRequest(res, "Account type must be savings or current");
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: false,
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details exist
    if (!vendor.bank_details || !vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "No bank details found. Please add first.");
    }

    // Update bank details (reset verification on edit)
    vendor.bank_details = {
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.toUpperCase().trim(),
      account_type: account_type,
      is_verified: false, // Reset verification on edit
      verified_at: null
    };

    await vendor.save();

    return apiResponse.ok(
      res,
      vendor.bank_details,
      "Bank details updated successfully"
    );

  } catch (err) {
    console.error('Error updating bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 4. DELETE BANK DETAILS */
const deleteBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: false,
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details exist
    if (!vendor.bank_details || !vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "No bank details found to delete");
    }

    // Reset bank details to default
    vendor.bank_details = {
      account_holder_name: null,
      bank_name: null,
      account_number: null,
      ifsc_code: null,
      account_type: 'savings',
      is_verified: false,
      verified_at: null
    };

    await vendor.save();

    return apiResponse.ok(
      res,
      null,
      "Bank details deleted successfully"
    );

  } catch (err) {
    console.error('Error deleting bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

export default {
  getAllVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
  activateVendor,
  deactivateVendor,
  getVendorServices,
  getVendorBookings,
  getVendorEarnings,
  getVendorWithdrawals,
  getBankDetails,
  addBankDetails,
  editBankDetails,
  deleteBankDetails
};
CLAUDE_EOF
echo "  wrote src/controller/admin/vendorController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/vendorAuthController.js" << 'CLAUDE_EOF'
import { Vendor } from "../../model/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendmail from "../../utility/sendmail.js";
import apiResponse from "../../utility/apiResponse.js";


const vendorAuthController = {
  vendorLogin: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const vendor = await Vendor.findOne({
        email: email.toLowerCase(),
        is_deleted: false
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Only real password check
      const isMatch = await bcrypt.compare(password, vendor.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // New organiser signups need Super Admin approval before they can
      // access their dashboard — see the "Organiser Requests" review queue.
      if (!vendor.is_verified) {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval. You'll be notified once it's reviewed.",
          pending_approval: true,
        });
      }

      const token = jwt.sign(
        { vendorId: vendor._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      vendor.last_login = new Date();
      await vendor.save();

      const vendorResponse = {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone_number: vendor.phone_number,
        city: vendor.city,
        state: vendor.state,
        address: vendor.address,
        landmark: vendor.landmark,
        business_image: vendor.business_image,
        is_active: vendor.is_active,
        is_verified: vendor.is_verified,
      };

      res.json({
        success: true,
        message: "Login successful",
        token,
        vendor: vendorResponse,
      });

    } catch (error) {
      console.error("Vendor Login Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  getVendorDetails: async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.vendor._id)
        .select("-password")
        .populate('city', 'city_name')
        .populate('state', 'state_name');

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      res.json({
        success: true,
        message: "Vendor details fetched",
        vendor,
      });
    } catch (error) {
      console.error("Get Vendor Details Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  updateVendorProfile: async (req, res) => {
    try {
      const {
        name,
        email,
        phone_number,
        state,
        city,
        address,
        landmark
      } = req.body;

      const vendorId = req.vendor._id;

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Update only if field is provided (even if empty string)
      if (name !== undefined) vendor.name = name;
      if (email !== undefined) vendor.email = email;
      if (phone_number !== undefined) vendor.phone_number = phone_number;
      if (state !== undefined) vendor.state = state;
      if (city !== undefined) vendor.city = city;
      if (address !== undefined) vendor.address = address;
      if (landmark !== undefined) vendor.landmark = landmark;

      // ✅ Optional image update
      if (req.file) {
        vendor.business_image = req.file.filename;
      }

      await vendor.save();

      const updatedVendor = await Vendor.findById(vendorId)
        .select("-password")
        .populate("city", "city_name")
        .populate("state", "state_name");

      res.json({
        success: true,
        message: "Vendor profile updated successfully",
        vendor: updatedVendor,
      });

    } catch (error) {
      console.error("Update Vendor Profile Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  changeVendorPassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const vendorId = req.vendor._id;

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Only real password check
      const isMatch = await bcrypt.compare(oldPassword, vendor.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Old password is incorrect",
        });
      }

      // Prevent same password reuse
      const isSamePassword = await bcrypt.compare(newPassword, vendor.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be same as old password",
        });
      }
      
      vendor.password = newPassword;
      await vendor.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });

    } catch (error) {
      console.error("Change Password Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  vendorForgetPassword: async (req, res) => {
    try {
      const { email } = req.body;

      // 1. Vendor check
      const vendor = await Vendor.findOne({
        email: email.toLowerCase(),
        is_deleted: false
      });

      if (!vendor) {
        return apiResponse.badRequest(res, "Vendor not found");
      }

      // Optional: mark token unused (same as admin)
      vendor.reset_token_used = false;
      await vendor.save();

      // 2. Create JWT Token (15 min expiry)
      const token = jwt.sign(
        { vendorId: vendor._id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      // 3. Reset link (change if needed for production)
      const resetLink = `https://hii.life/app/vendor/reset-password/${token}`;
      // const resetLink = `http://localhost:3000/app/vendor/reset-password/${token}`;

      // 4. Prepare professional email body
      const mailBody = sendmail.mailBodyVendorForgetPassword({
        app_name: "Hii Vendor",
        app_logo: "https://hii.life/app/server/uploads/hii_dark_logo.png",
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        resetLink,
      });

      // 5. Send email
      await sendmail.ForgetPasswordMail(
        vendor.email,
        "Reset Your Password",
        mailBody
      );

      return apiResponse.ok(res, "Password reset link sent successfully.");

    } catch (error) {
      console.error("Vendor Forget Password Error:", error);
      return apiResponse.serverError(res, "Server error", error.message);
    }
  },

  vendorForgetNewPassword: async (req, res) => {
    try {
      const { newPassword, token } = req.body;

      // 1️⃣ Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return apiResponse.badRequest(res, "Token expired or invalid");
      }

      // 2️⃣ Find Vendor
      const vendor = await Vendor.findById(decoded.vendorId);
      if (!vendor) {
        return apiResponse.badRequest(res, "Vendor not found");
      }

      // 3️⃣ Check if reset link already used
      if (vendor.reset_token_used) {
        return apiResponse.badRequest(
          res,
          "This reset link has already been used."
        );
      }

      // 4️⃣ Prevent same password reuse
      const isSamePassword = await bcrypt.compare(
        newPassword,
        vendor.password
      );

      if (isSamePassword) {
        return apiResponse.badRequest(
          res,
          "New password cannot be same as old password"
        );
      }

      vendor.password = newPassword;

      // 🔥 Mark reset link as used (one time only)
      vendor.reset_token_used = true;

      await vendor.save();

      return apiResponse.ok(res, null, "Password changed successfully");

    } catch (error) {
      console.error("Vendor Reset Password Error:", error);
      return apiResponse.serverError(res, "Server error", error.message);
    }
  },

  // ✅ Token verify API (frontend के लिए)
  verifyResetToken: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const vendorId = decoded.vendorId;
      const vendor = await Vendor.findById(vendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      res.json({
        success: true,
        message: "Token is valid",
        vendor: {
          id: vendor._id,
          email: vendor.email,
          name: vendor.name
        }
      });

    } catch (error) {
      console.error("Token Verify Error:", error);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

};

export default vendorAuthController;
CLAUDE_EOF
echo "  wrote src/controller/admin/vendorAuthController.js"

mkdir -p "src/controller/admin"
cat > "src/controller/admin/supportRequestController.js" << 'CLAUDE_EOF'
import { ReportProblem } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /support-requests/get_all
// Powers the "Requests" tab on the admin Support & Requests page. Was
// previously calling `${API_BASE}/requests` on the frontend, which had no
// backend route at all — so the tab always showed nothing, even though
// users had already been submitting "Report a Problem" tickets that were
// just sitting unreviewed in the ReportProblem collection.
const getAllRequests = async (req, res) => {
  try {
    const { search = "", status, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    let query = ReportProblem.find(filter)
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    const [allMatching, total] = await Promise.all([
      query.clone().skip(skip).limit(limitNum).lean(),
      ReportProblem.countDocuments(filter),
    ]);

    // Search on the populated user's name/email needs to happen after
    // population since Mongo can't filter on populated fields directly.
    const trimmedSearch = search.trim().toLowerCase();
    const requests = trimmedSearch
      ? allMatching.filter(
          (r) =>
            r.user_id?.name?.toLowerCase().includes(trimmedSearch) ||
            r.user_id?.email?.toLowerCase().includes(trimmedSearch) ||
            r.description?.toLowerCase().includes(trimmedSearch)
        )
      : allMatching;

    return apiResponse.ok(res, { requests, total, page: pageNum, limit: limitNum }, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /support-requests/update_status/:id  body: { status, admin_reply? }
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    const validStatuses = ["Pending", "Inprogress", "Resolve", "Closed"];
    if (!status || !validStatuses.includes(status)) {
      return apiResponse.badRequest(res, `status must be one of: ${validStatuses.join(", ")}`);
    }

    const update = { status };
    if (admin_reply !== undefined) update.admin_reply = admin_reply;

    const request = await ReportProblem.findByIdAndUpdate(id, update, { new: true }).populate("user_id", "name email");
    if (!request) return apiResponse.notFoundResponse(res, "Request not found");

    return apiResponse.ok(res, request, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllRequests, updateRequestStatus };
CLAUDE_EOF
echo "  wrote src/controller/admin/supportRequestController.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/userRoute.js" << 'CLAUDE_EOF'
import express from 'express';
import userController from '../../controller/admin/userController.js';
import { allowAdminOrVendor } from '../../middleware/authMiddleware.js';
import upload from "../../middleware/upload.js";
const route = express.Router();

route
    .get("/get_all_user", allowAdminOrVendor, userController.getAllUsers)
    .get("/get_user_by_id/:id", allowAdminOrVendor, userController.getUserById)
    .post("/change_Status/:id", allowAdminOrVendor, userController.updateUserStatus)
    .get("/get_delete_user", allowAdminOrVendor, userController.getDeletedUsers);
route.get('/get_user_details/:id', allowAdminOrVendor, userController.getUserDetails);
route.post('/image_uplod', allowAdminOrVendor, upload.array('image'), userController.imageUpload);
// Get only user bookings
route.get('/get_user_bookings/:id', allowAdminOrVendor, userController.getUserBookings);

route
    .get("/get_all_user_reports", allowAdminOrVendor, userController.getUserReports)
    .post("/update_report_status", allowAdminOrVendor, userController.updateUserReportStatus);

export default route;
CLAUDE_EOF
echo "  wrote src/routes/admin/userRoute.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/adsRoute.js" << 'CLAUDE_EOF'
import express from "express";
import adsController from "../../controller/admin/adsController.js";
import { adminauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js"

const route = express.Router();

route
    .get("/get_all", allowAdminOrVendor, adsController.getAds)
    .post("/create", allowAdminOrVendor, upload.fields([{ name: 'ad_image', maxCount: 1 }, { name: 'ad_video', maxCount: 1 }]), adsController.createAd)
    .post("/update/:id", allowAdminOrVendor, upload.fields([{ name: 'ad_image', maxCount: 1 }, { name: 'ad_video', maxCount: 1 }]), adsController.updateAd)
    .post("/delete/:id", allowAdminOrVendor, adsController.deleteAd)

export default route;
CLAUDE_EOF
echo "  wrote src/routes/admin/adsRoute.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/activityLogRoute.js" << 'CLAUDE_EOF'
import express from "express";
import activityLogController from "../../controller/admin/activityLogController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/get_all", allowAdminOrVendor, activityLogController.getAllLogs);

export default route;
CLAUDE_EOF
echo "  wrote src/routes/admin/activityLogRoute.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/vendorRoute.js" << 'CLAUDE_EOF'
import express from "express";
import vendorController from "../../controller/admin/vendorController.js";
import vendorAuthController from "../../controller/admin/vendorAuthController.js";
import { adminauth, vendorauth } from "../../middleware/authMiddleware.js";
import upload from "../../config/multer_config.js";

const route = express.Router();

route
  .get("/get_all_vendors", adminauth, vendorController.getAllVendors)

  .get("/get_vendor_by_id/:id", adminauth, vendorController.getVendorById)

  // Organiser Requests review queue
  .post("/approve_vendor/:id", adminauth, vendorController.approveVendor)
  .post("/reject_vendor/:id", adminauth, vendorController.rejectVendor)

  .post("/add_vendor", adminauth, upload.single("business_image"), vendorController.createVendor)

  .put("/update_vendor/:id", adminauth, upload.single("business_image"), vendorController.updateVendor)

  // Existing toggle endpoint with email
  .post("/change_Status/:id", adminauth, vendorController.updateVendorStatus)

  // New specific endpoints with email
  .put("/activate_vendor/:id", adminauth, vendorController.activateVendor)

  .put("/deactivate_vendor/:id", adminauth, vendorController.deactivateVendor)

  .delete("/delete_vendor/:id", adminauth, vendorController.deleteVendor)

  .get("/services", adminauth, vendorController.getVendorServices)
  .get("/bookings", adminauth, vendorController.getVendorBookings)
  .get("/earnings", adminauth, vendorController.getVendorEarnings)
  .get("/withdrawals", adminauth, vendorController.getVendorWithdrawals)
  .post("/forget-password", vendorAuthController.vendorForgetPassword)
  .get("/get_bank_details", vendorauth, vendorController.getBankDetails)
  .post("/add_bank_details", vendorauth, vendorController.addBankDetails)
  .put("/edit_bank_details", vendorauth, vendorController.editBankDetails)
  .delete("/delete_bank_details", vendorauth, vendorController.deleteBankDetails)

export default route;
CLAUDE_EOF
echo "  wrote src/routes/admin/vendorRoute.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/supportRequestRoute.js" << 'CLAUDE_EOF'
import express from "express";
import supportRequestController from "../../controller/admin/supportRequestController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/get_all", allowAdminOrVendor, supportRequestController.getAllRequests);
route.post("/update_status/:id", allowAdminOrVendor, supportRequestController.updateRequestStatus);

export default route;
CLAUDE_EOF
echo "  wrote src/routes/admin/supportRequestRoute.js"

mkdir -p "src/routes/admin"
cat > "src/routes/admin/index.js" << 'CLAUDE_EOF'
/** @format */
import express from "express";

import authRoutes from "./authRoute.js";
import blogRoutes from "./blogRoute.js";
import contentRoute from "./contentRoute.js";
import userRoutes from "./userRoute.js";
import FaqRoute from "./faqRoute.js";
import StateRoute from "./stateRoute.js";
import CityRoute from "./cityRoute.js";
import InterestRoute from "./interestRoute.js";
import contactRoute from "./contactRoute.js";
import serviceRoute from "./serviceRoute.js";
import tabularReportRoute from "./tabularReportRoute.js";
import analyticalReportRoute from "./analyticalsReportRoute.js";
import bookingRoute from "./BookingRoute.js";
import UserSubmitAnswerRoute from "./userSubmitAnserRoute.js";
import broadcastRouter from "./broadcastRoute.js";
import categoryRoute from "./categoryRoute.js";
import EventRoute from "./eventRoute.js";
import VenueRoute from "./venueRoute.js";
import TicketRoute from "./ticketRoute.js";
import AmenityRoute from "./amenityRoute.js";
import genreRoute from "./genreRoute.js";
import vendorRoute from "./vendorRoute.js";
import earningRoutes from "./earningRoutes.js";
import withdrawRoutes from "./withdrawRoutes.js";
import vendorAuthRoutes from "./vendorAuthRoute.js";
import commissionRoute from "./commissionRoute.js";
import offerRoute from "./offerRoute.js";
import couponRoute from "./couponRoute.js";
import vibeCheckRoute from "./vibeCheckRoute.js";
import adsRoute from "./adsRoute.js"
import notificationRoute from "./notificationRoute.js"
import activityLogRoute from "./activityLogRoute.js"
import supportRequestRoute from "./supportRequestRoute.js"


const router = express.Router();

const routeArray = [
  { path: "/auth", route: authRoutes },
  { path: "/blog", route: blogRoutes },
  { path: "/user", route: userRoutes },
  // Alias (plural) to support frontend paths using `/users`
  { path: "/users", route: userRoutes },
  { path: "/content", route: contentRoute },
  { path: "/faq", route: FaqRoute },
  { path: "/state", route: StateRoute },
  { path: "/city", route: CityRoute },
  // Alias (plural) to support frontend paths using `/cities`
  { path: "/cities", route: CityRoute },
  { path: "/interest", route: InterestRoute },
  { path: "/contact", route: contactRoute },
  { path: "/service", route: serviceRoute },
  { path: "/tabular_report", route: tabularReportRoute },
  { path: "/analytical_report", route: analyticalReportRoute },
  { path: "/vendor/booking", route: bookingRoute },
  // Alias (singular) to support frontend paths using `/booking`
  { path: "/booking", route: bookingRoute },
  { path: "/answer", route: UserSubmitAnswerRoute },
  { path: "/category", route: categoryRoute },
  { path: "/broadcast", route: broadcastRouter },
  { path: "/event", route: EventRoute },
  // Alias (plural) to support frontend paths using `/events`
  { path: "/events", route: EventRoute },
  { path: "/venue", route: VenueRoute },
  // Alias (plural) to support frontend paths using `/venues`
  { path: "/venues", route: VenueRoute },
  { path: "/ticket", route: TicketRoute },
  { path: "/amenity", route: AmenityRoute },
  { path: "/genre", route: genreRoute },
  { path: "/vendor", route: vendorRoute },
  { path: "/vendor", route: vendorAuthRoutes },
  { path: "/vibecheck", route: vibeCheckRoute },
  // ✅ Updated earning and withdraw routes
  { path: "/earning", route: earningRoutes },
  // Alias (plural) to support frontend paths using `/earnings`
  { path: "/earnings", route: earningRoutes },
  { path: "/withdraw", route: withdrawRoutes },
  { path: "/commission", route: commissionRoute },
  { path: "/offer", route: offerRoute },
  { path: "/coupon", route: couponRoute },
  { path: "/ads", route: adsRoute },
  { path: "/notification", route: notificationRoute },
  { path: "/activity-logs", route: activityLogRoute },
  // Alias (singular) to support frontend paths using `/activity-log`
  { path: "/activity-log", route: activityLogRoute },
  { path: "/support-requests", route: supportRequestRoute },
];

routeArray.forEach(({ path, route }) => router.use(path, route));

export default router;
CLAUDE_EOF
echo "  wrote src/routes/admin/index.js"

mkdir -p "src/utility"
cat > "src/utility/messages.js" << 'CLAUDE_EOF'
/** @format */

// utils/messages.js
export default {
  // 🔐 Auth
  ADMIN_NOT_FOUND: ["Admin not found for given email."],
  FORGET_PASSWORD_MAIL_SUCCESSFULLY: [
    "Forget password email sent successfully.",
  ],
  FORGET_MAILED_FAILED: ["Failed to send forget password email."],
  REQUIRED: ["Required"],
  NOT_FOUND: ["User not found"],
  WRONG_PASS: ["Entered email address or password is not correct, please try again."],
  ALREADY_EXIST: ["Already exists"],
  SERVER_ERROR: ["Server error"],
  INVALID_EMAIL: ["Invalid email format"],
  PASSWORD_MIN: ["Password minimum length not met"],
  PASSWORD_MISMATCH: ["Password does not match"],
  PROFILE_UPDATED: ["Profile updated successfully"],
  PASSWORD_CHANGED: ["Password changed successfully"],
  SUCCESS: ["Successfully completed"],
  VALIDATION_ERROR: ["Validation error"],
  TOKEN_INVALID: ["Invalid authentication token. Please log in again."],
  TOKEN_MISSING: ["Authentication token is missing. Access denied."],
  FORBIDDEN: ["You do not have permission to access this resource."],
  UNAUTHORIZED: ["Unauthorized access"],
  BAD_REQUEST: ["Bad request"],
  DATA_ADDED: ["Details added successfully"],
  MUSIC_GENRE_REQ: ["Select at least 1 and max 5 music genres"],
  PREFFERENCE_REQ: ["At least one event preference is required"],
  VIBE_REQ: ["At least one vibe is required"],
  SEXUALITY_INTEREST_REQ: ["Sexuality and interested in are required"],
  PRONOUNS_REQ: ["Pronouns are required"],
  GALARY_LENGTH: ["Maximum 8 images allowed"],
  VIBE_VALIDATE: ["Maximum 3 vibe checks allowed"],
  MSG_USERNAME_EXISTS: ["Username is required"],
  USERNAME_ALREDY_EXISTS: ["Username already exists"],
  SIGNUP_SUCCESS: ["User register successfully"],
  OTP_EXPIRED: ["Otp expired!"],
  NEW_PASSWORD_SAME_AS_OLD: ["New password can not be same as old / current password"],
  SWIPE_LEFT: ["Swiped left"],
  SWIPE_RIGHT: ["Swiped right"],
  ITS_MATCH: ["It's a match"],
  INTEREST_MUST_ARRAY: ["Interests must be an array"],
  TOGGLE_KEYS_REQ: ["Only age , height , pronouns ,location, hobbies, vibes, recent_events, recent_venues, instagram, spotify are allowed"],
  MEDIA_URL_REQ: ["Media url is required"],
  ONLY_BOOLEAN: ["Only true or false required"],
  MEDIA_NOT_FOUND: ["Media not found"],
  MEDIA_UPLOADED_SUCCESS: ["Gallery uploaded successfully"],
  HOBBIES_UPDATE_SUCCESS: ["Hobbies updated successfully"],
  VENUES_EVENTS_TYPE_REQ: ["Type must be event or venue"],
  SOCIAL_ACCOUNT_UPDATED: ["Social account updated successfully"],
  TICKET_SOLDOUT: ["Tickets have sold out for this event."],
  COUPON_EXPIRED: ["This coupon code has expired."],
  BOOKING_SUCCESS: ["Event joined successfully"],
  PROFILE_REQ: ["Please upload profile image"],
  AGE_RESTRICTION: ["You must be at least 18 years old to sign up"],
  INVALID_DOB: ["Please enter a valid date of birth"],
  VENUE_BOOKED_SUCCESS: ["Venue booking successfully"],
  INVALID_SLOTS: ["Invalid slot selected"],
  BLOCKED_SUCESS: ["User blocked successfully"],
  UNBLOCKED_SUCESS: ["User unblocked successfully"],
  VENUE_FOLLOWED_SUCCESS: ["Venue followed successfully"],
  VENUE_UNFOLLOWED_SUCCESS: ["Venue unfollowed successfully"],
  MSG_INVALID_OLD_PASSWORD: ["Old password is incorrect."],
  MSG_PASSWORD_SAME: ["New password cannot be the same as old password"],
  MSG_PASSWORD_UPDATED: ["Password updated successfully"],
  USER_ACTIVATE: ["User activated successfully"],
  USER_DEACTIVATE: ["User deactivated successfully"],
  CATEGORY_ALREADY: ["Category already exists"],
  STATE_ALREADY: ["State already exists"],
  CITY_ALREADY: ["City already exists"],
  INTEREST_ALREADY: ["Interest already exists"],
  BOOKINGID_REQ: ["Booking Id is required"],
  BOOKING_NOT_FOUND: ["Booking not found"],
  BOOKINGID_RATING_REQ: ["Booking ID and rating are required"],
  RATING_LENGTH: ["Rating must be between 1 and 5"],
  GENRE_CREATED_SUCCESSFULLY: ["Genre created successfully"],
  GENRE_UPDATED_SUCCESSFULLY: ["Genre updated successfully"],
  FAQ_ALREADY: ["Question is already exists"],
  COMMISSION_NOT_VALID: ["Commission percentage must be between 0 and 100"],
  COMMISSION_REQ: ["Please enter commission percentage"],
  FRIENDSHIP_REMOVED: ["Unfriend successfully"],
  USER_REPORTED_SUCCESS: ["User reported successfully"],


  // 📝 Blog
  BLOG_CREATED: ["Blog created successfully"],
  BLOG_UPDATED: ["Blog updated successfully"],
  BLOG_DELETED: ["Blog deleted successfully"],
  BLOG_NOT_FOUND: ["Blog not found"],

  // 👤 User
  USER_CREATED: ["User created successfully"],
  USER_UPDATED: ["User updated successfully"],
  USER_DELETED: ["User deleted successfully"],
  USER_NOT_FOUND: ["User not found"],
  USER_LIST_FETCHED: ["Users fetched successfully"],
  USER_ACTIVATED: ["User activated successfully"],
  USER_DEACTIVATED: ["User deactivated successfully"],
  DELETED_USERS_FETCHED: ["Deleted users fetched successfully"],

  BOOKING_CREATED: ["Booking created successfully"],
  BOOKING_FETCHED: ["Booking details fetched successfully"],
  BOOKING_UPDATED: ["Booking updated successfully"],
  BOOKING_CANCELED: ["Booking canceled successfully"],
  BOOKING_COMPLETED: ["Booking completed successfully"],
  BOOKING_NOT_FOUND: ["Booking not found"],
  BOOKING_DELETED: ["Booking deleted successfully"],
  BOOKING_STATS_FETCHED: ["Booking statistics fetched successfully"],
  EVENT_BOOKINGS_FETCHED: ["Event bookings fetched successfully"],
  VENUE_BOOKINGS_FETCHED: ["Venue bookings fetched successfully"],
  BOOKING_WITH_EARNING_CREATED: ["Booking created successfully with earning record"],

  // Booking Validation Messages
  BOOKING_REQUIRED_FIELDS: ["All required fields must be provided"],
  BOOKING_TYPE_REQUIRED: ["Booking type must be either 'event' or 'venue'"],
  BOOKING_EVENT_ID_REQUIRED: ["Event ID is required for event bookings"],
  BOOKING_VENUE_ID_REQUIRED: ["Venue ID is required for venue bookings"],
  BOOKING_EVENT_OR_VENUE_REQUIRED: ["Either event_id or venue_id must be provided, or specify booking_type"],
  BOOKING_CONTACT_INFO_REQUIRED: ["Complete contact information is required"],
  BOOKING_USER_NOT_FOUND: ["User not found"],
  BOOKING_EVENT_NOT_FOUND: ["Event not found or does not belong to vendor"],
  BOOKING_VENUE_NOT_FOUND: ["Venue not found or does not belong to vendor"],
  BOOKING_TICKET_NOT_FOUND: ["Ticket not found or does not belong to vendor"],

  // 📢 Broadcast
  BROADCAST_SENT_SUCCESSFULLY: ["Broadcast sent successfully"],

  // 🔔 Notifications
  NOTIFICATION_SENT: ["Notification sent successfully"],
  NOTIFICATION_FETCHED: ["Notifications fetched successfully"],
  NOTIFICATION_NOT_FOUND: ["Notification not found"],
  NOTIFICATION_DELETED: ["Notification deleted successfully"],
  ALL_NOTIFICATIONS_DELETED: ["All notifications deleted successfully"],
  NOTIFICATION_STATUS_UPDATED: ["Notification status updated successfully"],
  NO_NOTIFICATION_FOUND: ["No notification found"],

  // 💳 Card Details
  CARD_ADDED: ["Card added successfully"],
  CARD_UPDATED: ["Card updated successfully"],
  CARD_DELETED: ["Card deleted successfully"],
  CARD_NOT_FOUND: ["Card not found"],

  // 📝 User Submit Answer
  ANSWER_SUBMITTED: ["Answer submitted successfully"],
  ANSWER_UPDATED: ["Answer updated successfully"],
  ANSWER_FETCHED: ["Answer fetched successfully"],
  ANSWER_NOT_FOUND: ["Answer not found"],

  // 🎟️ Coupon
  COUPON_CREATED: ["Coupon created successfully"],
  COUPON_UPDATED: ["Coupon updated successfully"],
  COUPON_DELETED: ["Coupon deleted successfully"],
  COUPON_INVALID: ["Coupon is invalid"],
  COUPON_EXPIRED: ["Coupon has expired"],
  COUPON_NOT_FOUND: ["Coupon not found"],
  COUPON_ALREADY_EXISTS: ["Coupon already exists"],

  // ❓ FAQ
  FAQ_CREATED: ["FAQ created successfully"],
  FAQ_UPDATED: ["FAQ updated successfully"],
  FAQ_DELETED: ["FAQ deleted successfully"],
  FAQ_NOT_FOUND: ["FAQ not found"],
  FAQ_REQUIRED: ["Question and answer are required"],
  FAQ_ALREADY_EXISTS: ["FAQ already exists"],

  // 📄 Content
  CONTENT_CREATED: ["Content created successfully"],
  CONTENT_UPDATED: ["Content updated successfully"],
  CONTENT_DELETED: ["Content deleted successfully"],
  CONTENT_NOT_FOUND: ["Content not found"],
  CONTENT_TYPE_REQUIRED: ["Content type is required"],

  // 📞 Contact
  CONTACT_RECEIVED: ["Contact received successfully"],
  CONTACT_RESPONDED: ["Contact responded successfully"],
  CONTACT_REPLIED: ["Contact replied successfully"],
  CONTACT_LIST_FETCHED: ["Contact list fetched successfully"],
  CONTACT_NOT_FOUND: ["Contact not found"],

  // 🌐 State
  STATE_CREATED: ["State added successfully"],
  STATE_UPDATED: ["State updated successfully"],
  STATE_DELETED: ["State deleted successfully"],
  STATE_NOT_FOUND: ["State not found"],
  STATE_ALREADY_EXISTS: ["State already exists"],

  // 🏙️ City
  CITY_CREATED: ["City added successfully"],
  CITY_UPDATED: ["City updated successfully"],
  CITY_DELETED: ["City deleted successfully"],
  CITY_NOT_FOUND: ["City not found"],
  CITY_ALREADY_EXISTS: ["City already exists"],

  // ❤️ Interest
  INTEREST_CREATED: ["Interest added successfully"],
  INTEREST_UPDATED: ["Interest updated successfully"],
  INTEREST_DELETED: ["Interest deleted successfully"],
  INTEREST_NOT_FOUND: ["Interest not found"],
  INTEREST_ALREADY_EXISTS: ["Interest already exists"],

  // 📑 Category
  CATEGORY_CREATED: ["Category added successfully"],
  CATEGORY_UPDATED: ["Category updated successfully"],
  CATEGORY_DELETED: ["Category deleted successfully"],
  CATEGORY_NOT_FOUND: ["Category not found"],
  CATEGORY_ALREADY_EXISTS: ["Category already exists"],
  CATEGORY_REQUIRED: ["Category is required"],

  // 🎵 Genre
  GENRE_CREATED: ["Genre created successfully"],
  GENRE_UPDATED: ["Genre updated successfully"],
  GENRE_DELETED: ["Genre deleted successfully"],
  GENRE_NOT_FOUND: ["Genre not found"],
  GENRE_ALREADY_EXISTS: ["Genre already exists"],

  // 🌟 Vibe
  VIBE_CREATED: ["Vibe added successfully"],
  VIBE_UPDATED: ["Vibe updated successfully"],
  VIBE_DELETED: ["Vibe deleted successfully"],
  VIBE_NOT_FOUND: ["Vibe not found"],
  VIBE_ALREADY_EXISTS: ["Vibe already exists"],
  VIBECHECK_ALREADY: ["Vibe Check already exists"],
  VIBECHECK_CREATED: ["Vibe check created successfully"],

  // 🎫 Ticket
  TICKET_CREATED: ["Ticket created successfully"],
  TICKET_UPDATED: ["Ticket updated successfully"],
  TICKET_DELETED: ["Ticket deleted successfully"],
  TICKET_NOT_FOUND: ["Ticket not found"],
  INVALID_EVENT_ID: ["Invalid event ID"],
  NO_TICKETS_FOUND: ["No tickets found for this event"],

  // 🎉 Event
  EVENT_CREATED: ["Event created successfully"],
  EVENT_UPDATED: ["Event updated successfully"],
  EVENT_DELETED: ["Event deleted successfully"],
  EVENT_NOT_FOUND: ["Event not found"],
  EVENT_FIELDS_REQUIRED: ["All event fields are required"],

  // 🎯 Amenity
  AMENITY_CREATED: ["Amenity created successfully"],
  AMENITY_UPDATED: ["Amenity updated successfully"],
  AMENITY_DELETED: ["Amenity deleted successfully"],
  AMENITY_NOT_FOUND: ["Amenity not found"],

  // 💼 Vendor
  VENDOR_CREATED: ["Vendor created successfully"],
  VENDOR_UPDATED: ["Vendor updated successfully"],
  VENDOR_DELETED: ["Vendor deleted successfully"],
  VENDOR_RESTORED: ["Vendor restored successfully"],
  VENDOR_ACTIVATED: ["Vendor activated successfully"],
  VENDOR_DEACTIVATED: ["Vendor deactivated successfully"],
  VENDOR_LIST_FETCHED: ["Vendors fetched successfully"],
  VENDOR_NOT_FOUND: ["Vendor not found"],
  VENDOR_ALREADY_EXISTS: ["Vendor already exists"],
  VENDOR_APPROVED: ["Organiser approved successfully"],
  VENDOR_REJECTED: ["Organiser request rejected"],
  BUSINESS_NAME_REQUIRED: ["Business name is required"],
  OWNER_NAME_REQUIRED: ["Owner name is required"],
  EMAIL_REQUIRED: ["Email is required"],
  PHONE_NUMBER_REQUIRED: ["Phone number is required"],
  PASSWORD_REQUIRED: ["Password is required"],
  BUSINESS_NAME_TOO_SHORT: ["Business name is too short"],
  BUSINESS_NAME_TOO_LONG: ["Business name is too long"],
  OWNER_NAME_TOO_SHORT: ["Owner name is too short"],
  OWNER_NAME_TOO_LONG: ["Owner name is too long"],
  INVALID_PHONE_NUMBER: ["Invalid phone number"],
  INVALID_CATEGORY_ID: ["Invalid category"],
  INVALID_VENDOR_ID: ["Invalid vendor ID"],
  PASSWORD_TOO_SHORT: ["Password is too short"],

  // 💰 Earnings
  EARNING_ADDED: ["Earning added successfully"],
  EARNING_LIST_FETCHED: ["Earnings fetched successfully"],
  TODAY_EARNING_FETCHED: ["Today's earnings fetched successfully"],

  // 💸 Withdrawals
  WITHDRAWAL_REQUESTED: ["Withdrawal request submitted"],
  WITHDRAWAL_LIST_FETCHED: ["Withdrawal requests fetched successfully"],
  WITHDRAWAL_APPROVED: ["Withdrawal approved successfully"],
  WITHDRAWAL_REJECTED: ["Withdrawal rejected successfully"],

  // 🔧 Service
  SERVICE_CREATED: ["Service created successfully"],
  SERVICE_UPDATED: ["Service updated successfully"],
  SERVICE_DELETED: ["Service deleted successfully"],
  SERVICE_NOT_FOUND: ["Service not found"],

  // 🔄 Common
  ALL_FIELDS_REQUIRED: ["All fields are required"],
  DATA_FOUND: ["Data found successfully"],
  NO_DATA_FOUND: ["No data found"],
  OPERATION_SUCCESSFUL: ["Operation completed successfully"],

  // 📱 OTP & Account
  MSG_EMPTY_PARAM: ["Please provide required data"],
  MSG_EMAIL_PHONE_EXISTS: ["Email already in use"],
  MSG_PHONE_EXISTS: ["Mobile number already in use"],
  MSG_OTP_SENT: ["OTP sent successfully"],
  ACCOUNT_DEACTIVATED: ["Your account has been deactivated by admin"],
  ACCOUNT_DELETED: ["Your account has been deleted successfully"],
  WRONG_OTP: ["Wrong or invalid OTP"],
  OTP_VERIFIED: ["OTP verified successfully"],
  NEW_PASSWORD_CREATED: ["Password reset successfully"],
  INVALID_PASSWORD: ["Invalid password"],
  LOGIN_SUCCESSFUL: ["Login successful"],
  NOT_REGISTERED: ["You are not registered"],
  OLD_PASSWORD_INCORRECT: ["Current password is incorrect"],
  SAME_PASSWORD: ["New password cannot be same as current password"],
  TWO_FA_ENABLED: ["Two-factor authentication enabled successfully"],
  SEARCH_TEXT_REQUIRED: ["Search text is required"],
  INVALID_CREDENTIALS: ["Invalid credentials provided"],
  ACCOUNT_DEACTIVATE_BY_ADMIN: ["Your account has been deactivated by admin"],
  MOBILE_NUMBER_CHECK: ["Mobile number is already register with us"],

  // Vendor messages
  VENDOR_NOT_FOUND: "Vendor not found",
  VENDOR_LOGIN_SUCCESS: "Vendor login successful",
  VENDOR_PROFILE_UPDATED: "Vendor profile updated successfully",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated",
  EMAIL_ALREADY_EXISTS: "Email already exists",

  // In your messages.js file
  EMAIL_ALREADY_EXISTS: "Email already exists",
  EMAIL_REQUIRED: "Email is required",
  INVALID_EMAIL: "Please enter a valid email address",

  COMMISSION_SET_SUCCESS: ["Commission settings updated successfully"],
  COMMISSION_BULK_SET_SUCCESS: ["Bulk commissions set successfully"],
  COMMISSION_FETCHED: ["Commissions fetched successfully"],
  COMMISSION_STATS_FETCHED: ["Commission statistics fetched successfully"],
  COMMISSION_DELETED: ["Commission setting deleted successfully"],
  COMMISSION_NOT_FOUND: ["Commission setting not found"],
  COMMISSION_INVALID_PERCENT: ["Commission percentage must be between 0 and 100"],
  COMMISSION_EVENT_IDS_REQUIRED: ["Event IDs are required for event commission or set apply_to_all=true"],
  COMMISSION_VENUE_IDS_REQUIRED: ["Venue IDs are required for venue commission or set apply_to_all=true"],
  COMMISSION_GLOBAL_INVALID_FIELDS: ["Global commission should not have event_ids, venue_ids, or apply_to_all"],
  COMMISSION_EVENT_ID_REQUIRED: ["Event ID is required for event commission"],
  COMMISSION_VENUE_ID_REQUIRED: ["Venue ID is required for venue commission"],
  COMMISSION_ARRAY_REQUIRED: ["Commissions array is required"],
  COMMISSION_UPDATED: ["Commission updated successfully"],

  // App Msgs
  PROFILE_SWIPER_SUCCESS: ["Profile visibility updated successfully"],
  REPORT_REASON_SENT: ["Report sent successfully"],

  // Ads
  ADS_REQ:["Ad image is required"],
  EXPIRYDATE_REQ:["Expire date is required"],
  ADS_CREATED:["Ad created successfully"],
  ADS_NOT_FOUND:["Ad not found"],
  INVALID_AD_LINK: ["Link must be a valid URL starting with http:// or https://"],
  ADS_FOUND:["Ad found successfully"],
  ADS_UPDATED:["Ad updated successfully"],
  ADS_DELETED:["Ad updated successfully"],

  // Admin user management
  USER_STATUS_UPDATED: ["User status updated successfully"],
  INVALID_USER_STATUS: ["Invalid status value. Must be ACTIVE, INACTIVE or BANNED"],
  IMAGE_UPLOAD_SUCCESS: ["Image(s) uploaded successfully"],
  NO_FILES_UPLOADED: ["No files were uploaded"],
  BOOKINGS_FETCHED: ["Bookings fetched successfully"],
  USER_REPORTS_FETCHED: ["User reports fetched successfully"],
  REPORT_NOT_FOUND: ["Report not found"],
  REPORT_STATUS_UPDATED: ["Report status updated successfully"],
  ACTIVITY_LOGS_FETCHED: ["Activity logs fetched successfully"],
};
CLAUDE_EOF
echo "  wrote src/utility/messages.js"

mkdir -p "src/utility"
cat > "src/utility/activityLogger.js" << 'CLAUDE_EOF'
import { ActivityLog } from "../model/index.js";

/**
 * Records an entry in the Activity Logs page. Call this from admin
 * controllers after a write action succeeds — never let a logging failure
 * break the actual request, so this always swallows its own errors.
 *
 * @param {import('express').Request} req - the authenticated request
 *   (req.user is set by adminauth/allowAdminOrVendor for admins,
 *   req.vendor is set for vendors)
 * @param {{action: 'CREATE'|'UPDATE'|'DELETE'|'LOGIN'|'LOGOUT', resource: string, resource_id?: string, details?: string}} entry
 */
const logActivity = async (req, { action, resource, resource_id = null, details = "" }) => {
  try {
    const isVendor = Boolean(req.vendor) && !req.user;
    const actor = isVendor ? req.vendor : req.user;

    await ActivityLog.create({
      admin_id: actor?._id || null,
      actor_type: isVendor ? "Vendor" : "Admin",
      admin_name: actor?.name || (isVendor ? "Vendor" : "Admin"),
      action,
      resource,
      resource_id,
      details,
      ip_address: req.ip || req.headers["x-forwarded-for"] || null,
    });
  } catch (err) {
    // Logging must never break the primary action it's attached to.
    console.error("Failed to record activity log:", err.message);
  }
};

export default logActivity;
CLAUDE_EOF
echo "  wrote src/utility/activityLogger.js"

echo "Done."
