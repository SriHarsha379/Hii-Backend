import express from "express";
import pollController from "../../controller/admin/pollController.js";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

// NEW: /polls had no route at all before — the entire Polls & Contests
// page has been calling nonexistent endpoints this whole time.
route.get("/", adminauth, pollController.getAllPolls);
route.post("/", adminauth, pollController.createPoll);
route.patch("/:id/status", adminauth, pollController.updatePollStatus);
route.delete("/:id", adminauth, pollController.deletePoll);

export default route;