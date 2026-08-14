import express from "express";
import { validate } from "../../middleware/validate.js";
import { appAuth } from '../../middleware/authMiddleware.js';
import venueController from "../../controller/app/venueController.js"
const route = express.Router();

route
    .get("/venue_detail/:venueId", appAuth, venueController.getVenueDetail)
    .post("/like_dislike", appAuth, venueController.toggleVenueLike)
    .post("/follow_unfollow", appAuth, venueController.toggleVenueFollow)
    .get("/booking_summary/:booking_id", appAuth, venueController.venueBookingSummary)

export default route;