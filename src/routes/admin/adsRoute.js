import express from "express";
import adsController from "../../controller/admin/adsController.js";
import { adminauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js"

const route = express.Router();

route
    .get("/get_all", allowAdminOrVendor, adsController.getAds)
    .post("/create", allowAdminOrVendor,upload.single('ad_image'),adsController.createAd)
    .post("/update/:id", allowAdminOrVendor, upload.single('ad_image'),adsController.updateAd)
    .post("/delete/:id", allowAdminOrVendor, adsController.deleteAd)

export default route;
