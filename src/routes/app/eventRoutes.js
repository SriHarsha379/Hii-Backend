import express from "express";
import { validate } from "../../middleware/validate.js";
import { appAuth } from '../../middleware/authMiddleware.js';
import eventController from "../../controller/app/eventController.js";
const route = express.Router();

route
    .get("/event_detail/:eventId", appAuth, eventController.getEventDetail)
    .post("/like_dislike", appAuth, eventController.toggleEventLike)
    .get("/booking_summary/:booking_id", appAuth, eventController.eventBookingSummary)

export default route;