import express from "express";
import tabularReportController from "../../controller/admin/tabularReportController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { tabularReportSchema } from "../../validation/admin/tabularReportValidation.js";

const route = express.Router();

route
  .get("/get_contact_report", allowAdminOrVendor, validate(tabularReportSchema, "query"), tabularReportController.getTabularUserReport)
  .get("/get_booking_report", allowAdminOrVendor, validate(tabularReportSchema, "query"), tabularReportController.getTabularBookingReport)
  .get("/get_earnings_report", allowAdminOrVendor, validate(tabularReportSchema, "query"), tabularReportController.getTabularEarningsReport)
  .get("/summry",allowAdminOrVendor,validate(tabularReportSchema,"query",tabularReportController.getVendorEarningsSummary))
.get(
  '/events',
  allowAdminOrVendor,
  tabularReportController.getEventTabular
)
.get("/get_booking_report_admin", allowAdminOrVendor, validate(tabularReportSchema, "query"), tabularReportController.getTabularBookingReportAdmin)

export default route;
