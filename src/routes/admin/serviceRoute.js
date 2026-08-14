import express from 'express';
import serviceController from '../../controller/admin/serviceController.js';
import { adminauth } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { service_schema } from '../../validation/admin/serviceValidation.js';
import upload from '../../middleware/upload.js';

const route = express.Router();
route
    // ✅ Create faq
    .get('/get_service', adminauth, serviceController.getServices)
    .get("/get_service_by_id/:id", adminauth, serviceController.getServiceById)
    .put("/update_service/:id", adminauth, validate(service_schema), upload.single("image"), serviceController.updateService)
    


export default route;
