import Joi from "joi";

export const addEarningSchema = Joi.object({
  vendor: Joi.string().required(),
  booking_id: Joi.string().required(),
  transaction_id: Joi.string().required(),
  total_amount: Joi.number().required(),
  admin_commission_percent: Joi.number().min(0).max(100).required(),
  admin_earning: Joi.number().required(),
  vendor_earning: Joi.number().required()
});
