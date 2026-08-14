import Joi from "joi";

const genre_schema = Joi.object({
    name: Joi.string().trim().required().messages({
        'string.empty': 'Genre name is required',
        'any.required': 'Genre name is required'
    }),
    description: Joi.string().trim().optional().allow(''),
    category: Joi.string().trim().required().messages({
        'string.empty': 'Category is required',
        'any.required': 'Category is required'
    }),
    is_top_pick: Joi.boolean().optional()
});

const genre_update_schema = Joi.object({
    name: Joi.string().trim().optional(),
    description: Joi.string().trim().optional().allow(''),
    category: Joi.string().trim().optional(),
    is_top_pick: Joi.boolean().optional()
});

export { genre_schema, genre_update_schema };