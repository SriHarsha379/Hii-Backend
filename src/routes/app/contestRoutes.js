import express from "express";
import { appAuth } from "../../middleware/authMiddleware.js";
import contestController from "../../controller/app/contestController.js";

const route = express.Router();

route
  .get("/active", appAuth, contestController.getActiveContests)
  .post("/:id/enter", appAuth, contestController.enterContest);

export default route;