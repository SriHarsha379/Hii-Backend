import express from "express";
import adsController from "../../controller/admin/adsController.js";
import { adminauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js"

const route = express.Router();

route
    .get("/get_all", allowAdminOrVendor, adsController.getAds)
    .get("/stats", allowAdminOrVendor, adsController.getAdStats)
    .post("/create", allowAdminOrVendor, upload.fields([{ name: 'ad_image', maxCount: 1 }, { name: 'ad_video', maxCount: 1 }]), adsController.createAd)
    .post("/update/:id", allowAdminOrVendor, upload.fields([{ name: 'ad_image', maxCount: 1 }, { name: 'ad_video', maxCount: 1 }]), adsController.updateAd)
    .post("/delete/:id", allowAdminOrVendor, adsController.deleteAd)

export default route;