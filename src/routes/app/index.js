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
  { path: "/ads", route: adsRoutes }
];

routeArray?.forEach((routeItem) => {
  router.use(routeItem.path, routeItem.route);
});

export default router;