import express from "express";
import { validate } from "../../middleware/validate.js";
import { appAuth } from '../../middleware/authMiddleware.js';
import feedController from "../../controller/app/feedController.js";
const route = express.Router();

route
    .get("/home_data", appAuth, feedController.getHomeData)
    .get("/member_detail/:memberId", appAuth, feedController.getMemberDetail)
    .post("/swipe_user", appAuth, feedController.swipeUser)
    .get("/event_venue_by_type", appAuth, feedController.getEventVenueByType)
    .post("/unfriend_user", appAuth, feedController.unfriendUser)
    .post("/get_user_relation_status", appAuth, feedController.getUserRelationStatus)
    .post("/report_user", appAuth, feedController.reportUser)



export default route;