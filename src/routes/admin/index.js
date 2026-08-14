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
];

routeArray.forEach(({ path, route }) => router.use(path, route));

export default router;