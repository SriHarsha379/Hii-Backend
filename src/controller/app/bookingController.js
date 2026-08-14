import mongoose from "mongoose"
import { Ticket, Venue, Event, Coupon, Booking, User, Commission } from "../../model/index.js"
import apiResponse from "../../utility/apiResponse.js"
import messages from "../../utility/messages.js"
import sendNotification from "../../utility/notification.js";

// Get event Tickets
const getEventTickets = async (req, res) => {
  try {
    const { eventId } = req.params

    const tickets = await Ticket.find({
      event_id: eventId,
      is_active: true,
      is_deleted: false
    })
      .select("title ticket_price total_tickets sold_tickets ticket_type")
      .sort({ ticket_price: 1 })
      .lean()

    if (!tickets.length) {
      return apiResponse.badRequest(res, messages.NO_DATA_FOUND)
    }

    const oneDayPass = []
    const multiDayPass = []
    let minPrice = null

    tickets.forEach(t => {
      const available = Math.max(t.total_tickets - t.sold_tickets, 0)

      const ticketObj = {
        _id: t._id,
        title: t.title,
        price: t.ticket_price,
        total_tickets: t.total_tickets,
        available_tickets: available,
        is_sold_out: available === 0
      }

      if (available > 0) {
        if (minPrice === null || t.ticket_price < minPrice) {
          minPrice = t.ticket_price
        }
      }

      if (t.ticket_type === "One Day Pass") {
        oneDayPass.push(ticketObj)
      }

      if (t.ticket_type === "Multi Day Pass") {
        multiDayPass.push(ticketObj)
      }
    })

    const response = {
      currency: "INR",
      min_price: minPrice,
      one_day_pass: oneDayPass,
      multi_day_pass: multiDayPass
    }

    return apiResponse.ok(res, response, messages.DATA_FOUND)
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
  }
}
// Get Coupon Percentage 
const getCouponPercentage = async (req, res) => {
  try {
    const { coupon_code, vendor_id, event_id, venue_id } = req.query

    if (!coupon_code) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM)
    }

    // Determine vendor for this booking context
    let targetVendorId = vendor_id

    if (!targetVendorId && event_id) {
      const event = await Event.findOne({
        _id: event_id,
        is_active: true,
        is_deleted: false
      }).select("vendor_id").lean()

      targetVendorId = event?.vendor_id
    }

    if (!targetVendorId && venue_id) {
      const venue = await Venue.findOne({
        _id: venue_id,
        is_active: true,
        is_deleted: false
      }).select("vendor_id").lean()

      targetVendorId = venue?.vendor_id
    }

    if (!targetVendorId) {
      return apiResponse.badRequest(res, "Vendor not found for coupon validation")
    }

    const coupon = await Coupon.findOne({
  promo_code: coupon_code.toUpperCase(),
  vendor_id: targetVendorId,
  is_active: true,
  is_deleted: false
}).lean()

if (!coupon) {
  return apiResponse.badRequest(
    res,
    "Please enter a valid coupon code."
  )
}

if (new Date(coupon.expiry_date) < new Date()) {
  return apiResponse.badRequest(
    res,
    messages.COUPON_EXPIRED
  )
}

    const response = {
      coupon_code: coupon.promo_code,
      discount_percentage: coupon.discount_percentage,
      vendor_id: coupon.vendor_id
    }

    return apiResponse.ok(res, response, messages.DATA_FOUND)
  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    )
  }
}

