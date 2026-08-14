import express from "express";
import manageController from "../../controller/app/manageController.js"
import { contactUsSchema, passwordSchema, serviceIdSchema } from "../../validation/app/appValidation.js";
import { validate } from "../../middleware/validate.js";
import { appAuth } from '../../middleware/authMiddleware.js';
const route = express.Router();

route
    .get('/filter_events_venues', appAuth, manageController.filterEventsVenues)
    .get('/get_trending_keywords', appAuth, manageController.getTrendingSearches)
    .get("/calender_filter", appAuth, manageController.calenderFilter)
    .get("/my_members", appAuth, manageController.getMyMembers)
    .get("/my_venues", appAuth, manageController.getMyVenues)
    .get("/my_events", appAuth, manageController.getMyEvents)
    .post("/block_unblock", appAuth, manageController.blockUnblockUser)
    .get("/get_blocked_users", appAuth, manageController.getMyBlockedUsers)
    .get('/get_content', manageController.getContent)
    .get('/content_by_id/:content_id/:content_type', manageController.getContentById)
    .get('/profile_complete_status', appAuth,manageController.getProfileCompletionStatus)
    .get('/get_event_venue_list', appAuth,manageController.getEventVenueList)
    .get('/get_all_members', appAuth,manageController.getAllMembers)
    .get('/deeplink',manageController.deepLink)
    .get('/downloadApp',manageController.downloadApp)
export default route