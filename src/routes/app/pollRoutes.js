import express from "express";
import { appAuth } from "../../middleware/authMiddleware.js";
import pollController from "../../controller/app/pollController.js";

const route = express.Router();

route
  .get("/active", appAuth, pollController.getActivePolls)
  .post("/:id/vote", appAuth, pollController.voteOnPoll);

export default route;