// Create Event Booking
const createEventBooking = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const userId = req.userId

    const {
      event_id,
      ticket_id,
      transaction_id,
      booking_type,
      discount = 0,
      sub_total,
      total,
      country_code,
      phone_number,
      email,
      full_name,
      city_name
    } = req.body

    if (
      !event_id ||
      !Array.isArray(ticket_id) ||
      ticket_id.length === 0 ||
      !transaction_id ||
      !booking_type ||
      !country_code ||
      !phone_number ||
      !email ||
      !full_name ||
      sub_total == null ||
      total == null
    ) {
      await session.abortTransaction()
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM)
    }

    const event = await Event.findOne({
      _id: event_id,
      is_active: true,
      is_deleted: false
    }).session(session)

    if (!event) {
      await session.abortTransaction()
      return apiResponse.badRequest(res, messages.NO_DATA_FOUND)
    }

    let totalQuantity = 0
    let vendorId = null
    const bookingTickets = []

    for (const item of ticket_id) {

      const ticket = await Ticket.findOne({
        _id: item._id,
        event_id,
        is_active: true,
        is_deleted: false
      }).session(session)

      if (!ticket) {
        await session.abortTransaction()
        return apiResponse.badRequest(res, "Ticket not found")
      }

      const ticketCount = Number(item.count)

      if (ticketCount <= 0) {
        await session.abortTransaction()
        return apiResponse.badRequest(res, "Invalid ticket quantity")
      }

      const available = ticket.total_tickets - ticket.sold_tickets

      if (available < ticketCount) {
        await session.abortTransaction()
        return apiResponse.badRequest(res, messages.TICKET_SOLDOUT)
      }

      totalQuantity += ticketCount
      vendorId = ticket.vendor_id

      bookingTickets.push({
        ticket_id: ticket._id,
        title: ticket.title,
        isOneDay: ticket.ticket_type === "One Day Pass",
        quantity: ticketCount,
        base_price: Number(item.base_price),
        total_price: Number(item.total_price)
      })

      ticket.sold_tickets += ticketCount
      await ticket.save({ session })
    }

    /* ================= ADMIN COMMISSION CALCULATION ================= */

    // 1️⃣ Get Commission
    const commissionData = await Commission.findOne().lean();
    const commission_percentage = commissionData?.commission_percentage || 0;

    // 2️⃣ Calculate Taxable Amount
    const numericSubTotal = Number(sub_total);
    const numericDiscount = Number(discount || 0);

    const taxable_amount = numericSubTotal - numericDiscount;

    // Safety check
    const finalTaxableAmount = taxable_amount > 0 ? taxable_amount : 0;

    // 3️⃣ Calculate Admin Earning
    const admin_earning =
      (finalTaxableAmount * commission_percentage) / 100;

    const booking = await Booking.create(
      [
        {
          vendor_id: vendorId,
          user_id: userId,
          booking_type: "event",
          event_id,
          event_tickets: bookingTickets,
          quantity: totalQuantity,

          sub_total: Number(sub_total),
          discount: Number(discount),
          total: Number(total),

          // ✅ NEW FIELDS
          admin_earning,
          admin_earning_percentage: commission_percentage,

          transaction_id,
          city_name,
          contact_info: {
            country_code,
            phone_number,
            email,
            full_name
          }
        }
      ],
      { session }
    )

    await session.commitTransaction()

    /* ================= SEND BOOKING PUSH ================= */

    const user = await User.findById(userId)
      .select("player_id")
      .lean();

    if (user?.player_id) {
      await sendNotification(
        "event_booking_confirmed",
        user.player_id,
        {
          type: 'event_booking',
          senderId: userId,
          other_user_id: userId,
          action: "event_booking_confirmed",
          booking_id: booking[0]._id,
          event_id: event._id
        },
        0
      );
    }

    return apiResponse.ok(
      res,
      {
        booking_id: booking[0]._id,
        transaction_id,
        total: Number(total)
      },
      messages.BOOKING_SUCCESS || "Booking confirmed"
    )

  } catch (error) {
    await session.abortTransaction()
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    )
  } finally {
    session.endSession()
  }
}


