import express from 'express';
import { vendorauth } from "../../middleware/authMiddleware.js";
import bookingController from '../../controller/admin/bookingController.js';

const router = express.Router();

// Booking Routes
// router.post('/create_booking', vendorauth, bookingController.createBooking);
router.get('/get_all_booking', vendorauth, bookingController.getAllBooking);
router.get('/get_booking_by_id/:id', vendorauth, bookingController.getBookingById);
router.get('/get_event_bookings/:id', vendorauth, bookingController.getEventBookings);
router.get('/get_venue_bookings/:id', vendorauth, bookingController.getVenueBookings);
router.put('/update_booking_status/:id', vendorauth, bookingController.updateBookingStatus);
router.delete('/delete_booking/:id', vendorauth, bookingController.deleteBooking);
router.get('/get_booking_stats', vendorauth, bookingController.getBookingStats);

export default router;