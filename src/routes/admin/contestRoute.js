import express from "express";
import contestController from "../../controller/admin/contestController.js";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

// NEW: same situation as pollRoute.js — /contests had no route at all.
route.get("/", adminauth, contestController.getAllContests);
route.post("/", adminauth, contestController.createContest);
route.patch("/:id/status", adminauth, contestController.updateContestStatus);
route.delete("/:id", adminauth, contestController.deleteContest);
route.get("/:id/participants", adminauth, contestController.getContestParticipants);

export default route;