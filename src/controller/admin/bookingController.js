/** @format */
import { Booking, Event, Ticket, User, Venue, Earning } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
// import { getCommissionPercent } from "../../utility/commissionUtility.js";
import ticketController from "./ticketController.js";

// Helper to determine vendor filter (vendor user vs admin).
// FIXED: previously "isAdmin" meant "see every booking platform-wide" —
// correct for SUPER_ADMIN/NORMAL_ADMIN, but wrong for CLUB_ADMIN, who
// authenticates as an admin-type token too (allowAdminOrVendor sets
// req.user, not req.vendor, for any admin role) yet should only ever see
// bookings for their own venue. Now respects an explicit ?vendor_id= query
// param when the caller is an admin, so the Club Admin dashboard can scope
// itself instead of accidentally seeing every vendor's bookings.
const resolveVendorFilter = (req) => {
    if (req.vendor?._id) return { vendorId: req.vendor._id, isAdmin: false };
    const isAdmin = !!req.user;
    const vendorId = isAdmin && req.query.vendor_id ? req.query.vendor_id : null;
    return { vendorId, isAdmin };
};


// ✅ Get all bookings (vendor sees own; admin sees all)
const getAllBooking = async (req, res) => {
    try {
        const { vendorId } = resolveVendorFilter(req);
        const { type } = req.query; // 'event' या 'venue'

        const query = { is_deleted: false };
        if (vendorId) query.vendor_id = vendorId;

        // Type filter जोड़ें
        if (type && ['event', 'venue'].includes(type)) {
            query.booking_type = type;
        }

        const bookings = await Booking.find(query)
            .populate("user_id", "first_name last_name email phone_number profile_image country_code")
            .populate({
                path: "event_id",
                select: "title venue_name start_time end_time artist_name artist_title artist_subtitle artist_image",
                model: "Event"
            })
            .populate("venue_id", "venue_name address")
            .populate("ticket_id", "title ticket_type ticket_price")
            .sort({ createdAt: -1 });

        if (!bookings || bookings.length === 0)
            return apiResponse.ok(res, [], messages.BOOKING_FETCHED[0]);

        const result = bookings?.map(booking => {
            const event = booking.event_id;
            const venue = booking.venue_id;
            const ticket = booking.ticket_id;
            const user = booking.user_id;

            return {
                _id: booking._id,
                discount: booking.discount || 0,
                sub_total: booking.sub_total || 0,
                total: booking.total || 0,
                total_amount: booking.total || 0,
                amount: booking.total || 0,
                transaction_id: booking.transaction_id || '',
                booking_type: booking.booking_type || '',
                is_active: booking.is_active,
                // FIXED: schema field is `booking_status`, not `status` —
                // this always fell back to 'confirmed' regardless of the
                // real value (cancelled/completed bookings would have
                // shown as confirmed too).
                status: booking.booking_status || 'confirmed',
                payment_status: booking.payment_status || 'paid',
                num_tickets: booking.num_tickets || 1,
                booking_reference: booking.booking_reference || '',
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt,

                user: {
                    phone_number: booking.contact_info?.phone_number
                        ? booking.contact_info.phone_number
                        : user?.phone_number || '',
                    email: booking.contact_info?.email
                        ? booking.contact_info.email
                        : user?.email || '',
                    first_name: booking.contact_info?.first_name
                        ? booking.contact_info.first_name
                        : user?.first_name || '',
                    last_name: booking.contact_info?.last_name
                        ? booking.contact_info.last_name
                        : user?.last_name || '',
                    country_code: booking.contact_info?.country_code
                        ? booking.contact_info.country_code
                        : user?.country_code || '',
                    profile_image: user?.profile_image || null
                },

                event_id: event
                    ? {
                        _id: event._id,
                        title: event.title || '',
                        venue_name: event.venue_name || event.title || '',
                        artist_name: event.artist_name || '',
                        artist_title: event.artist_title || '',
                        artist_subtitle: event.artist_subtitle || '',
                        artist_image: event.artist_image || '',
                        start_time: event.start_time,
                        end_time: event.end_time
                    }
                    : null,

                venue_id: venue
                    ? {
                        _id: venue._id,
                        venue_name: venue.venue_name || '',
                        address: venue.address || ''
                    }
                    : null,

                ticket_id: ticket
                    ? {
                        _id: ticket._id,
                        title: ticket.title || '',
                        ticket_type: ticket.ticket_type || '',
                        ticket_price: ticket.ticket_price || 0
                    }
                    : null
            };
        });

        return apiResponse.ok(res, result, messages.BOOKING_FETCHED[0]);
    } catch (error) {
        console.error(error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const { vendorId } = resolveVendorFilter(req);
        const { id } = req.params;

        const query = { _id: id, is_deleted: false };
        if (vendorId) query.vendor_id = vendorId;

        const booking = await Booking.findOne(query)
            .populate("user_id", "first_name last_name email phone_number profile_image country_code")
            .populate({
                path: "event_id",
                select: "title venue_name start_time end_time artist_name artist_title artist_subtitle artist_image address date about gallery_images venue_image",
                model: "Event"
            })
            .populate("ticket_id", "title ticket_type ticket_price total_tickets sold_tickets available_tickets")
            .populate("venue_id", "venue_name address latitude longitude");

        if (!booking)
            return apiResponse.notFoundResponse(res, messages.BOOKING_NOT_FOUND[0]);

        const event = booking.event_id;
        const ticket = booking.ticket_id;
        const user = booking.user_id;
        const venue = booking.venue_id;

        const result = {
            _id: booking._id,
            discount: booking.discount || 0,
            sub_total: booking.sub_total || 0,
            total: booking.total || 0,
            total_amount: booking.total || 0,
            transaction_id: booking.transaction_id || '',
            booking_type: booking.booking_type || '',
            is_active: booking.is_active,
            status: booking.status || 'confirmed',
            payment_status: booking.payment_status || 'paid',
            payment_method: booking.payment_method || '',
            num_tickets: booking.num_tickets || 1,
            booking_date: booking.booking_date || booking.createdAt,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            booking_reference: booking.booking_reference || '',

            // Contact Information
            contact_info: booking.contact_info || {
                first_name: '',
                last_name: '',
                email: '',
                phone_number: '',
                country_code: ''
            },

            // User Information
            user: {
                phone_number: booking.contact_info?.phone_number
                    ? booking.contact_info.phone_number
                    : user?.phone_number || '',
                email: booking.contact_info?.email
                    ? booking.contact_info.email
                    : user?.email || '',
                first_name: booking.contact_info?.first_name
                    ? booking.contact_info.first_name
                    : user?.first_name || '',
                last_name: booking.contact_info?.last_name
                    ? booking.contact_info.last_name
                    : user?.last_name || '',
                country_code: booking.contact_info?.country_code
                    ? booking.contact_info.country_code
                    : user?.country_code || '',
                profile_image: user?.profile_image || null
            },

            // Event Information
            event_id: event
                ? {
                    _id: event._id,
                    title: event.title || '',
                    venue_name: event.venue_name || event.title || '',
                    start_time: event.start_time,
                    end_time: event.end_time,
                    date: event.date,
                    address: event.address || '',
                    about: event.about || '',
                    artist_name: event.artist_name || '',
                    artist_title: event.artist_title || '',
                    artist_subtitle: event.artist_subtitle || '',
                    artist_image: event.artist_image || '',
                    venue_image: event.venue_image || '',
                    gallery_images: event.gallery_images || []
                }
                : null,

            // Venue Information
            venue_id: venue
                ? {
                    _id: venue._id,
                    venue_name: venue.venue_name || '',
                    address: venue.address || '',
                    latitude: venue.latitude || '',
                    longitude: venue.longitude || ''
                }
                : null,

            // Ticket Information
            ticket_id: ticket
                ? {
                    _id: ticket._id,
                    title: ticket.title || '',
                    ticket_type: ticket.ticket_type || '',
                    ticket_price: ticket.ticket_price || 0,
                    total_tickets: ticket.total_tickets || 0,
                    sold_tickets: ticket.sold_tickets || 0,
                    available_tickets: ticket.available_tickets || 0,
                    quantity: booking.num_tickets || 1,
                    total_price: (ticket.ticket_price || 0) * (booking.num_tickets || 1)
                }
                : null,

            // Additional Booking Details
            attendees: booking.attendees || [],
            special_requests: booking.special_requests || '',
            cancellation_policy: booking.cancellation_policy || '',
            refund_status: booking.refund_status || 'not_eligible',
            qr_code: booking.qr_code || '',
        };

        return apiResponse.ok(res, result, messages.BOOKING_FETCHED[0]);
    } catch (error) {
        console.error(error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Get bookings by event ID
const getEventBookings = async (req, res) => {
    try {
        const { vendorId } = resolveVendorFilter(req);
        const { id } = req.params;

        // First get the event
        const eventQuery = { _id: id };
        if (vendorId) eventQuery.vendor_id = vendorId;

        const event = await Event.findOne(eventQuery);

        if (!event) {
            return apiResponse.notFoundResponse(res, messages.BOOKING_EVENT_NOT_FOUND[0]);
        }

        // Find bookings for this event
        const bookingQuery = { event_id: id, is_deleted: false };
        if (vendorId) bookingQuery.vendor_id = vendorId;

        const bookings = await Booking.find(bookingQuery)
            .populate("user_id", "first_name last_name email phone_number profile_image")
            .populate("ticket_id", "title ticket_type ticket_price")
            .sort({ createdAt: -1 });

        const result = bookings.map(booking => ({
            _id: booking._id,
            user: booking.user_id,
            ticket: booking.ticket_id,
            total: booking.total,
            num_tickets: booking.num_tickets || 1,
            transaction_id: booking.transaction_id,
            status: booking.status || 'confirmed',
            payment_status: booking.payment_status || 'paid',
            booking_reference: booking.booking_reference,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        }));

        return apiResponse.ok(res, result, messages.EVENT_BOOKINGS_FETCHED[0]);
    } catch (error) {
        console.error("Get Event Bookings Error:", error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Update booking status (for cancellations, refunds, etc.)
const updateBookingStatus = async (req, res) => {
    try {
        // FIXED: was hardcoded to `req.vendor._id`, which crashes for any
        // admin-role caller (req.vendor is only set for vendor tokens) —
        // same gap already fixed on Events/Venues, now relevant here too
        // since the route was just opened up to allowAdminOrVendor.
        const { vendorId } = resolveVendorFilter(req);
        const { id } = req.params;
        const { status, notes } = req.body;

        const bookingFilter = { _id: id, is_deleted: false };
        if (vendorId) bookingFilter.vendor_id = vendorId;

        const booking = await Booking.findOne(bookingFilter).populate('ticket_id');

        if (!booking) {
            return apiResponse.notFoundResponse(res, messages.BOOKING_NOT_FOUND[0]);
        }

        // FIXED: schema field is `booking_status`, not `status` — writing to
        // `booking.status` was silently doing nothing (Mongoose drops
        // unknown fields on save by default), so this endpoint never
        // actually changed a booking's real status despite returning success.
        const oldStatus = booking.booking_status;
        const session = await Booking.startSession();
        session.startTransaction();

        try {
            // Update booking
            booking.booking_status = status || booking.booking_status;
            booking.updatedAt = new Date();

            if (notes) {
                booking.special_request = notes;
            }

            await booking.save({ session });

            // If booking is cancelled and was previously confirmed, release tickets
            if (status === 'cancelled' && oldStatus === 'confirmed') {
                if (booking.ticket_id) {
                    await ticketController.updateTicketSoldCount(
                        booking.ticket_id._id, 
                        booking.num_tickets || 1, 
                        'subtract'
                    );
                }
            }

            // If booking is confirmed and was previously cancelled, re-allocate tickets
            if (status === 'confirmed' && oldStatus === 'cancelled') {
                if (booking.ticket_id) {
                    await ticketController.updateTicketSoldCount(
                        booking.ticket_id._id, 
                        booking.num_tickets || 1, 
                        'add'
                    );
                }
            }

            await session.commitTransaction();
            session.endSession();

            return apiResponse.ok(res, booking, "Booking status updated successfully");
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Update booking status error:", error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Delete booking (soft delete with ticket release)
const deleteBooking = async (req, res) => {
    try {
        const vendor_id = req.vendor._id;
        const { id } = req.params;

        const booking = await Booking.findOne({
            _id: id,
            vendor_id
        }).populate('ticket_id');

        if (!booking) {
            return apiResponse.notFoundResponse(res, messages.BOOKING_NOT_FOUND[0]);
        }

        const session = await Booking.startSession();
        session.startTransaction();

        try {
            // Release tickets if booking was active
            if (booking.status === 'confirmed' && booking.ticket_id) {
                await ticketController.updateTicketSoldCount(
                    booking.ticket_id._id, 
                    booking.num_tickets || 1, 
                    'subtract'
                );
            }

            // Soft delete booking
            booking.is_deleted = true;
            booking.is_active = false;
            booking.updatedAt = new Date();

            await booking.save({ session });
            await session.commitTransaction();
            session.endSession();

            return apiResponse.ok(res, null, messages.BOOKING_DELETED[0]);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error(error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Get booking statistics
const getBookingStats = async (req, res) => {
    try {
        const { vendorId } = resolveVendorFilter(req);

        const baseMatch = { is_deleted: false };
        if (vendorId) baseMatch.vendor_id = vendorId;

        const totalBookings = await Booking.countDocuments(baseMatch);
        
        const totalRevenueResult = await Booking.aggregate([
            { 
                $match: { 
                    ...baseMatch,
                    status: 'confirmed'
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    total: { $sum: "$total" },
                    totalTickets: { $sum: "$num_tickets" }
                } 
            }
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayBookings = await Booking.countDocuments({
            ...baseMatch,
            createdAt: { $gte: today }
        });

        // Get status counts
        const confirmedBookings = await Booking.countDocuments({
            ...baseMatch,
            status: 'confirmed'
        });

        const pendingBookings = await Booking.countDocuments({
            ...baseMatch,
            status: 'pending'
        });

        const cancelledBookings = await Booking.countDocuments({
            ...baseMatch,
            status: 'cancelled'
        });

        const stats = {
            total_bookings: totalBookings,
            total_revenue: totalRevenueResult[0]?.total || 0,
            total_tickets_sold: totalRevenueResult[0]?.totalTickets || 0,
            today_bookings: todayBookings,
            confirmed_bookings: confirmedBookings,
            pending_bookings: pendingBookings,
            cancelled_bookings: cancelledBookings,
            confirmed_percentage: totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0
        };

        return apiResponse.ok(res, stats, messages.BOOKING_STATS_FETCHED[0]);
    } catch (error) {
        console.error(error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

// ✅ Get bookings by Venue ID
const getVenueBookings = async (req, res) => {
    try {
        const { vendorId } = resolveVendorFilter(req);
        const { id } = req.params;

        const venueQuery = { _id: id, is_deleted: false };
        if (vendorId) venueQuery.vendor_id = vendorId;

        const venue = await Venue.findOne(venueQuery);
        if (!venue) {
            return apiResponse.notFoundResponse(res, messages.BOOKING_VENUE_NOT_FOUND[0]);
        }

        const eventQuery = { venue_name: venue.venue_name, is_deleted: false };
        if (vendorId) eventQuery.vendor_id = vendorId;
        const events = await Event.find(eventQuery);
        
        if (!events || events.length === 0) {
            return apiResponse.ok(res, [], messages.VENUE_BOOKINGS_FETCHED[0]);
        }

        const eventIds = events.map(e => e._id);

        const bookingQuery = { event_id: { $in: eventIds }, is_deleted: false };
        if (vendorId) bookingQuery.vendor_id = vendorId;

        const bookings = await Booking.find(bookingQuery)
            .populate("user_id", "first_name last_name email phone_number profile_image")
            .populate("ticket_id", "title ticket_type ticket_price")
            .populate("event_id", "venue_name start_time end_time")
            .sort({ createdAt: -1 });

        const result = bookings.map(booking => ({
            _id: booking._id,
            user: booking.user_id,
            ticket: booking.ticket_id,
            event: booking.event_id,
            total: booking.total,
            num_tickets: booking.num_tickets || 1,
            transaction_id: booking.transaction_id,
            status: booking.status || 'confirmed',
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        }));

        return apiResponse.ok(res, result, messages.VENUE_BOOKINGS_FETCHED[0]);
    } catch (error) {
        console.error("Get Venue Bookings Error:", error);
        return apiResponse.serverError(res, messages.SERVER_ERROR[0], error.message);
    }
};

export default { 
    // createBooking,
    getAllBooking, 
    getBookingById, 
    getEventBookings,
    getVenueBookings,
    updateBookingStatus,
    deleteBooking,
    getBookingStats,
};