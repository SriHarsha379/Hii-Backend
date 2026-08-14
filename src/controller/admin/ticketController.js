/** @format */
import { Ticket, Event, Booking } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

const createTicket = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const {
      event_id,
      ticket_type,
      title,
      ticket_price,
      total_tickets,
      description,
    } = req.body;

    // Validation
    if (!event_id || !title || !ticket_price || !total_tickets) {
      return apiResponse.badRequestResponse(res, "Please fill all required fields");
    }

    if (ticket_price <= 0) {
      return apiResponse.badRequestResponse(res, "Ticket price must be greater than 0");
    }

    if (total_tickets <= 0) {
      return apiResponse.badRequestResponse(res, "Total tickets must be greater than 0");
    }

    // Check if event exists and belongs to vendor
    const eventExists = await Event.findOne({ 
      _id: event_id, 
      vendor_id,
      is_deleted: false 
    });
    
    if (!eventExists) {
      return apiResponse.notFoundResponse(res, "Event not found or does not belong to you");
    }

    // Check if ticket with same title already exists for this event
    const existingTicket = await Ticket.findOne({
      vendor_id,
      event_id,
      title: title.trim(),
      is_deleted: false,
    });

    if (existingTicket) {
      return apiResponse.badRequest(res, "A ticket with this title already exists for this event");
    }

    // Create new ticket
    const ticket = new Ticket({
      vendor_id,
      event_id,
      ticket_type: ticket_type || "One Day Pass",
      title: title.trim(),
      ticket_price: Number(ticket_price),
      total_tickets: Number(total_tickets),
      sold_tickets: 0,
      available_tickets: Number(total_tickets),
      description: description || "",
      is_active: true,
    });

    await ticket.save();
    
    return apiResponse.created(res, ticket, "Ticket created successfully");
  } catch (err) {
    console.error("Create ticket error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

const getTickets = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const tickets = await Ticket.find({
      vendor_id,
      is_deleted: false,
    })
      .populate("event_id", "venue_name date start_time end_time")
      .sort({ createdAt: -1 });

    // Calculate actual sold tickets from bookings
    const ticketsWithActualSales = await Promise.all(
      tickets.map(async (ticket) => {
        const ticketBookings = await Booking.find({
          ticket_id: ticket._id,
          is_deleted: false,
          status: { $ne: 'cancelled' }
        });

        const actualSold = ticketBookings.reduce((sum, booking) => {
          return sum + (booking.num_tickets || booking.ticket_count || 1);
        }, 0);

        return {
          ...ticket.toObject(),
          sold_tickets: actualSold,
          available_tickets: Math.max(0, ticket.total_tickets - actualSold)
        };
      })
    );

    return apiResponse.ok(res, ticketsWithActualSales, "Success");
  } catch (err) {
    console.error("Get tickets error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

const getTicketById = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false
    }).populate("event_id", "venue_name date start_time end_time");

    if (!ticket) {
      return apiResponse.notFoundResponse(res, "Ticket not found");
    }

    // Get actual sales data from bookings
    const ticketBookings = await Booking.find({
      ticket_id: ticket._id,
      is_deleted: false,
      status: { $ne: 'cancelled' }
    });

    const actualSold = ticketBookings.reduce((sum, booking) => {
      return sum + (booking.num_tickets || booking.ticket_count || 1);
    }, 0);

    const actualAvailable = Math.max(0, ticket.total_tickets - actualSold);
    const totalRevenue = ticketBookings.reduce((sum, booking) => {
      return sum + (booking.total || 0);
    }, 0);

    const ticketWithStats = {
      ...ticket.toObject(),
      sold_tickets: actualSold,
      available_tickets: actualAvailable,
      total_revenue: totalRevenue,
      booking_count: ticketBookings.length
    };

    return apiResponse.ok(res, ticketWithStats, "Success");
  } catch (err) {
    console.error("Get ticket by ID error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

const updateTicket = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const ticketId = req.params.id;

    // Check if ticket exists and belongs to vendor
    const ticket = await Ticket.findOne({
      _id: ticketId,
      vendor_id,
      is_deleted: false
    });

    if (!ticket) {
      return apiResponse.notFoundResponse(res, "Ticket not found");
    }

    // Get current bookings to check sold tickets
    const ticketBookings = await Booking.find({
      ticket_id: ticket._id,
      is_deleted: false,
      status: { $ne: 'cancelled' }
    });

    const currentSold = ticketBookings.reduce((sum, booking) => {
      return sum + (booking.num_tickets || booking.ticket_count || 1);
    }, 0);

    const updateData = { ...req.body };
    
    // Update available tickets if total_tickets is changed
    if (updateData.total_tickets !== undefined) {
      const newTotal = Number(updateData.total_tickets);
      if (newTotal < currentSold) {
        return apiResponse.badRequestResponse(res, 
          `Total tickets cannot be less than sold tickets (${currentSold})`
        );
      }
      updateData.available_tickets = newTotal - currentSold;
      updateData.sold_tickets = currentSold;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { $set: updateData },
      { new: true }
    ).populate("event_id", "venue_name date");

    return apiResponse.ok(res, updatedTicket, "Ticket updated successfully");
  } catch (err) {
    console.error("Update ticket error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

const deleteTicket = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false
    });

    if (!ticket) {
      return apiResponse.notFoundResponse(res, "Ticket not found");
    }

    // Check if there are bookings for this ticket
    const hasBookings = await Booking.findOne({
      ticket_id: ticket._id,
      is_deleted: false
    });

    if (hasBookings) {
      return apiResponse.badRequestResponse(res, 
        "Cannot delete ticket with existing bookings. Please cancel bookings first."
      );
    }

    // Soft delete
    ticket.is_deleted = true;
    ticket.is_active = false;
    await ticket.save();

    return apiResponse.ok(res, ticket, "Ticket deleted successfully");
  } catch (err) {
    console.error("Delete ticket error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

const getTicketsByEvent = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const event_id = req.params.event_id;

    // Check if event exists and belongs to vendor
    const eventExists = await Event.findOne({
      _id: event_id,
      vendor_id,
      is_deleted: false
    });

    if (!eventExists) {
      return apiResponse.notFoundResponse(res, "Event not found or does not belong to you");
    }

    const tickets = await Ticket.find({
      event_id,
      vendor_id,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    // Calculate actual sold tickets for each ticket
    const ticketsWithActualSales = await Promise.all(
      tickets.map(async (ticket) => {
        const ticketBookings = await Booking.find({
          ticket_id: ticket._id,
          is_deleted: false,
          status: { $ne: 'cancelled' }
        });

        const actualSold = ticketBookings.reduce((sum, booking) => {
          return sum + (booking.num_tickets || booking.ticket_count || 1);
        }, 0);

        const actualAvailable = Math.max(0, ticket.total_tickets - actualSold);
        const soldPercentage = ticket.total_tickets > 0 ? 
          Math.round((actualSold / ticket.total_tickets) * 100) : 0;

        return {
          ...ticket.toObject(),
          sold_tickets: actualSold,
          available_tickets: actualAvailable,
          sold_percentage: soldPercentage,
          booking_count: ticketBookings.length,
          total_revenue: ticketBookings.reduce((sum, booking) => sum + (booking.total || 0), 0)
        };
      })
    );

    return apiResponse.ok(res, ticketsWithActualSales, "Tickets retrieved successfully");
  } catch (err) {
    console.error("Get tickets by event error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
}; 

// New function: Get ticket sales statistics
const getTicketSalesStats = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const { event_id } = req.params;

    // Check if event exists and belongs to vendor
    const eventExists = await Event.findOne({
      _id: event_id,
      vendor_id,
      is_deleted: false
    });

    if (!eventExists) {
      return apiResponse.notFoundResponse(res, "Event not found or does not belong to you");
    }

    // Get all tickets for this event
    const tickets = await Ticket.find({
      event_id,
      vendor_id,
      is_deleted: false
    });

    // Get all bookings for this event
    const bookings = await Booking.find({
      event_id,
      vendor_id,
      is_deleted: false,
      status: { $ne: 'cancelled' }
    })
    .populate('ticket_id', 'title ticket_price');

    // Calculate total stats
    let totalTicketsSold = 0;
    let totalRevenue = 0;
    let totalAvailable = 0;
    let totalCapacity = 0;

    // Calculate per-ticket stats
    const ticketStats = tickets.map(ticket => {
      // Count bookings for this specific ticket
      const ticketBookings = bookings.filter(b => 
        b.ticket_id && b.ticket_id._id.toString() === ticket._id.toString()
      );
      
      const sold = ticketBookings.reduce((sum, booking) => {
        return sum + (booking.num_tickets || booking.ticket_count || 1);
      }, 0);
      
      const revenue = ticketBookings.reduce((sum, booking) => {
        return sum + (booking.total || 0);
      }, 0);
      
      const available = Math.max(0, ticket.total_tickets - sold);
      const soldPercentage = ticket.total_tickets > 0 ? 
        Math.round((sold / ticket.total_tickets) * 100) : 0;

      // Update totals
      totalTicketsSold += sold;
      totalRevenue += revenue;
      totalAvailable += available;
      totalCapacity += ticket.total_tickets;

      return {
        ticket_id: ticket._id,
        title: ticket.title,
        ticket_type: ticket.ticket_type,
        price: ticket.ticket_price,
        total_tickets: ticket.total_tickets,
        sold_tickets: sold,
        available_tickets: available,
        sold_percentage: soldPercentage,
        revenue: revenue,
        booking_count: ticketBookings.length
      };
    });

    // Overall event stats
    const eventStats = {
      total_tickets_sold: totalTicketsSold,
      total_revenue: totalRevenue,
      total_available_tickets: totalAvailable,
      total_capacity: totalCapacity,
      overall_sold_percentage: totalCapacity > 0 ? 
        Math.round((totalTicketsSold / totalCapacity) * 100) : 0,
      total_bookings: bookings.length
    };

    return apiResponse.ok(res, {
      ticket_stats: ticketStats,
      event_stats: eventStats,
      tickets: ticketStats.length,
      last_updated: new Date()
    }, "Ticket sales statistics retrieved successfully");
  } catch (err) {
    console.error("Get ticket sales stats error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// New function: Update ticket sold count (called from booking controller)
const updateTicketSoldCount = async (ticketId, quantity = 1, operation = 'add') => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (operation === 'add') {
      // Check if tickets are available
      if (ticket.available_tickets < quantity) {
        throw new Error(`Only ${ticket.available_tickets} tickets available`);
      }
      
      ticket.sold_tickets = (ticket.sold_tickets || 0) + quantity;
      ticket.available_tickets = Math.max(0, ticket.available_tickets - quantity);
    } else if (operation === 'subtract') {
      ticket.sold_tickets = Math.max(0, (ticket.sold_tickets || 0) - quantity);
      ticket.available_tickets = Math.min(ticket.total_tickets, ticket.available_tickets + quantity);
    }

    await ticket.save();
    return ticket;
  } catch (error) {
    console.error('Error updating ticket sold count:', error);
    throw error;
  }
};

export default {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByEvent,
  getTicketSalesStats,
  updateTicketSoldCount
};