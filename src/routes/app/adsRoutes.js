import express from "express";
import { appAuth } from "../../middleware/authMiddleware.js";
import adsController from "../../controller/app/adsController.js";

const route = express.Router();

// Ad analytics — was entirely missing. Called by the app once per ad
// render (impression) and once per tap-through (click).
route.post("/:id/impression", appAuth, adsController.logImpression);
route.post("/:id/click", appAuth, adsController.logClick);

export default route;