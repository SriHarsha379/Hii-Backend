/** @format */

import express from "express";
import contactController from "../../controller/admin/contactController.js";
import { adminauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route
  .get("/get_all_contact", allowAdminOrVendor, contactController.getAllContacts)
  .put("/reply_contact/:id", allowAdminOrVendor, contactController.replyToContact)
  .post("/add", contactController.addContact)
  .get("/getVendorContacts", allowAdminOrVendor, contactController.getVendorContacts)
  .post("/vendor_add", allowAdminOrVendor, contactController.addVendorContact)
  .get("/get_vendor_contacts", allowAdminOrVendor, contactController.getVendorMyContacts)

export default route;
