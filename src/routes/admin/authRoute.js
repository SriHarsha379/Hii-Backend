import express from 'express';
import authController from '../../controller/app/authController.js';
import { validate } from '../../middleware/validate.js';
import { signupStepOneSchema, signupStepTwoSchema, signupStepThreeSchema } from "../../validation/app/appValidation.js";
import upload from '../../middleware/upload.js';
import { appAuth } from '../../middleware/authMiddleware.js';


const route = express.Router();
route
    .post("/signup_step_one", upload.single("profile_image"), validate(signupStepOneSchema), authController.signupStepOne)
    .post("/otp_verify", authController.otpVerify)
    .post("/resend_otp", authController.resendOtp)
    .get("/popular_cities", authController.getTopCities)
    .post("/signup_step_two", appAuth, validate(signupStepTwoSchema), authController.signupStepTwo)
    .get("/music-genres", appAuth, authController.getMusicGenres)
    .get("/event-preferences", appAuth, authController.getEventPreferences)
    .get("/get_vibe_checks", appAuth, authController.getVibeCheckQuestions)
    .post("/signup_step_three", appAuth, upload.fields([
        { name: "images", maxCount: 9 },
        { name: "videos", maxCount: 9 },
        { name: "thumbnails", maxCount: 9 }
    ]), validate(signupStepThreeSchema), authController.signupStepThree)

    .post("/resend_email_otp", authController.resendEmailOtp)
    .post("/verify_email_otp", authController.verifyEmailOtp)
    .post("/login", authController.login)
    .post('/forgot_password', authController.forgotPassword)
    .post('/resend_forgot_otp', authController.resendForgotOtp)
    .post('/verify_forgot_otp', authController.verifyForgotOtp)
    .post('/confirm_password', appAuth, authController.changePassword)
    .post('/social_login', authController.socialLogin)
    .post('/logout', appAuth, authController.logout)
    .post("/check_phone_number", authController.checkMobileNumber)

export default route;