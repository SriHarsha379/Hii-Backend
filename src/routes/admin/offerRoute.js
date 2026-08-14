
import express from "express";
import offerController from "../../controller/admin/offerController.js";
import { vendorauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

route
  .post("/create_offer", vendorauth, offerController.createOffer)
  .get("/get_all_offers", vendorauth, offerController.getAllOffers)
  .get("/get_offer_by_id/:id", vendorauth, offerController.getOfferById)
  .put("/update_offer/:id", vendorauth, offerController.updateOffer)
  .delete("/delete_offer/:id", vendorauth, offerController.deleteOffer);

export default route;