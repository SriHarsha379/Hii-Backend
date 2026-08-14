import Joi from "joi";

export const ticketSchemaCreate = Joi.object({
  event_id: Joi.string().required(),

  ticket_type: Joi.string()
    .valid("VIP", "Standard", "General")
    .required(),

  title: Joi.string().trim().required(),

  ticket_price: Joi.number().required(),

  old_price: Joi.number().optional().allow(null),

  badge_labels: Joi.array().items(Joi.string()).optional(),

  perks: Joi.array()
    .items(
      Joi.object({
        icon: Joi.string().optional().allow(null),
        label: Joi.string().required()
      })
    )
    .optional(),

  ui_theme: Joi.object({
    bg_color: Joi.string().optional().allow(null),
    text_color: Joi.string().optional().allow(null),
    button_color: Joi.string().optional().allow(null),
  }).optional(),

  validity: Joi.string().required(),

  description: Joi.string().optional(),

  is_active: Joi.boolean().optional(),
});

export const ticketSchemaUpdate = Joi.object({
  event_id: Joi.string().optional(),

  ticket_type: Joi.string().valid("VIP", "Standard", "General").optional(),

  title: Joi.string().trim().optional(),

  ticket_price: Joi.number().optional(),

  old_price: Joi.number().optional().allow(null),

  badge_labels: Joi.array().items(Joi.string()).optional(),

  perks: Joi.array()
    .items(
      Joi.object({
        icon: Joi.string().optional().allow(null),
        label: Joi.string().required()
      })
    )
    .optional(),

  ui_theme: Joi.object({
    bg_color: Joi.string().optional().allow(null),
    text_color: Joi.string().optional().allow(null),
    button_color: Joi.string().optional().allow(null),
  }).optional(),

  validity: Joi.string().optional(),

  description: Joi.string().optional(),

  is_active: Joi.boolean().optional(),
});