const getVenueSlots = async (req, res) => {
  try {
    const { date, venue_id } = req.query

    if (!venue_id || !date) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM)
    }

    const venue = await Venue.findOne({
      _id: venue_id,
      is_active: true,
      is_deleted: false
    }).lean()

    if (!venue) {
      return apiResponse.badRequest(res, messages.NO_DATA_FOUND)
    }

    const selectedDate = new Date(date + "T00:00:00+05:30")

    const dayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" })

    if (venue.open_days?.length && !venue.open_days.includes(dayName)) {
      return apiResponse.ok(res, {}, "Venue is closed on selected day")
    }

    const parseTime = (timeStr) => {
      if (!timeStr) return { hours: 0, minutes: 0 }

      if (timeStr instanceof Date) {
        return {
          hours: timeStr.getHours(),
          minutes: timeStr.getMinutes()
        }
      }

      timeStr = String(timeStr).trim().toUpperCase()

      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const [time, modifier] = timeStr.split(" ")
        let [hours, minutes] = time.split(":").map(Number)

        if (modifier === "PM" && hours < 12) hours += 12
        if (modifier === "AM" && hours === 12) hours = 0

        return { hours: hours || 0, minutes: minutes || 0 }
      }

      const [h, m] = timeStr.split(":").map(Number)

      return { hours: h || 0, minutes: m || 0 }
    }

    const { hours: startHour, minutes: startMinute } = parseTime(venue.start_time)
    const { hours: endHour, minutes: endMinute } = parseTime(venue.end_time)

    let startDateTime = new Date(selectedDate)
    startDateTime.setHours(startHour, startMinute, 0, 0)

    let endDateTime = new Date(selectedDate)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1)
    }

    const slots = []

    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    )

    const todayIST = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    })

    const selectedIST = new Date(selectedDate).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    })

    const isToday = todayIST === selectedIST

    while (startDateTime < endDateTime) {
      const slotStart = new Date(startDateTime)

      startDateTime.setMinutes(startDateTime.getMinutes() + 30)

      if (
        isToday &&
        (
          slotStart.getHours() < now.getHours() ||
          (slotStart.getHours() === now.getHours() &&
            slotStart.getMinutes() <= now.getMinutes())
        )
      ) continue

      slots.push({
        start_time: slotStart,
        display_time: slotStart.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        })
      })
    }

    return apiResponse.ok(
      res,
      {
        venue_id,
        date,
        slot_duration: "30 mins",
        total_slots: slots.length,
        slots
      },
      messages.DATA_FOUND
    )

  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    )
  }
}

