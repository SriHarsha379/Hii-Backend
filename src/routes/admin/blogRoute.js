import express from 'express';
import blogController from '../../controller/admin/blogController.js';
import { adminauth } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { blogSchemaCreate, blogSchemaUpdate } from '../../validation/admin/blogValidation.js';
const route = express.Router();
route
    .post(
        '/create_blog',
        adminauth,
        upload.single("image"),       // 1. multer pehle chalega
        validate(blogSchemaCreate),   // 2. ab Joi ko parsed body milegi
        blogController.addBlog        // 3. controller chalega
    )
    .get("/get_all_blog", adminauth, blogController.getAllBlogs)
    .get("/get_blog_by_id/:id", adminauth, blogController.getBlogById)
    .put("/edit_blog/:id", adminauth, validate(blogSchemaUpdate), upload.single("image"), blogController.updateBlog)
    .delete("/delete_blog/:id", adminauth, blogController.deleteBlog)


export default route;

