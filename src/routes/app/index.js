import express from "express";
import authRoutes from './authRoutes.js'
import userRoutes from "./userRoute.js";
import feedRoutes from "./feedRoutes.js"
import eventRoutes from "./eventRoutes.js"
import venueRoutes from "./venueRoutes.js"
import allRoutes from './allRoutes.js'
import bookingRoutes from './bookingRoute.js'
import notification from './notificationRoute.js'
import vendorAuthRoutes from './vendorAuthRoute.js'
import ratingRoutes from './ratingRoute.js'
import chatRoutes from './chatRoutes.js'
import adsRoutes from './adsRoutes.js'
import pollRoutes from './pollRoutes.js'
import contestRoutes from './contestRoutes.js'

const router = express.Router();
const routeArray = [
  // app routes
  { path: "/auth", route: authRoutes },
  { path: "/user", route: userRoutes },
  { path: "/feed", route: feedRoutes },
  { path: "/event", route: eventRoutes },
  { path: "/venue", route: venueRoutes },
  { path: "/common", route: allRoutes },
  { path: "/booking", route: bookingRoutes },
  { path: "/notification", route: notification },
  { path: "/vendor/auth", route: vendorAuthRoutes },
  { path: "/rating", route: ratingRoutes },
  { path: "/chat", route: chatRoutes },
  { path: "/ads", route: adsRoutes },
  // Poll/Contest route files existed with working controllers behind
  // them, but were never actually mounted here — GET /poll/active and
  // GET /contest/active both 404'd regardless of what admin created.
  { path: "/poll", route: pollRoutes },
  { path: "/contest", route: contestRoutes }
];

routeArray?.forEach((routeItem) => {
  router.use(routeItem.path, routeItem.route);
});

export default router;