import express from 'express';
import contentController from '../../controller/admin/contentController.js';
import { adminauth } from '../../middleware/authMiddleware.js';


const route = express.Router();
route
    .get("/get_All_Content", adminauth, contentController.getAllContent)
    .put("/update_Content_By_Type", adminauth, contentController.updateContentByType)
    .post("/create_Content", adminauth, contentController.createContent);




export default route;
