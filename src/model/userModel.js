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