// Create Venue Booking
const createVenueBooking = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      venue_id,
      date,
      slot,
      number_of_guests,
      is_cover,
      special_request,
      transaction_id,
      cover_charge_percentage,
      cover_charge,
      discount,
      sub_total,
      total,
      booking_type,
      city_name,

      gst_amount,
      gst_percentage,
      discount_percent,

      full_name,
      phone_number,
      country_code,
      email
    } = req.body;

    /* ================= VALIDATION ================= */

    if (
      !venue_id ||
      !date ||
      !slot ||
      !number_of_guests ||
      !transaction_id ||
      !sub_total ||
      !total ||
      !full_name ||
      !phone_number ||
      !email
    ) {
      return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
    }

    /* ================= FIND VENUE ================= */

    const venue = await Venue.findOne({
      _id: venue_id,
      is_active: true,
      is_deleted: false
    }).lean();

    if (!venue) {
      return apiResponse.badRequest(res, messages.NO_DATA_FOUND);
    }


    /* ================= SLOT VALIDATION ================= */

    // Convert "05:30 pm" to 24-hour format
    const convertTo24Hour = (time12h) => {
      const [time, modifier] = time12h.split(" ");
      let [hours, minutes] = time.split(":");

      hours = parseInt(hours);

      if (modifier.toLowerCase() === "pm" && hours !== 12) {
        hours += 12;
      }
      if (modifier.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }

      return { hours, minutes: parseInt(minutes) };
    };

    const { hours, minutes } = convertTo24Hour(slot);

    // Create full Date using date + converted time
    // const slotDateTime = new Date(`${date}T00:00:00`);
    // slotDateTime.setHours(hours, minutes, 0, 0);

    const slotDateTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`);

    if (isNaN(slotDateTime.getTime())) {
      return apiResponse.badRequest(res, messages.INVALID_SLOTS);
    }


    /* ================= DOUBLE BOOKING CHECK ================= */

    // const alreadyBooked = await Booking.findOne({
    //   venue_id,
    //   slot_time: slotDateTime
    // });

    // if (alreadyBooked) {
    //   return apiResponse.badRequest(res, "Slot already booked");
    // }


    /* ================= CONTACT OBJECT ================= */

    const contact_info = {
      full_name: full_name.trim(),
      phone_number,
      country_code: country_code || "",
      email
    };

    /* ================= ADMIN COMMISSION CALCULATION ================= */

    // 1️⃣ Get Commission Percentage
    let commissionData = await Commission.findOne().lean();

    const commission_percentage = commissionData?.commission_percentage || 0;

    // 2️⃣ Remove GST from Subtotal
    const numericSubTotal = Number(sub_total);
    const numericGstAmount = Number(gst_amount || 0);

    const taxable_amount = numericSubTotal - numericGstAmount;

    // Safety check (avoid negative)
    const finalTaxableAmount = taxable_amount > 0 ? taxable_amount : 0;

    // 3️⃣ Calculate Admin Commission
    const admin_earning = (finalTaxableAmount * commission_percentage) / 100;

    /* ================= CREATE BOOKING ================= */

    const booking = await Booking.create({
      vendor_id: venue.vendor_id,
      user_id: userId,
      venue_id,
      booking_type: booking_type || "venue",

      cover_charge_percentage: cover_charge_percentage || 0,
      cover_charge: cover_charge || 0,

      discount: discount || 0,
      discount_percent: discount_percent || 0,

      sub_total,
      gst_percentage: gst_percentage || 0,
      gst_amount: gst_amount || 0,

      total,
      transaction_id,

      // ✅ NEW FIELDS
      admin_earning,
      admin_earning_percentage: commission_percentage,

      booking_date: slotDateTime,
      slot_time: slotDateTime,

      number_of_guests: Number(number_of_guests),
      is_cover: is_cover || false,
      special_request: special_request || "",
      city_name: city_name || "",

      contact_info
    });

    /* ================= SEND BOOKING PUSH ================= */

    const user = await User.findById(userId)
      .select("player_id")
      .lean();

    if (user?.player_id) {
      await sendNotification(
        "venue_booking_confirmed",
        user.player_id,
        {
          type: 'venue_booking',
          senderId: userId,
          other_user_id: userId,
          action: "venue_booking_confirmed",
          booking_id: booking._id,
          venue_id: venue._id
        },
        0
      );
    }

    return apiResponse.ok(
      res,
      {
        booking_id: booking._id,
        vendor_id: booking.vendor_id,
        user_id: booking.user_id,
        venue_id: booking.venue_id,
        booking_type: booking.booking_type,

        cover_charge_percentage: booking.cover_charge_percentage,
        cover_charge: booking.cover_charge,
        discount: booking.discount,
        discount_percent: booking.discount_percent,
        gst_percentage: booking.gst_percentage,
        gst_amount: booking.gst_amount,
        sub_total: booking.sub_total,
        total: booking.total,
        transaction_id: booking.transaction_id,

        ticket_id: null,

        booking_date: booking.booking_date,
        slot_time: booking.slot_time,

        number_of_guests: booking.number_of_guests,
        is_cover: booking.is_cover,
        special_request: booking.special_request,

        fullname: booking.contact_info.full_name,
        country_code: booking.contact_info.country_code,
        phone_number: booking.contact_info.phone_number,
        email: booking.contact_info.email,

        city_name: booking.city_name || ""
      },
      messages.VENUE_BOOKED_SUCCESS || "Venue booked successfully"
    );



  } catch (error) {
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      error.message
    );
  }
};

export default { getEventTickets, getCouponPercentage, createEventBooking, getVenueSlots, createVenueBooking }
