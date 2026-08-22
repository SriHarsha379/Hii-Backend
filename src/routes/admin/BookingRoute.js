import express from 'express';
import { vendorauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import bookingController from '../../controller/admin/bookingController.js';

const router = express.Router();

// Booking Routes
// FIXED: was `vendorauth` only, which rejects any admin-role token outright
// (including CLUB_ADMIN, who authenticates through the Admin model, not as
// a vendor) — same gap already fixed for Events and Venues.
// router.post('/create_booking', vendorauth, bookingController.createBooking);
router.get('/get_all_booking', allowAdminOrVendor, bookingController.getAllBooking);
router.get('/get_booking_by_id/:id', allowAdminOrVendor, bookingController.getBookingById);
router.get('/get_event_bookings/:id', allowAdminOrVendor, bookingController.getEventBookings);
router.get('/get_venue_bookings/:id', allowAdminOrVendor, bookingController.getVenueBookings);
router.put('/update_booking_status/:id', allowAdminOrVendor, bookingController.updateBookingStatus);
router.delete('/delete_booking/:id', allowAdminOrVendor, bookingController.deleteBooking);
router.get('/get_booking_stats', allowAdminOrVendor, bookingController.getBookingStats);

export default router;