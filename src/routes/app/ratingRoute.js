import express from "express";
import { validate } from "../../middleware/validate.js";
import { appAuth } from '../../middleware/authMiddleware.js';
import ratingController from "../../controller/app/ratingController.js";
const route = express.Router();

route
    .post("/add", appAuth, ratingController.createRating)



export default route;