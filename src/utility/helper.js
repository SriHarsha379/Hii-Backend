// remove old image 
import path from "path";
import fs from "fs";
import { User, Friendship } from "../model/index.js";
import bcrypt from "bcryptjs";
import moment from "moment-timezone"
import sendNotification from "./notification.js";

// remove old image
const removeOldImage = async (filepath) => {
  const oldPath = path.join(
    process.cwd(),
    "uploads",
    path.basename(filepath) // extract filename
  );

  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath); // delete old file
  }

}

function generateOtp(length = 4) {
  let digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
function generateRandomEmail() {
  const randomString = Math.random().toString(36).substring(2, 10); // random 8 chars
  return `user_${randomString}@grown.com`;
}
const getPagination = (page, limits) => {
  const limit = limits ? limits : 10;
  let pages = page ? page : 0;
  let offset = pages * limit;

  return {
    limits: parseInt(limit),
    offset: parseInt(offset),
    pages: parseInt(pages),
  };
}
const getPagingData = (count, data, page, limit) => {
  const totalItems = count
  const item = data
  const currentPage = page ? +page : 0;
  const totalPages = Math.ceil(count / limit); // when we use group by
  return { totalItems, item, totalPages, currentPage };
};


//  add this   helper  file
const dataHelper = (date) => {
  return moment.tz(date, "Asia/Kolkata").format("MMM DD YYYY, hh:mm A")
};
const formatEventBookedTime = (date) => {
  const start = moment(date);

  // Example: add 6 hours for end time (change if needed)
  const end = moment(date).add(6, "hours");

  return `${start.format("ddd, h A")} - ${end.format("h A")}`;
};

// hash password using bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};


async function getUserData(userId) {
  try {
    const user = await User.findOne({
      _id: userId,
      is_deleted: false
    })
      .populate("city_id")
      .populate("preferred_cities.city_id")
      .populate("music_genre")
      .populate("event_preferences")
      .populate("vibes")
      .populate({
        path: "vibe_checks.question_id",
        model: "VibeCheckQuestion",
        select: "question"
      })
      .lean();

    if (!user) return null;

    /* ================= COUNTS ================= */
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

    /* ================= CLEAN SENSITIVE FIELDS ================= */
    delete user.password;
    delete user.__v;

    /* ================= ATTACH COMPUTED FIELDS ================= */
    user.total_likes = total_likes;
    user.total_friends = total_friends;

    /* ================= FORMAT VIBE_CHECKS ================= */
    if (user.vibe_checks && Array.isArray(user.vibe_checks)) {
      user.vibe_checks = user.vibe_checks.map(vc => ({
        question_id: vc.question_id?._id || null,
        question: vc.question_id?.question || null,
        answer: vc.answer || null
      }));
    }

    /* ================= FORMAT DOB ================= */
    if (user.birthdate) {
      const dob = new Date(user.birthdate);
      const day = String(dob.getDate()).padStart(2, "0");
      const month = String(dob.getMonth() + 1).padStart(2, "0");
      const year = dob.getFullYear();

      user.birthdate = `${day}/${month}/${year}`;
    }

    return user;

  } catch (error) {
    throw error;
  }
}


async function DeviceTokenStore_1_Signal(user_id, device_type, player_id) {
  try {
    // Check if a notification entry already exists for the user
    let notification = await User.findOne({ _id: user_id });

    if (notification) {
      // Update existing record
      notification.device_type = device_type;
      notification.player_id = player_id;
      // notification.updatedAt = new Date();
      await notification.save();
      return "Updated successfully.";
    }
  } catch (error) {
    throw error;
  }
}



function formatTime(createtime) {
  const time = moment(createtime);
  const now = moment();

  const diffDays = now.diff(time, "days");

  if (diffDays === 0) {
    return time.fromNow(); // e.g. "3 hours ago"
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return time.fromNow(); // e.g. "3 days ago"
  } else {
    return time.format("MMM DD,YYYY"); // e.g. "Aug 20, 2025"
  }
}


function formatCreateTime(createdAt) {
  if (moment(createdAt).isSame(moment(), "day")) {
    return `Today, ${moment(createdAt).format("h:mm A")}`;
  } else if (moment(createdAt).isSame(moment().subtract(1, "days"), "day")) {
    return `Yesterday`;
  } else {
    return moment(createdAt).format("MMM DD,YYYY");
  }
}


// Get Distance In KM
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return null;

  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1)); // 1 decimal
};

