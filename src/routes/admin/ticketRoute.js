import express from 'express';
import {vendorauth} from '../../middleware/authMiddleware.js';
import ticketController from '../../controller/admin/ticketController.js';

const router = express.Router();

// Ticket Routes
router.post('/create_ticket', vendorauth, ticketController.createTicket);
router.get('/get_all_tickets', vendorauth, ticketController.getTickets);
router.get('/get_ticket_by_id/:id', vendorauth, ticketController.getTicketById);
router.put('/update_ticket/:id', vendorauth, ticketController.updateTicket);
router.delete('/delete_ticket/:id', vendorauth, ticketController.deleteTicket);
router.get('/get_tickets_by_event/:event_id', vendorauth, ticketController.getTicketsByEvent);
router.get('/get_ticket_sales_stats/:event_id', vendorauth, ticketController.getTicketSalesStats);

export default router;