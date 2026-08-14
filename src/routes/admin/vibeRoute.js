import express from 'express';
import vibeController from '../../controller/admin/vibeController.js';
import { adminauth } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { vibe_schema } from '../../validation/admin/vibeValidation.js';
import upload from '../../middleware/upload.js'

const route = express.Router();
route
    // ✅ Create vibe
    .get('/get_all_vibe', adminauth, vibeController.getAllVibe)
    .post("/add_vibe", adminauth, upload.single("image"), validate(vibe_schema), vibeController.addVibe)
    .put("/update_vibe/:id", adminauth, upload.single("image"), validate(vibe_schema), vibeController.editVibe)
    .delete("/delete_vibe/:id", adminauth, vibeController.deleteVibe)

export default route;