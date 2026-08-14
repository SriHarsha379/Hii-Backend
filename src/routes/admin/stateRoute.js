import express from 'express';
import stateController from '../../controller/admin/stateController.js';
import { adminauth,allowAdminOrVendor } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { state_schema } from '../../validation/admin/stateValidation.js';

const route = express.Router();

route
  .get('/get_state', adminauth, stateController.getStates)
  .get('/get_all_states', allowAdminOrVendor, stateController.getStates)
  .post('/create_state', adminauth, validate(state_schema), stateController.createState)
  .put('/update_state/:id', adminauth, validate(state_schema), stateController.updateState)
  .delete('/delete_state/:id', adminauth, stateController.deleteState); // fixed spelling

export default route;
