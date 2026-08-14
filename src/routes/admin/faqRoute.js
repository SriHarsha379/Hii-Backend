import express from 'express';
import faqController from '../../controller/admin/faqController.js';
import { adminauth, allowAdminOrVendor } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { faq_schema } from '../../validation/admin/faqValidation.js';

const route = express.Router();

route
    // GET → get all FAQs (ALLOW both admin AND vendor)
    .get('/get_faq', allowAdminOrVendor, faqController.getFaqs)
    
    // POST → create FAQ (admin only)
    .post('/create_faq', allowAdminOrVendor, validate(faq_schema), faqController.createFaq)
    
    // GET → get FAQ by ID (ALLOW both admin AND vendor)
    .get('/get_faq_by_id/:id', allowAdminOrVendor, faqController.getFaqById)
    
    // PUT → update FAQ (admin only)
    .put('/update_faq/:id', allowAdminOrVendor, validate(faq_schema), faqController.updateFaq)
    
    // DELETE → delete FAQ (admin only)
    .delete('/delete_faq/:id', allowAdminOrVendor, faqController.deleteFaq);

export default route;