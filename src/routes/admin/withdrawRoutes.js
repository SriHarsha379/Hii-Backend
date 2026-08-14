import express from "express";
import withdrawController from "../../controller/admin/withdrawController.js";
import vendorWithdrawController from "../../controller/admin/vendorWithdrawController.js"; 
import { adminauth, vendorauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import {
  requestWithdrawSchema,
  approveWithdrawSchema,
  rejectWithdrawSchema
} from "../../validation/admin/withdrawValidation.js";

const router = express.Router();




router.get(
  "/list",
  allowAdminOrVendor,
  withdrawController.getAllWithdraws
);

// Admin approves
router.post(
  "/approve/:id",
  adminauth,
  validate(approveWithdrawSchema),
  withdrawController.approveWithdraw
);

// Admin rejects
router.post(
  "/reject/:id",
  adminauth,
  validate(rejectWithdrawSchema),
  withdrawController.rejectWithdraw
);

router.get('/total_earnings', vendorauth, vendorWithdrawController.getVendorEarnings);
router.get('/event_earnings', vendorauth, vendorWithdrawController.getEventEarnings);
router.get('/venue_earnings', vendorauth, vendorWithdrawController.getVenueEarnings);

// Withdrawal routes
router.post('/request', vendorauth, vendorWithdrawController.requestWithdraw);
router.get('/vendor/list', vendorauth, vendorWithdrawController.getVendorWithdrawals);
router.delete('/delete/:id', vendorauth, vendorWithdrawController.deleteWithdrawal);

router.get('/earning/:id', vendorauth, vendorWithdrawController.getWithdrawalById);
export default router;