// Format Event Time
const formatEventTime = (start, end) => {
  if (!start || !end) return "";

  const parseTimeValue = (value, includeDay = false) => {
    const parsedTimeOnly = moment(
      value,
      ["HH:mm", "H:mm", "HH:mm A", "H:mm A", "hh:mm A", "h:mm A"],
      true
    );
    if (parsedTimeOnly.isValid()) {
      return parsedTimeOnly.format("h:mm A");
    }

    const parsedDateTime = moment(
      value,
      [
        moment.ISO_8601,
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DD HH:mm:ss",
        "DD-MM-YYYY HH:mm",
        "DD-MM-YYYY HH:mm:ss"
      ],
      true
    );
    if (parsedDateTime.isValid()) {
      return includeDay
        ? parsedDateTime.format("ddd, h A")
        : parsedDateTime.format("h A");
    }

    return "";
  };

  const startValue = parseTimeValue(start, true);
  const endValue = parseTimeValue(end, false);

  if (!startValue || !endValue) return "";

  return `${startValue} - ${endValue}`;
};
const formatVenueTime = (startTime, endTime) => {
  if (!startTime || !endTime) return "";

  const parseTimeValue = (value) => {
    const parsedTimeOnly = moment(
      value,
      ["HH:mm", "H:mm", "HH:mm A", "H:mm A", "hh:mm A", "h:mm A"],
      true
    );
    if (parsedTimeOnly.isValid()) {
      return parsedTimeOnly.format("h:mm A");
    }

    const parsedDateTime = moment(
      value,
      [
        moment.ISO_8601,
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DD HH:mm:ss",
        "DD-MM-YYYY HH:mm",
        "DD-MM-YYYY HH:mm:ss"
      ],
      true
    );
    if (parsedDateTime.isValid()) {
      return parsedDateTime.format("h:mm A");
    }

    return "";
  };

  const startValue = parseTimeValue(startTime);
  const endValue = parseTimeValue(endTime);

  if (!startValue || !endValue) return "";

  return `${startValue} - ${endValue}`;
};

// Format Ordinal Date
const formatOrdinalDate = (date) => {
  if (!date) return "";

  const day = moment(date).date();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
      day % 10 === 2 && day !== 12 ? "nd" :
        day % 10 === 3 && day !== 13 ? "rd" : "th";

  return `${day}${suffix}, ${moment(date).format("dddd")}`;
};

// Date like "15th, Friday"
const formatEventDate = date => {
  return formatOrdinalDate(date); // or moment-based
};

// Validates a date-of-birth value represents someone at least 18 years old.
// Returns { valid: boolean, reason?: 'invalid_date' | 'underage' }
// Accepts common formats (ISO, DD/MM/YYYY, etc.) via moment's flexible parsing.
const validateMinimumAge = (dobValue, minimumAge = 18) => {
  if (!dobValue) return { valid: false, reason: "invalid_date" };

  const dob = moment(dobValue);
  if (!dob.isValid()) return { valid: false, reason: "invalid_date" };

  // Reject future dates outright — can't be someone's birthdate.
  if (dob.isAfter(moment())) return { valid: false, reason: "invalid_date" };

  const age = moment().diff(dob, "years");
  if (age < minimumAge) return { valid: false, reason: "underage" };

  return { valid: true };
};

// Event preview date/time — shows the actual calendar date (not just
// weekday), a date range for multi-day events, and the start time.
// e.g. "Fri, 25 Jul · 8:00 PM" or "Fri, 25 Jul - Sun, 27 Jul · 8:00 PM"
const formatEventPreviewDate = (startDate, endDate, startTime, isMultiDay) => {
  if (!startDate || !startTime) return "";

  const start = moment(startDate);
  if (!start.isValid()) return "";

  let datePart = start.format("ddd, D MMM");

  if (isMultiDay && endDate) {
    const end = moment(endDate);
    if (end.isValid() && !end.isSame(start, "day")) {
      datePart = `${datePart} - ${end.format("ddd, D MMM")}`;
    }
  }

  const timeMoment = moment(startTime, [
    "HH:mm", "H:mm", "HH:mm A", "H:mm A", "hh:mm A", "h:mm A"
  ], true);
  const timePart = timeMoment.isValid() ? timeMoment.format("h:mm A") : "";

  return timePart ? `${datePart} · ${timePart}` : datePart;
};

// Remaining time for ticket banner
const getRemainingTime = startTime => {
  const diff = moment(startTime).diff(moment(), "seconds");
  return diff > 0 ? diff : 0;
};

