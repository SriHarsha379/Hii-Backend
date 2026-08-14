import Joi from "joi";

// Create ke liye (sab required)
const blogSchemaCreate = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required().max(1000),
    author_name: Joi.string().required(),

});
// Update ke liye (sab optional)
const blogSchemaUpdate = Joi.object({
    title: Joi.string(),
    description: Joi.string().max(1000),
    author_name: Joi.string().optional(),
});

export { blogSchemaCreate, blogSchemaUpdate };
