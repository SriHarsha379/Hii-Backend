import express from "express";
import bookingController from "../../controller/app/bookingController.js";
import { appAuth } from '../../middleware/authMiddleware.js';
const route = express.Router();

route
    .get('/get_event_tickets/:eventId', appAuth, bookingController.getEventTickets)
    .get('/get_coupon_percentage', appAuth, bookingController.getCouponPercentage)
    .post('/event_booking', appAuth, bookingController.createEventBooking)
    .get('/get_venue_slots', appAuth, bookingController.getVenueSlots)
    .post('/venue_booking', appAuth, bookingController.createVenueBooking)

export default route;