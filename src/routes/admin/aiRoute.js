// ISSUE 3 FIX: routes Gemini calls through the backend so the API key
// is never exposed in the frontend bundle.
import express from "express";
import aiController from "../../controller/admin/aiController.js";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();
route.post("/generate", adminauth, aiController.generate);
export default route;
