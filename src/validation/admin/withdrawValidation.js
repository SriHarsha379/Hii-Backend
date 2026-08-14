import Joi from "joi";

export const requestWithdrawSchema = Joi.object({
  request_for: Joi.string().valid("vendor", "venue", "event").required(),

  vendor_id: Joi.string().optional().allow(null),
  venue_id: Joi.string().optional().allow(null),
  event_id: Joi.string().optional().allow(null),

  requested_amount: Joi.number().positive().required(),

  bank: Joi.object({
    bank_name: Joi.string().required(),
    account_holder_name: Joi.string().required(),
    account_type: Joi.string().required(),
    iban: Joi.string().required(),
    bic: Joi.string().required()
  }).required()
});

export const approveWithdrawSchema = Joi.object({
  transaction_id: Joi.string().required()
});

export const rejectWithdrawSchema = Joi.object({
  reject_reason: Joi.string().required().min(10)
});
