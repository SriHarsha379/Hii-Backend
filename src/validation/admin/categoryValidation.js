import Joi from "joi";

// POST → Both required
const category_create_schema = Joi.object({
    category_name: Joi.string().required(),
    category_type: Joi.number().required(),
});

// PUT → Optional fields but at least one required
const category_update_schema = Joi.object({
    category_name: Joi.string().optional(),
    category_type: Joi.number().optional(),
}).or("category_name", "category_type"); 

// Vendor-specific aliases for route usage
const vendor_category_create_schema = category_create_schema;
const vendor_category_update_schema = category_update_schema;

export { category_create_schema, category_update_schema, vendor_category_create_schema, vendor_category_update_schema };
