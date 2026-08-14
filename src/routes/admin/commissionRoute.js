import express from 'express';
import commissionCtlr from '../../controller/admin/commissionController.js';
import { adminauth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router
    .get('/get', commissionCtlr.getCommission)
    .put('/update', adminauth, commissionCtlr.updateCommission)

export default router;