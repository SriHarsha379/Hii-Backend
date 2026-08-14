import { Event, EventLike, User, Ticket, Booking, City } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js"


// Event Detail
const getEventDetail = async (req, res) => {
    try {
        const userId = req.userId;
        const { eventId } = req.params;

        /* ===== CURRENT USER LOCATION ===== */
        const currentUser = await User.findById(userId)
            .select("city_id latitude longitude")
            .lean();

        if (!currentUser) {
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
        }

        let city = null;

        // Only hit city collection when we need a fallback for missing user coordinates
        if ((currentUser.latitude == null || currentUser.longitude == null) && currentUser.city_id) {
            city = await City.findOne({
                _id: currentUser.city_id,
                is_active: true,
                is_deleted: false
            })
                .select("latitude longitude")
                .lean();

            if (!city) {
                return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
            }
        }

        /* ===== EVENT ===== */
        const event = await Event.findOne({
            _id: eventId,
            is_deleted: false,
            is_active: true
        })
            .populate("category_ids", "_id category_name")
            .lean();

        if (!event) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
        }

        const originLatitude = currentUser.latitude ?? city?.latitude;
        const originLongitude = currentUser.longitude ?? city?.longitude;

        const distance_km = helper.getDistanceInKm(
            originLatitude,
            originLongitude,
            Number(event.latitude),
            Number(event.longitude)
        );

        /* ===== EVENT TICKETS ===== */
        const tickets = await Ticket.find({
            event_id: eventId,
            is_active: true,
            is_deleted: false
        })
            .select("title ticket_price available_tickets ticket_type")
            .lean();

        /* ===== MINIMUM TICKET PRICE ===== */
        let minTicketPrice = null;

        if (tickets.length > 0) {
            minTicketPrice = Math.min(...tickets.map(t => t.ticket_price));
        }


        /* ===== LIKES (MINIMAL ADDITION) ===== */
        const [totalLikes, userLike] = await Promise.all([
            EventLike.countDocuments({
                event_id: eventId,
                is_liked: true,
                is_active: true
            }),
            EventLike.findOne({
                event_id: eventId,
                user_id: userId,
                is_liked: true,
                is_active: true
            }).select("_id")
        ]);

        /* ===== FORMATTED EVENT TIME (12H) ===== */
        const formattedTimeSlot = helper.formatVenueTime(event.start_time, event.end_time);

        const formatSingleTime = (time) => {
            const parsed = helper.formatVenueTime(time, time);
            return parsed ? parsed.split(" - ")[0] : "";
        };

        const formattedStartTime = formatSingleTime(event.start_time);
        const formattedEndTime = formatSingleTime(event.end_time);

        /* ===== RESPONSE ===== */
        const response = {
            _id: event._id,

            event_name: event.venue_name,
            event_image: event.venue_image,
            vendor_id: event.vendor_id,
            /* ===== CATEGORIES ===== */
            categories: event.category_ids?.map(c => ({
                _id: c._id,
                name: c.category_name
            })),


            event_date: event.start_date,
            event_time: (() => {
                const startDate = new Date(event.start_date);
                const day = startDate.toLocaleDateString("en-US", { weekday: "short" });

                return formattedTimeSlot
                    ? `${day}, ${formattedTimeSlot}`
                    : "";
            })(),
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            end_date: event.end_date,
            venue_name: event.venue_name,
            address: event.address,
            distance_km,
            latitude: event.latitude,
            longitude: event.longitude,
            user_location: {
                latitude: originLatitude,
                longitude: originLongitude
            },

            /* ===== GALLERY ===== */
            gallery: event.gallery_images || [],

            event_layout_images:event.event_layout_images || "",

            /* ===== ABOUT ===== */
            about: event.about,
            terms_and_conditions: event.terms_and_conditions || "",
            faqs: (event.faqs || []).map(f => ({
                question: f.question,
                answer: f.answer
            })),
            prohibited_items: (event.prohibited_items || []).map(p => p.item).filter(Boolean),

            /* ===== LINEUP ===== */
            lineup: (event.artists || []).map(a => ({
                name: a.name,
                title: a.title,
                subtitle: a.subtitle,
                image: a.image
            })),

            /* ===== TICKETS ===== */
            tickets: {
                min_price: minTicketPrice,
                currency: "INR",
                start_date: event.date,
                end_date: event.end_date || event.date, // fallback
                list: tickets
            },

            /* ===== LIKES ===== */
            total_likes: totalLikes,
            is_liked: !!userLike
        };


        return apiResponse.ok(res, response, messages.DATA_FOUND);

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

// Like / Dislike Event (Action Based)
const toggleEventLike = async (req, res) => {
    try {
        const userId = req.userId;
        const { event_id, action } = req.body;

        if (!event_id || !action) {
            return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
        }

        if (!["like", "dislike"].includes(action)) {
            return apiResponse.badRequest(res, "Invalid action");
        }

        const event = await Event.findOne({
            _id: event_id,
            is_deleted: false,
            is_active: true
        });

        if (!event) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
        }

        let eventLike = await EventLike.findOne({
            user_id: userId,
            event_id,
            is_active: true
        });

        const isLiked = action === "like";

        // FIRST TIME ACTION
        if (!eventLike) {
            await EventLike.create({
                user_id: userId,
                event_id,
                is_liked: isLiked
            });

            return apiResponse.ok(
                res,
                { is_liked: isLiked },
                isLiked ? "Event liked" : "Event disliked"
            );
        }

        // SAME ACTION AGAIN (NO CHANGE)
        if (eventLike.is_liked === isLiked) {
            return apiResponse.ok(
                res,
                { is_liked: eventLike.is_liked },
                isLiked ? "Event already liked" : "Event already disliked"
            );
        }

        // UPDATE ACTION
        eventLike.is_liked = isLiked;
        await eventLike.save();

        return apiResponse.ok(
            res,
            { is_liked: isLiked },
            isLiked ? "Event liked" : "Event disliked"
        );

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


// View Event Booking Summary
const eventBookingSummary = async (req, res) => {
    try {
        const { booking_id } = req.params


        if (!booking_id) {
            return apiResponse.badRequest(res, messages.BOOKINGID_REQ)
        }

        // Find booking
        const booking = await Booking.findOne({
            _id: booking_id,
            booking_type: "event",
            is_active: true,
            is_deleted: false
        })

        if (!booking) {
            return apiResponse.badRequest(res, messages.BOOKING_NOT_FOUND)
        }

        // Find event
        const event = await Event.findById(booking.event_id)

        if (!event) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND)
        }

        // distance from user's stored location (if available)
        let distance_km = null;
        let userLat = null;
        let userLon = null;

        if (booking.user_id) {
            const user = await User.findById(booking.user_id)
                .select("latitude longitude city_id")
                .lean();

            if (user) {
                userLat = user.latitude;
                userLon = user.longitude;

                if ((userLat == null || userLon == null) && user.city_id) {
                    const city = await City.findOne({
                        _id: user.city_id,
                        is_active: true,
                        is_deleted: false
                    }).select("latitude longitude").lean();

                    userLat = userLat ?? city?.latitude ?? null;
                    userLon = userLon ?? city?.longitude ?? null;
                }

                distance_km = helper.getDistanceInKm(
                    userLat,
                    userLon,
                    event?.latitude,
                    event?.longitude
                );
            }
        }

        /* ================= FORMAT DATE ================= */

        const eventDate = new Date(event.start_date)

        const bookingDate = eventDate.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "short"
        })

        const bookingStartTime = new Date(`1970-01-01T${event.start_time}:00`)
            .toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            })

        const bookingEndTime = new Date(`1970-01-01T${event.end_time}:00`)
            .toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            })

        /* ================= RESPONSE ================= */

        const response = {
            booking_id: booking._id,
            event_id: booking.event_id,
            event_name: event?.venue_name || "",
            event_image: event?.venue_image || "",
            city_name: booking?.city_name || "",
            address: event?.address || "",
            latitude: event?.latitude,
            longitude: event?.longitude,
            user_location: {
                latitude: userLat,
                longitude: userLon
            },
            distance_km,
            date: bookingDate,
            time: `${bookingStartTime} - ${bookingEndTime}`,

            // ✅ Multiple Tickets
            tickets: (booking.event_tickets || []).map(t => ({
                ticket_id: t.ticket_id,
                title: t.title,
                isOneDay: t.isOneDay,
                quantity: t.quantity,
                base_price: t.base_price,
                total_price: t.total_price
            })),

            total_quantity: booking.quantity,

            sub_total: booking.sub_total,
            discount: booking.discount,
            discount_percent: booking.discount_percent,
            gst_percentage: booking.gst_percentage,
            gst_amount: booking.gst_amount,
            tax_amount: booking.tax_amount,
            total: booking.total,

            payment_mode: "UPI",
            payment_status: booking.payment_status,

            full_name: booking.contact_info?.full_name || "",
            phone_number: booking.contact_info?.phone_number || "",
            country_code: booking.contact_info?.country_code || "",
            email: booking.contact_info?.email || ""
        }

        return apiResponse.ok(res, response, messages.DATA_FOUND)

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
    }
}


export default { getEventDetail, toggleEventLike, eventBookingSummary };
