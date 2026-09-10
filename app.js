import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import "./src/config/db_config.js";
import configureSocket from "./src/config/socket_config.js";
import adminRoute from "./src/routes/admin/index.js";
import appRoute from "./src/routes/app/index.js";
import { startProfileCompletionReminderJob } from "./src/cron/profileCompletionReminderJob.js";
import { startInactiveMemberReminderJob } from "./src/cron/inactiveMemberReminderJob.js";

dotenv.config();

const app = express();

// ✅ __dirname replacement (for ES Module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================== HTTP SERVER ================== */
const server = http.createServer(app);

// ✅ CORS Configuration
app.use(
  cors({
    origin: true, // ✅ allows http://localhost:3000 automatically
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// ✅ Middleware
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Static Uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// serve public folder
app.use(express.static(path.join(__dirname, "public")));

// ✅ API Routes
app.use("/app/server/api/v1/admin", adminRoute);
app.use("/app/server/api/v1/app", appRoute);

// optional route alias
app.get("/app/server/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/app/server/chat1", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat1.html"));
});


app.get("/app/server", (req, res) => {
  res.send("🚀 Night Life API is running...");
});

/* ================== SOCKET.IO ================== */
const io = new Server(server, {
  path: "/app/server/socket.io",
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5000","https://hii.life"], // your front-end ports
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});


// socket logic
configureSocket(io);

// ✅ Server Start
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`✅ Socket.IO server is running on ws://localhost:${PORT}/app/server/socket.io`);

  // Proactive profile-completion reminder — reaches users even if they
  // never open the app again, unlike the two existing reminder paths
  // (edit-triggered push, and the Flutter local notification on
  // open/resume). See src/cron/profileCompletionReminderJob.js.
  startProfileCompletionReminderJob();
  console.log(`✅ Profile completion reminder cron scheduled (daily, 18:00 server time)`);

  // Client's ask: "app notifications when a member is not active on the
  // app." See src/cron/inactiveMemberReminderJob.js.
  startInactiveMemberReminderJob();
  console.log(`✅ Inactive member reminder cron scheduled (daily, 19:00 server time)`);
});