import express from 'express';
import broadcastController from '../../controller/admin/broadcastController.js';
import { validate } from '../../middleware/validate.js';
import { broadcastSchema } from '../../validation/admin/broadcastValidation.js';
import { adminauth } from '../../middleware/authMiddleware.js';


const route = express.Router();
route
    .get("/get_all_user", adminauth, broadcastController.getAllUsers)
    .post("/send_user_notification", adminauth, validate(broadcastSchema), broadcastController.sendBroadcastMessageAllUser);


export default route;