const dataHelperchat = (date) => {
  const ist = moment(date).tz("Asia/Kolkata");

  return {
    date: ist.format("MMM DD YYYY, hh:mm A"),
    time: ist.format("hh:mm A"),
  };
};

/* =====================================================================
   PROFILE COMPLETION — shared calculation + notification trigger
   =====================================================================
   calculateProfileCompletion() is pure (no DB writes, no side effects) —
   it's the single source of truth used both by the
   common/profile_complete_status API and by checkAndNotifyProfileCompletion.

   checkAndNotifyProfileCompletion() is the side-effecting version — call
   it (without awaiting) from any endpoint that changes a field which
   affects the percentage (gallery, bio, hobbies, instagram, signup step 3).
   ===================================================================== */

const calculateProfileCompletion = (user) => {
  if (!user?.is_profile_completed) {
    return {
      percentage: 0,
      messages: ["Complete your basic profile first."]
    };
  }

  let percentage = 75;
  const messagesList = [];

  const galleryCount = user.user_gallery?.length || 0;
  const hasBio = user.bio && user.bio.trim() !== "";
  const hasInstagram = user.instagram_account && user.instagram_account.trim() !== "";
  const hasHobbies = user.hobbies && user.hobbies.length > 0;
  const hasVibeCheck = user.vibe_checks && user.vibe_checks.length > 0;

  /* ================= GALLERY ================= */
  if (galleryCount >= 9) {
    percentage += 5;
  } else {
    messagesList.push(`Add ${9 - galleryCount} more Images/Videos`);
  }

  /* ================= INSTAGRAM ================= */
  if (hasInstagram) {
    percentage += 5;
  } else {
    messagesList.push("Connect Instagram");
  }

  /* ================= HOBBIES ================= */
  if (hasHobbies) {
    percentage += 5;
  } else {
    messagesList.push("Add Hobby");
  }

  /* ================= VIBE CHECK ================= */
  if (hasVibeCheck) {
    percentage += 5;
  } else {
    messagesList.push("Answer Vibe Check Questions");
  }

  /* ================= BIO ================= */
  if (hasBio) {
    percentage += 5;
  } else {
    messagesList.push("Complete Bio");
  }

  return { percentage, messages: messagesList };
};

/**
 * Recomputes a user's profile completion percentage and fires a
 * "profile_completion" notification ONLY when the percentage has
 * genuinely increased since the last time we notified them — avoids
 * spamming on every small edit, and never notifies on a decrease
 * (e.g. deleting a gallery item back below 9).
 *
 * Pass { silent: true } to just record the current percentage as a
 * baseline without sending a notification — used right after signup
 * completion, since the existing "welcome" notification already
 * covers that milestone.
 *
 * Always call this WITHOUT awaiting from request handlers
 * (e.g. `helper.checkAndNotifyProfileCompletion(userId).catch(() => {});`)
 * so it can never slow down or break the actual API response.
 */
const checkAndNotifyProfileCompletion = async (userId, { silent = false } = {}) => {
  try {
    const user = await User.findOne({ _id: userId, is_deleted: false })
      .select("is_profile_completed user_gallery bio instagram_account hobbies vibe_checks player_id last_notified_profile_completion")
      .lean();

    if (!user) return;

    const { percentage, messages: missing } = calculateProfileCompletion(user);
    const lastNotified = user.last_notified_profile_completion;
    const hasImproved = lastNotified == null || percentage > lastNotified;

    if (!silent && hasImproved && user.player_id) {
      await sendNotification(
        "profile_completion",
        user.player_id,
        {
          senderId: userId,
          other_user_id: userId,
          action: "profile_completion",
          percentage,
          missing_count: missing.length,
          next_step: missing[0] || null
        },
        0
      );
    }

    if (lastNotified == null || percentage !== lastNotified) {
      await User.updateOne(
        { _id: userId },
        { $set: { last_notified_profile_completion: percentage } }
      );
    }
  } catch (error) {
    console.error("checkAndNotifyProfileCompletion error:", error.message);
  }
};

export default {
  formatEventBookedTime,
  dataHelperchat,
  removeOldImage,
  generateOtp,
  generateRandomEmail,
  getPagination,
  getPagingData,
  getUserData,
  DeviceTokenStore_1_Signal,
  hashPassword,
  comparePassword,
  formatTime,
  formatCreateTime,
  getDistanceInKm,
  formatEventTime,
  formatVenueTime,
  formatOrdinalDate,
  formatEventDate,
  formatEventPreviewDate,
  validateMinimumAge,
  getRemainingTime,
  dataHelper,
  calculateProfileCompletion,
  checkAndNotifyProfileCompletion
};