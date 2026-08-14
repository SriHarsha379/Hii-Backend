import { Event, User, Venue, VenueLike, VenueFollow, Booking, City } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js"
import moment from "moment"


// Venue Detail
const getVenueDetail = async (req, res) => {
    try {
        const userId = req.userId;
        const { venueId } = req.params;

        /* ===== CURRENT USER LOCATION ===== */
        const currentUser = await User.findById(userId)
            .select("latitude longitude city_id")
            .lean();

        if (!currentUser) {
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
        }

        /* ===== VENUE ===== */
        const venue = await Venue.findOne({
            _id: venueId,
            is_deleted: false,
            is_active: true
        })
            .populate("category_ids", "_id category_name")
            .lean();

        if (!venue) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
        }

        /* ===== DISTANCE ===== */
        let originLat = currentUser.latitude;
        let originLon = currentUser.longitude;

        // Fallback to city center if user lat/long missing
        if ((originLat == null || originLon == null) && currentUser.city_id) {
            const city = await City.findOne({
                _id: currentUser.city_id,
                is_active: true,
                is_deleted: false
            })
                .select("latitude longitude")
                .lean();

            originLat = city?.latitude ?? null;
            originLon = city?.longitude ?? null;
        }

        const distance_km = helper.getDistanceInKm(
            originLat,
            originLon,
            venue.latitude,
            venue.longitude
        );

        const today = new Date().toISOString().split("T")[0];

        /* ===== UPCOMING EVENTS AT VENUE ===== */
        const upcomingEvents = await Event.find({
            vendor_id: venue.vendor_id,
            is_deleted: false,
            is_active: true,
            end_date: { $gte: today }
        })
            .select("venue_name venue_image start_date start_time end_time table_reservation_fee bill_discount_percentage")
            .limit(5)
            .lean();

        const events = upcomingEvents.map(e => {
            const startDate = moment(e.start_date, "YYYY-MM-DD").tz("Asia/Kolkata");

            const date = startDate.format("ddd");

            const startTime = moment(e.start_time, ["h:mm A", "HH:mm"]).format("h A");
            const endTime = moment(e.end_time, ["h:mm A", "HH:mm"]).format("h A");

            return {
                _id: e._id,
                event_name: e.venue_name,
                event_image: e.venue_image,
                date: `${date}, ${startTime} - ${endTime}` // Fri, 21 Mar, 10 PM - 4 AM
            };
        });

        /* ===== VENUE LIKES (MINIMAL ADDITION) ===== */
        const [totalLikes, userLike] = await Promise.all([
            VenueLike.countDocuments({
                venue_id: venueId,
                is_liked: true,
                is_active: true
            }),
            VenueLike.findOne({
                venue_id: venueId,
                user_id: userId,
                is_liked: true,
                is_active: true
            }).select("_id")
        ]);

        /* ===== RESPONSE ===== */
        const response = {
            _id: venue._id,
            venue_name: venue.venue_name,
            venue_image: venue.venue_image,
            vendor_id: venue.vendor_id,
            categories: venue.category_ids
                ?.filter(c => c && c.category_name)
                .map(c => ({
                    _id: c._id,
                    name: c.category_name
                })),


            open_days: venue.open_days?.length
                ? (() => {
                    const days = venue.open_days;
                    const shortDays = days.map(d => d.replace(":", "").slice(0, 3));
                    return shortDays.length === 1
                        ? shortDays[0]
                        : `${shortDays[0]}–${shortDays[shortDays.length - 1]}`;
                })()
                : "Mon–Sun",
            timing: helper.formatVenueTime(venue.start_time, venue.end_time),
            start_time: (() => {
                const formatted = helper.formatVenueTime(venue.start_time, venue.start_time);
                return formatted ? formatted.split(" - ")[0] : "";
            })(),
            end_time: (() => {
                const formatted = helper.formatVenueTime(venue.end_time, venue.end_time);
                return formatted ? formatted.split(" - ")[1] || formatted.split(" - ")[0] : "";
            })(),
            address: venue.address,
            distance_km,
            latitude: venue.latitude,
            longitude: venue.longitude,
            user_location: {
                latitude: originLat,
                longitude: originLon
            },

            gallery: venue.gallery_images || [],

            about: venue.about,
            terms_and_conditions: venue.terms_and_conditions || "",
            faqs: (venue.faqs || []).map(f => ({
                question: f.question,
                answer: f.answer
            })),
            prohibited_items: (venue.prohibited_items || []).map(p => p.item).filter(Boolean),
            upcoming_events: events,
            table_reservation_fee: venue.table_reservation_fee || 0,
            bill_discount_percentage: venue.bill_discount_percentage || 0,

            tickets: {
                reservation_fee: venue.reservation_fee || 0,
                tax_percentage: venue.tax_percentage || 0
            },

            is_liked: !!userLike,
            can_book: true,
            total_likes: totalLikes
        };

        return apiResponse.ok(res, response, messages.DATA_FOUND);

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

// Like / Dislike Venue
const toggleVenueLike = async (req, res) => {
    try {
        const userId = req.userId;
        const { venue_id, action } = req.body;

        if (!venue_id || !action) {
            return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
        }

        if (!["like", "dislike"].includes(action)) {
            return apiResponse.badRequest(res, "Invalid action");
        }

        const venue = await Venue.findOne({
            _id: venue_id,
            is_deleted: false,
            is_active: true
        });

        if (!venue) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
        }

        let venueLike = await VenueLike.findOne({
            user_id: userId,
            venue_id,
            is_active: true
        });

        const isLiked = action === "like";

        // FIRST TIME
        if (!venueLike) {
            await VenueLike.create({
                user_id: userId,
                venue_id,
                is_liked: isLiked
            });

            return apiResponse.ok(
                res,
                { is_liked: isLiked },
                isLiked ? "Venue liked" : "Venue disliked"
            );
        }

        // SAME ACTION AGAIN
        if (venueLike.is_liked === isLiked) {
            return apiResponse.ok(
                res,
                { is_liked: venueLike.is_liked },
                isLiked ? "Venue already liked" : "Venue already disliked"
            );
        }

        // UPDATE
        venueLike.is_liked = isLiked;
        await venueLike.save();

        return apiResponse.ok(
            res,
            { is_liked: isLiked },
            isLiked ? "Venue liked" : "Venue disliked"
        );

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

// Follow / Unfollow Venue
const toggleVenueFollow = async (req, res) => {
    try {
        const userId = req.userId;
        const { venue_id, action } = req.body;

        if (!venue_id || !action) {
            return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
        }

        if (!["follow", "unfollow"].includes(action)) {
            return apiResponse.badRequest(res, "Invalid action");
        }

        /* ===== CHECK VENUE ===== */
        const venue = await Venue.findOne({
            _id: venue_id,
            is_deleted: false,
            is_active: true
        });

        if (!venue) {
            return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
        }

        let venueFollow = await VenueFollow.findOne({
            user_id: userId,
            venue_id
        });

        const isFollow = action === "follow";

        // FIRST TIME FOLLOW
        if (!venueFollow) {
            await VenueFollow.create({
                user_id: userId,
                venue_id,
                is_active: true
            });

            return apiResponse.ok(
                res,
                { is_followed: true },
                messages.VENUE_FOLLOWED_SUCCESS
            );
        }

        // UPDATE FOLLOW STATUS
        venueFollow.is_active = isFollow;
        await venueFollow.save();

        return apiResponse.ok(
            res,
            { is_followed: isFollow },
            isFollow
                ? messages.VENUE_FOLLOWED_SUCCESS
                : messages.VENUE_UNFOLLOWED_SUCCESS
        );

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

// View Booking Summary
const venueBookingSummary = async (req, res) => {
    try {
        const { booking_id } = req.params;

        if (!booking_id) {
            return apiResponse.badRequest(res, messages.BOOKINGID_REQ);
        }

        // Find booking
        const booking = await Booking.findById(booking_id);
        if (!booking) {
            return apiResponse.badRequest(res, messages.BOOKING_NOT_FOUND)
        }

        // Find venue
        const venue = await Venue.findById(booking.venue_id);

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
                    venue?.latitude,
                    venue?.longitude
                );
            }
        }

        // Get full Date object from booking
        const bookingDateTime = new Date(booking.booking_date);

        const bookingDate = bookingDateTime.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata"
        });

        const bookingTime = bookingDateTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        });

        // Response
        const response = {
            booking_id: booking._id,
            venue_id: booking.venue_id,
            venue_name: venue?.venue_name || "",
            venue_image: venue?.venue_image || "",
            city_name: booking?.city_name || "",
            address: venue?.address || "",
            latitude: venue?.latitude,
            longitude: venue?.longitude,
            user_location: {
                latitude: userLat,
                longitude: userLon
            },
            distance_km,
            date: bookingDate,
            time: bookingTime,
            number_of_guests: booking.number_of_guests,
            reservation_booking_fees: venue?.reservation_fee || "",
            discount_percent: booking.discount_percent,
            gst_percentage: booking.gst_percentage,
            gst_amount: booking.gst_amount,
            sub_total: booking.sub_total,
            cover_charge: booking.cover_charge,
            cover_charge_percentage: booking.cover_charge_percentage,
            discount: booking.discount,
            total: booking.total,
            payment_mode: booking.payment_mode || "UPI",
            payment_status: booking.payment_status,
            special_request: booking.special_request || "",
            full_name: booking.contact_info?.full_name || "",
            phone_number: booking.contact_info?.phone_number || "",
            country_code: booking.contact_info?.country_code || "",
            email: booking.contact_info?.email || ""
        };

        return apiResponse.ok(res, response, messages.DATA_FOUND)

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


export default { getVenueDetail, toggleVenueLike, toggleVenueFollow, venueBookingSummary };

