import express from "express";
import UserSubmitAnswerController from "../../controller/admin/userSubmitAsnwerController.js";

const router = express.Router();

// GET answers by booking ID
router.get("/answers/:bookingId", UserSubmitAnswerController.getAnswersByBookingId);

export default router;
