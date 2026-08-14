import express from 'express';
import vibeCheckController from '../../controller/admin/vibeCheckController.js';
import { adminauth } from '../../middleware/authMiddleware.js';


const route = express.Router(); 

route
    .get('/get_all', adminauth, vibeCheckController.getVibeCheckQuestions)
    .post('/create', adminauth,  vibeCheckController.createVibeCheckQuestion)
    .get('/get_by_id/:id', adminauth, vibeCheckController.getVibeCheckQuestionById)
    .put('/update/:id', adminauth, vibeCheckController.updateVibeCheckQuestion)
    .delete('/delete/:id', adminauth, vibeCheckController.deleteVibeCheckQuestion)
    .put('/toggle_status/:id', adminauth, vibeCheckController.toggleActiveStatus);

export default route;