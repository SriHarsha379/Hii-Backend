import express from 'express';
import interestController from '../../controller/admin/interestController.js';
import { adminauth } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { interest_schema } from '../../validation/admin/interestValidation.js';

const route = express.Router();

route
    .post("/create_interest", adminauth, validate(interest_schema), interestController.createInterest)
    .get("/get_interest", adminauth, interestController.getInterest)
    .delete("/delete_interest/:id", adminauth, interestController.deleteInterest)
    .put("/update_interest/:id", adminauth, validate(interest_schema), interestController.updateInterest);

export default route;
