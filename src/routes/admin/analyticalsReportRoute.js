import express from 'express';
import AnalyticalReportController from '../../controller/admin/analyticalReportController.js';
import { adminauth, allowAdminOrVendor,vendorauth } from '../../middleware/authMiddleware.js';
const route = express.Router();

route
    .get('/get_user_analytical_report', allowAdminOrVendor, AnalyticalReportController.getAnalyticalUserReport)
    .get('/get_booking_analytical_report', allowAdminOrVendor, AnalyticalReportController.getAnalyticalBookingReport)
    .get('/get_earnings_analytical_report', allowAdminOrVendor, AnalyticalReportController.getAnalyticalEarningsReport)

  .get(
  '/get_earnings_analytical_report1',
  vendorauth,
  AnalyticalReportController.getVendorAnalyticalEarningsReport
)
.get('/get_booking_analytical_report1', vendorauth, AnalyticalReportController.getAnalyticalBookingReport1)
export default route;

