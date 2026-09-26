import dotenv from "dotenv";
dotenv.config();

// The server's "local time" = India time, so every "start of today" and
// date calculation matches what members see. (Servers usually run on UTC,
// 5.5 hours behind - wrong between midnight and 5:30 AM, peak nightlife
// hours.) Must stay the FIRST import in app.js. Change via APP_TIMEZONE.
process.env.TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
