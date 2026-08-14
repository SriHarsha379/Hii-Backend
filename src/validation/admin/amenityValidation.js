/** @format */

import Joi from "joi";

// ✅ Create Amenity Schema (all required)
const amenitySchemaCreate = Joi.object({
  amenity_name: Joi.string().trim().required().messages({
    "string.empty": "Amenity name is required",
  }),
  is_active: Joi.boolean().optional(),
}).unknown(true); // ✅ allow extra keys like "amenity_icon"


// ✅ Update Amenity Schema (all optional)
const amenitySchemaUpdate = Joi.object({
  amenity_name: Joi.string().trim().optional(),
  is_active: Joi.boolean().optional(),
});

export { amenitySchemaCreate, amenitySchemaUpdate };
