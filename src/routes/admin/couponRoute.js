/** @format */
// routes/admin/couponRoutes.js

import express from "express";
import couponController from "../../controller/admin/couponController.js";
import { vendorauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

route
  .post("/create_coupon", vendorauth, couponController.createCoupon)
  .get("/get_all_coupons", vendorauth, couponController.getAllCoupons)
  .get("/get_coupon_by_id/:id", vendorauth, couponController.getCouponById)
  .put("/update_coupon/:id", vendorauth, couponController.updateCoupon)
  .delete("/delete_coupon/:id", vendorauth, couponController.deleteCoupon);

export default route;