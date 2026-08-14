import express from 'express';
import cityController from '../../controller/admin/cityController.js';
import { adminauth, allowAdminOrVendor } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { city_schema } from '../../validation/admin/cityValidation.js';
import upload from "../../middleware/upload.js"

const route = express.Router();

route
  .get('/get_city', adminauth, cityController.getCity)
  .get('/get_all_cities', allowAdminOrVendor, cityController.getCity)
  .post('/create_city', adminauth, upload.single("city_image"), validate(city_schema), cityController.createCity)
  .put('/update_city/:id', adminauth, upload.single("city_image"), cityController.updateCity)
  .delete('/delete_city/:id', adminauth, cityController.deleteCity);

export default route;
