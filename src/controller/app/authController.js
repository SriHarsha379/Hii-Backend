import { User, Genre, Event, Category, City, VibeCheckQuestion } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import generateToken from "../../utility/generateToken.js";
import utility from "../../utility/sendmail.js"
import sendNotification from "../../utility/notification.js";
import mailer from "../../utility/sendmail.js"
import admin from "../../config/firebase_config.js"

const generateUniqueReferralCode = async () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode;
    let isUnique = false;

    while (!isUnique) {
        referralCode = "";
        for (let i = 0; i < 8; i++) {
            referralCode += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }

        const existingUser = await User.findOne({
            my_referral_code: referralCode
        });

        if (!existingUser) {
            isUnique = true;
        }
    }

    return referralCode;
};


const signupStepOne = async (req, res) => {
    try {
        const {
            phone_number,
            first_name,
            last_name,
            name,
            username,
            email,
            dob,
            gender,
            city_id,
            referral_code,
            player_id,
            device_type,
            password,
            login_type,
            height
        } = req.body;

        if (!phone_number || !username || !email || !dob || !gender || !city_id) {
            return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
        }

        const ageCheck = helper.validateMinimumAge(dob, 18);
        if (!ageCheck.valid) {
            return apiResponse.badRequest(
                res,
                ageCheck.reason === "underage"
                    ? messages.AGE_RESTRICTION
                    : messages.INVALID_DOB
            );
        }

        const profileImage = req.file?.filename || null;
        if (!profileImage) {
            return apiResponse.badRequest(res, messages.PROFILE_REQ);
        }

        const cleanPhone = String(phone_number).trim();
        const cleanUsername = String(username).toLowerCase().trim();
        const cleanEmail = String(email).toLowerCase().trim();

        /* =====================================================
           🔹 SOCIAL FLOW (UPDATE EXISTING USER)
        ===================================================== */
        if (login_type === "google" || login_type === "apple") {

            const existingSocialUser = await User.findOne({
                email: cleanEmail,
                login_type: login_type,
                is_deleted: false
            });

            if (!existingSocialUser) {
                return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
            }

            /* ---------- DUPLICATE CHECKS ---------- */

            const usernameExists = await User.findOne({
                username: cleanUsername,
                _id: { $ne: existingSocialUser._id },
                is_deleted: false
            });

            if (usernameExists) {
                return apiResponse.badRequest(res, messages.USERNAME_ALREDY_EXISTS);
            }

            const phoneExists = await User.findOne({
                phone_number: cleanPhone,
                _id: { $ne: existingSocialUser._id },
                is_deleted: false
            });

            if (phoneExists) {
                return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
            }

            /* ---------- STATIC OTP ---------- */
            const otpCode = "1234";
            const otpExpiry = new Date(Date.now() + 30 * 60 * 1000);

            /* ---------- UPDATE USER ---------- */

            existingSocialUser.phone_number = cleanPhone;
            existingSocialUser.username = cleanUsername;
            existingSocialUser.first_name = first_name;
            existingSocialUser.last_name = last_name;
            existingSocialUser.name = `${first_name} ${last_name}`;
            existingSocialUser.birthdate = dob;
            existingSocialUser.gender = gender;
            existingSocialUser.city_id = city_id;
            existingSocialUser.profile_image = profileImage;
            existingSocialUser.referral_code = referral_code || existingSocialUser.referral_code;

            existingSocialUser.otp = {
                code: otpCode,
                expires_at: otpExpiry
            };

            existingSocialUser.signup_step = 1;
            existingSocialUser.is_profile_completed = false;
            existingSocialUser.is_verified = false;

            existingSocialUser.device_type = device_type || existingSocialUser.device_type;
            existingSocialUser.player_id = player_id || existingSocialUser.player_id;

            await existingSocialUser.save();

            const userData = await helper.getUserData(existingSocialUser._id);
            userData.signup_step = 1;
            userData.is_new_user = true;
            userData.otp = otpCode; // 👈 static OTP in response

            return apiResponse.ok(res, userData, messages.MSG_OTP_SENT);
        }

        /* =====================================================
           🔹 NORMAL SIGNUP FLOW
        ===================================================== */

        // Password mandatory in normal flow
        if (!password) {
            return apiResponse.badRequest(res, "Password is required");
        }

        const existingPhoneUser = await User.findOne({
            phone_number: cleanPhone,
            is_deleted: false
        });

        const deletedPhoneUser = await User.findOne({
            phone_number: cleanPhone,
            is_deleted: true
        });

        if (existingPhoneUser && existingPhoneUser.is_verified) {
            return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
        }

        // if (deletedPhoneUser) {
        //     return apiResponse.badRequest(res, "Phone number belongs to a deleted account. Please use a different number.");
        // }

        const usernameExists = await User.findOne({
            username: cleanUsername,
            is_deleted: false
        });

        if (usernameExists && usernameExists.is_verified) {
            return apiResponse.badRequest(res, messages.USERNAME_ALREDY_EXISTS);
        }

        const emailExists = await User.findOne({
            email: cleanEmail,
            is_deleted: false
        });

        const deletedEmailUser = await User.findOne({
            email: cleanEmail,
            is_deleted: true
        });

        if (emailExists && emailExists.is_verified) {
            return apiResponse.badRequest(res, messages.EMAIL_ALREADY_EXISTS);
        }

        // if (deletedEmailUser) {
        //     return apiResponse.badRequest(res, "Email belongs to a deleted account. Please use a different email.");
        // }

        const otpCode = "1234";
        const otpExpiry = new Date(Date.now() + 30 * 60 * 1000);

        const user = await User.create({
            phone_number: cleanPhone,
            username: cleanUsername,
            email: cleanEmail,
            password,
            profile_image: profileImage,
            first_name,
            last_name,
            name: `${first_name} ${last_name || ""}`.trim(),
            birthdate: dob,
            gender,
            height,
            city_id,
            referral_code: referral_code || null,
            player_id: player_id || null,
            device_type: device_type || null,
            otp: {
                code: otpCode,
                expires_at: otpExpiry
            },
            signup_step: 1,
            is_profile_completed: false,
            is_verified: false
        });

        const userData = await helper.getUserData(user._id);
        userData.signup_step = 1;
        userData.is_new_user = true;
        userData.otp = otpCode;

        return apiResponse.ok(res, userData, messages.MSG_OTP_SENT);

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

// ---------- OTP VERIFY (SINGLE API)
const otpVerify = async (req, res) => {
    try {
        const { phone_number, firebase_id_token } = req.body;
        if (!phone_number || !firebase_id_token) {
            return apiResponse.badRequest(
                res,
                messages.ALL_FIELDS_REQUIRED
            );
        }
        const cleanPhoneNumber = String(phone_number).trim();
        /* ================= VERIFY FIREBASE ID TOKEN ================= */
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(firebase_id_token);
        } catch (firebaseError) {
            console.error("FIREBASE VERIFY ERROR:", firebaseError.code, firebaseError.message);
            // TEMP DEBUG — remove after diagnosing
            return apiResponse.badRequest(res, `DEBUG: Firebase verify failed - ${firebaseError.code} - ${firebaseError.message}`);
        }
        // Ensure the verified phone number matches the one being signed up
        const verifiedFirebasePhone = decodedToken.phone_number || '';
        const normalizedVerified = verifiedFirebasePhone.replace(/\D/g, '').slice(-10);
        const normalizedRequested = cleanPhoneNumber.replace(/\D/g, '').slice(-10);
        console.log("PHONE CHECK:", { verifiedFirebasePhone, normalizedVerified, normalizedRequested });
        if (!normalizedVerified || normalizedVerified !== normalizedRequested) {
            // TEMP DEBUG — remove after diagnosing
            return apiResponse.badRequest(res, `DEBUG: Phone mismatch - verified="${verifiedFirebasePhone}" requested="${cleanPhoneNumber}"`);
        }
        /* ================= FIND USER ================= */
        const user = await User.findOne({
            phone_number: cleanPhoneNumber,
            is_deleted: false
        });
        if (!user)
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
        /* ================= GENERATE REFERRAL CODE ================= */
        if (!user.my_referral_code) {
            const referralCode = await generateUniqueReferralCode();
            user.my_referral_code = referralCode;
        }
        /* ================= UPDATE USER ================= */
        user.is_verified = true;
        user.otp = null;
        await user.save();
        /* ================= TOKEN ================= */
        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);
        userData.token = token;
        userData.is_new_user = !user.is_profile_completed;
        return apiResponse.ok(
            res,
            userData,
            messages.OTP_VERIFIED
        );
    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ------------------- RESEND OTP -------------------
const resendOtp = async (req, res) => {
    try {
        const { phone_number } = req.body

        const cleanPhoneNumber = String(phone_number).trim()

        const user = await User.findOne({
            phone_number: cleanPhoneNumber,
            is_deleted: false
        })

        if (!user) return apiResponse.badRequest(res, messages.USER_NOT_FOUND)

        const otp = '1234'
        const expires_at = new Date(Date.now() + 60 * 60 * 1000)

        await User.updateOne(
            { phone_number: cleanPhoneNumber },
            { $set: { otp: { code: otp, expires_at }, updatedAt: Date.now() } }
        )

        return apiResponse.ok(res, { otp }, messages.MSG_OTP_SENT)
    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
    }
}


// ---------- GET ALL CITIES (USING POPULATE)
const getTopCities = async (req, res) => {
    try {
        const cities = await City.find(
            {
                is_active: true,
                is_deleted: false
            },
            {
                city_name: 1,
                latitude: 1,
                longitude: 1,
                city_image: 1,
                is_preferred: 1
            }
        )
            .populate("state_id", "_id") // populate used (safe, optional fields)
            // Preferred cities (e.g. Bangalore, Delhi, Goa, Mumbai) first,
            // then alphabetical within each group - this endpoint still
            // returns every active city (used for full browse/search too,
            // not just the shortlist), is_preferred is just a display hint.
            .sort({ is_preferred: -1, city_name: 1 })
            .lean();

        const response = cities.map(city => ({
            _id: city._id,
            city_name: city.city_name,
            latitude: city.latitude,
            longitude: city.longitude,
            city_image: city.city_image,
            is_preferred: city.is_preferred || false,
            user_count: 0 // SAME KEY as Top Cities API
        }));

        return apiResponse.ok(res, response, messages.DATA_FOUND);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ---------- SIGNUP – STEP 2
const signupStepTwo = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            preferred_cities,
            // These were validated by signupStepTwoSchema but never actually
            // read here — meaning user.latitude/longitude/radius (the fields
            // manageController's distance filtering actually uses, as
            // opposed to preferred_cities which only feeds the "switch
            // city" UI list) were never set at signup, for ANY new user.
            // A fresh account fell back to a bare 50km default with no
            // real center point until they separately used the location
            // filter after onboarding.
            latitude,
            longitude,
            radius,
            bio,
            instagram_account,
            spotify_account,
            snapchat_account,
            hobbies
        } = req.body;

        const user = await User.findOne({
            _id: userId,
            is_deleted: false
        });

        if (!user)
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        /* ================= UPDATE STEP 2 DATA ================= */

        // preferred cities (array of objects)
        if (preferred_cities !== undefined) {
            user.preferred_cities = preferred_cities;
        }

        // Real feed-filtering location — "All Cities" is represented by the
        // app sending a large radius here rather than a special flag, so no
        // schema change was needed on this side either.
        if (latitude !== undefined) user.latitude = latitude;
        if (longitude !== undefined) user.longitude = longitude;
        if (radius !== undefined) user.radius = radius;


        // optional fields
        if (bio !== undefined) user.bio = bio;
        if (instagram_account !== undefined)
            user.instagram_account = instagram_account;
        if (spotify_account !== undefined)
            user.spotify_account = spotify_account;
        if (snapchat_account !== undefined)
            user.snapchat_account = snapchat_account;

        // hobbies (optional array of strings)
        if (hobbies !== undefined) {
            user.hobbies = hobbies;
        }

        user.signup_step = 2;

        await user.save();

        /* ================= TOKEN ================= */
        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);

        userData.token = token;

        return apiResponse.ok(
            res,
            userData,
            messages.DATA_ADDED
        );

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ---------- GET MUSIC GENRES
const getMusicGenres = async (req, res) => {
    try {
        const genres = await Genre.find({
            is_active: true,
            is_deleted: false
        })
            .select("_id name image category")
            .sort({ name: 1 });

        return apiResponse.ok(
            res,
            genres,
            messages.DATA_FOUND
        );
    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ---------- GET EVENT PREFERENCES
const getEventPreferences = async (req, res) => {
    try {
        const events = await Category.find({
            is_active: true,
            is_deleted: false,
            category_type: 1
        })
            .select("_id category_name")
            .sort({ category_name: 1 });

        return apiResponse.ok(
            res,
            events,
            messages.DATA_FOUND
        );
    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ---------- GET VIBE CHECK QUESTIONS
const getVibeCheckQuestions = async (req, res) => {
    try {
        const questions = await VibeCheckQuestion.find(
            {
                is_active: true,
                is_deleted: false
            },
            {
                question: 1,
                description: 1
            }
        )
            .sort({ createdAt: -1 }) // 👈 latest first
            .lean();

        return apiResponse.ok(
            res,
            questions,
            messages.DATA_FOUND
        );

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ---------- SIGNUP – STEP 3
const signupStepThree = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.userId, is_deleted: false });
        if (!user) return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        const {
            music_genre,
            custom_music_genres,
            event_preferences,
            custom_event_preferences,
            vibes,
            custom_vibes,
            vibe_checks,
            sexuality,
            interested_in,
            pronouns,
            another_email
        } = req.body;


        // ✅ Fix for FormData vibe_checks
        let parsedVibeChecks = [];
        if (vibe_checks && typeof vibe_checks === "string") {
            try {
                parsedVibeChecks = JSON.parse(vibe_checks);
            } catch (e) {
                parsedVibeChecks = [];
            }
        } else if (Array.isArray(vibe_checks)) {
            parsedVibeChecks = vibe_checks;
        }

        // 👇 USE PARSED VALUE
        const vibeChecksArr = parsedVibeChecks;

        /* ================= HELPERS ================= */

        const toArray = (v) => {
            if (!v) return [];
            if (Array.isArray(v)) return v;
            if (typeof v === "string") {
                return v
                    .split(",")
                    .map(i => i.trim())
                    .filter(Boolean);
            }
            return [];
        };

        /* ================= PARSE VALUES ================= */

        const musicGenreArr = toArray(music_genre);
        const customMusicArr = toArray(custom_music_genres);

        const eventPrefArr = toArray(event_preferences);
        const customEventArr = toArray(custom_event_preferences);

        const customVibesArr = toArray(custom_vibes);

        /* ================= VALIDATIONS ================= */

        if (musicGenreArr.length === 0 && customMusicArr.length === 0) {
            return apiResponse.badRequest(
                res,
                "Please select at least one music genre or add custom music genre"
            );
        }

        if (eventPrefArr.length === 0 && customEventArr.length === 0) {
            return apiResponse.badRequest(
                res,
                "Please select at least one event preference or add custom event preference"
            );
        }

        // The curated vibe picker was removed, and the VibePreference
        // screen (the free-text replacement) is currently skipped in the
        // Flutter signup flow - so vibes are optional for now. Re-add
        // this check once that screen is back in the flow, otherwise no
        // one can complete signup with an empty custom_vibes array.
        // if (customVibesArr.length === 0) {
        //     return apiResponse.badRequest(
        //         res,
        //         "Please add at least one vibe"
        //     );
        // }

        /* ================= SAVE STEP 3 DATA ================= */

        user.music_genre = musicGenreArr;
        user.custom_music_genres = customMusicArr;

        user.event_preferences = eventPrefArr;
        user.custom_event_preferences = customEventArr;

        user.custom_vibes = customVibesArr;

        // ✅ save structured vibe checks (ONLY id + answer)
        user.vibe_checks = vibeChecksArr.map(vc => ({
            question_id: vc.question_id || null,
            answer: vc.answer || null
        }));

        user.sexuality = sexuality;
        user.interested_in = interested_in;
        user.pronouns = pronouns || null;

        /* ================= HANDLE GALLERY ================= */

        const images = req.files?.images || [];
        const videos = req.files?.videos || [];
        const thumbnails = req.files?.thumbnails || [];

        if (videos.length > thumbnails.length) {
            return apiResponse.badRequest(
                res,
                "Each video must have a corresponding thumbnail"
            );
        }

        if (images.length + videos.length > 9) {
            return apiResponse.badRequest(
                res,
                "Maximum 9 files allowed in total"
            );
        }

        const gallery = [];

        for (const img of images) {
            gallery.push({ url: img.filename, type: "image" });
        }

        for (let i = 0; i < videos.length; i++) {
            gallery.push({
                url: videos[i].filename,
                type: "video",
                thumbnail_url: thumbnails[i]?.filename || null
            });
        }

        user.user_gallery = gallery;
        user.signup_step = 3;

        /* ================= OPTIONAL EMAIL ================= */

        if (another_email) {

            const cleanEmail = String(another_email).toLowerCase().trim();

            const emailExists = await User.findOne({
                another_email: cleanEmail,
                _id: { $ne: user._id },
                is_deleted: false
            });

            if (emailExists) {
                return apiResponse.badRequest(res, messages.EMAIL_ALREADY_EXISTS);
            }

            const emailOtp = Math.floor(1000 + Math.random() * 9000).toString();

            // ✅ SAVE EMAIL + OTP FIRST
            user.another_email = cleanEmail;
            user.email_otp = {
                code: emailOtp,
                expires_at: new Date(Date.now() + 30 * 60 * 1000)
            };
            user.is_profile_completed = false;
            user.signup_step = 3;

            await user.save();   // 🔥 SAVE BEFORE SENDING MAIL

            /* ================= SEND EMAIL ================= */

            const postData = {
                app_name: process.env.APP_NAME || "YourApp",
                app_logo: process.env.APP_LOGO || "https://yourdomain.com/logo.png",
                name: user.full_name || "User",
                otp: emailOtp
            };

            const subject = `${postData.app_name} - Email Verification OTP`;

            const mailBody = mailer.mailBodyEmailOtp(postData);

            await mailer.sendMail(cleanEmail, subject, mailBody);

            return apiResponse.ok(
                res,
                { email: cleanEmail },
                messages.MSG_OTP_SENT
            );
        }

        /* ================= FINALIZE ================= */

        user.is_profile_completed = true;
        user.is_another_email_verify = false;
        await user.save();

        if (user.player_id) {
            await sendNotification(
                "welcome",
                user.player_id,
                { senderId: user._id, other_user_id: user._id, action: "welcome" },
                0
            );
        }

        // Record the 80% baseline silently — the "welcome" notification
        // above already covers this milestone, so we don't want a
        // duplicate "profile completion" ping right after signup.
        // Fire-and-forget so it can't slow down or break this response.
        if (typeof helper.checkAndNotifyProfileCompletion === 'function') {
            helper.checkAndNotifyProfileCompletion(user._id, { silent: true }).catch(() => {});
        }

        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);
        userData.token = token;

        return apiResponse.ok(res, userData, messages.SIGNUP_SUCCESS);

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};


// ---------- RESEND EMAIL OTP
const resendEmailOtp = async (req, res) => {
    try {
        const { another_email } = req.body;

        if (!another_email) {
            return apiResponse.badRequest(res, "Another email is required");
        }

        const cleanEmail = String(another_email).toLowerCase().trim();

        const user = await User.findOne({
            another_email: cleanEmail,
            is_deleted: false
        });

        if (!user) {
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
        }

        // 🔐 Generate New OTP
        const newOtp = Math.floor(1000 + Math.random() * 9000).toString();

        user.email_otp = {
            code: newOtp,
            expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 mins
        };

        await user.save();

        /* ================= SEND EMAIL ================= */

        const postData = {
            app_name: process.env.APP_NAME || "YourApp",
            app_logo: process.env.APP_LOGO || "https://yourdomain.com/logo.png",
            name: user.full_name || "User",
            otp: newOtp
        };

        const subject = `${postData.app_name} - Email Verification OTP`;

        const mailBody = mailer.mailBodyEmailOtp(postData);

        const mailResponse = await mailer.sendMail(cleanEmail, subject, mailBody);

        if (!mailResponse.success) {
            return apiResponse.serverError(
                res,
                "Failed to send OTP email",
                mailResponse.error
            );
        }

        return apiResponse.ok(
            res,
            { email: cleanEmail },
            messages.MSG_OTP_SENT
        );

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ---------- EMAIL OTP VERIFY
const verifyEmailOtp = async (req, res) => {
    try {
        const { another_email, otp } = req.body;

        const cleanEmail = String(another_email).toLowerCase().trim();

        const user = await User.findOne({ another_email: cleanEmail, is_deleted: false });
        if (!user) return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        if (!user.email_otp || user.email_otp.code !== otp)
            return apiResponse.badRequest(res, messages.WRONG_OTP);

        if (user.email_otp.expires_at < new Date())
            return apiResponse.badRequest(res, messages.OTP_EXPIRED);

        user.is_another_email_verify = true;
        user.email_otp = null;
        user.is_profile_completed = true;
        await user.save();

        // 🔔 WELCOME NOTIFICATION
        if (user.player_id) {
            await sendNotification(
                "welcome",
                user.player_id,
                {
                    senderId: user._id,
                    other_user_id: user._id,
                    action: "welcome"
                },
                0
            );
        }

        // Record the 80% baseline silently — same reasoning as
        // signupStepThree: "welcome" already covers this milestone, so
        // avoid a duplicate "profile completion" notification.
        if (typeof helper.checkAndNotifyProfileCompletion === 'function') {
            helper.checkAndNotifyProfileCompletion(user._id, { silent: true }).catch(() => {});
        }

        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);
        userData.token = token;

        return apiResponse.ok(res, userData, messages.SIGNUP_SUCCESS);
    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


// ---------- LOGIN (EMAIL OR USERNAME + PASSWORD)
const login = async (req, res) => {
    try {
        const { email, password, device_type, player_id } = req.body;

        if (!email || !password || !device_type || !player_id) {
            return apiResponse.badRequest(
                res,
                messages.ALL_FIELDS_REQUIRED
            );
        }

        const loginValue = String(email).toLowerCase().trim();

        /* ================= FIND USER ================= */
        const user = await User.findOne({
            is_deleted: false,
            $or: [
                { email: loginValue },
                { username: loginValue },
                { phone_number: loginValue }
            ]
        });

        if (!user) {
            return apiResponse.badRequest(
                res,
                messages.USER_NOT_FOUND
            );
        }

        /* ================= PASSWORD CHECK ================= */
        const isPasswordMatch = await helper.comparePassword(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return apiResponse.badRequest(
                res,
                messages.WRONG_PASS
            );
        }

        /* ================= UPDATE DEVICE INFO ================= */
        user.device_type = device_type;
        user.player_id = player_id;
        await user.save();

        /* =====================================================
           CHECK ANOTHER EMAIL VERIFICATION
        ====================================================== */

        if (user.another_email && !user.is_another_email_verify) {

            const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

            user.email_otp.code = otpCode;
            user.email_otp.expires_at = otpExpiry;
            user.is_another_email_otp = true;
            await user.save();

            /* ================= SEND EMAIL ================= */
            const mailBody = utility.mailBodyEmailOtp({
                app_name: process.env.APP_NAME,
                app_logo: process.env.APP_LOGO,
                name: user.name || user.username || "User",
                otp: otpCode
            });

            await utility.sendMail(
                user.another_email,
                "Verify Your Email",
                mailBody
            );

            /* ================= GET FULL USER DATA ================= */
            const token = generateToken.generateToken(user._id);
            const userData = await helper.getUserData(user._id);

            userData.token = token;
            userData.device_type = device_type;
            userData.player_id = player_id;
            userData.is_new_user = !user.is_profile_completed;

            userData.another_email = user.another_email;

            return apiResponse.ok(
                res,
                userData,
                messages.MSG_OTP_SENT
            );
        }

        /* ================= TOKEN ================= */
        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);

        userData.device_type = device_type;
        userData.player_id = player_id;
        userData.token = token;
        userData.is_new_user = !user.is_profile_completed;

        return apiResponse.ok(
            res,
            userData,
            messages.LOGIN_SUCCESSFUL
        );

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};


// ---------- FORGOT PASSWORD (SEND OTP)
const forgotPassword = async (req, res) => {
    try {
        const { email, phone_number } = req.body;

        if (!email && !phone_number) {
            return apiResponse.badRequest(res, messages.ALL_FIELDS_REQUIRED);
        }

        const query = email
            ? { email: String(email).toLowerCase().trim(), is_deleted: false }
            : { phone_number: String(phone_number).trim(), is_deleted: false };

        const user = await User.findOne(query);

        if (!user)
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // real random 4-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        user.forget_otp = otpCode;
        user.is_forget_otp = true;
        user.expiry_time_otp = otpExpiry;
        await user.save();

        /* ================= SEND OTP ON EMAIL ================= */
        if (email) {
            const mailBody = utility.mailBodyEmailOtp({
                app_name: process.env.APP_NAME,
                app_logo: process.env.APP_LOGO,
                name: user.name || user.username || "User",
                otp: otpCode
            });

            await utility.sendMail(
                user.email,
                "Forgot Password - OTP Verification",
                mailBody
            );
        }

        // (Optional) If phone_number → later integrate SMS here

        return apiResponse.ok(
            res,
            {
                type: email ? "email" : "phone"
            },
            messages.MSG_OTP_SENT
        );

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


// ---------- VERIFY FORGOT OTP
const verifyForgotOtp = async (req, res) => {
    try {
        const { email, phone_number, otp } = req.body;

        if ((!email && !phone_number) || !otp) {
            return apiResponse.badRequest(res, messages.ALL_FIELDS_REQUIRED);
        }

        const query = email
            ? { email: String(email).toLowerCase().trim(), is_deleted: false }
            : { phone_number: String(phone_number).trim(), is_deleted: false };

        const user = await User.findOne(query);

        if (!user)
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        if (!user.is_forget_otp)
            return apiResponse.badRequest(res, messages.OTP_NOT_REQUESTED);

        if (user.forget_otp !== otp)
            return apiResponse.badRequest(res, messages.WRONG_OTP);

        if (user.expiry_time_otp < new Date())
            return apiResponse.badRequest(res, messages.OTP_EXPIRED);

        // OPTIONAL: Clear OTP after verification
        user.forget_otp = null;
        user.is_forget_otp = false;
        user.expiry_time_otp = null;
        await user.save();

        /* ================= TOKEN ================= */
        const token = generateToken.generateToken(user._id);
        const userData = await helper.getUserData(user._id);

        userData.token = token;

        return apiResponse.ok(res, userData, messages.OTP_VERIFIED);

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


// ---------- RESEND FORGOT OTP
const resendForgotOtp = async (req, res) => {
    try {
        const { email, phone_number } = req.body;

        if (!email && !phone_number) {
            return apiResponse.badRequest(res, messages.ALL_FIELDS_REQUIRED);
        }

        const query = email
            ? { email: String(email).toLowerCase().trim(), is_deleted: false }
            : { phone_number: String(phone_number).trim(), is_deleted: false };

        const user = await User.findOne(query);

        if (!user)
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);

        const otpCode = "5678"; // STATIC RESEND OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.forget_otp = otpCode;
        user.is_forget_otp = true;
        user.expiry_time_otp = otpExpiry;
        await user.save();

        /* ================= SEND EMAIL ================= */
        if (email) {
            const mailBody = utility.mailBodyEmailOtp({
                app_name: process.env.APP_NAME,
                app_logo: process.env.APP_LOGO,
                name: user.name || user.username || "User",
                otp: otpCode
            });

            await utility.sendMail(
                user.email,
                "Resend OTP - Forgot Password",
                mailBody
            );
        }

        return apiResponse.ok(
            res,
            {
                type: email ? "email" : "phone",
                otp: otpCode
            },
            messages.MSG_OTP_SENT
        );

    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


// ---------- CHANGE PASSWORD (FORGOT PASSWORD - TOKEN BASED)
const changePassword = async (req, res) => {
    try {
        const { new_password } = req.body;
        const userId = req.userId; // coming from token

        if (!new_password) {
            return apiResponse.badRequest(
                res,
                messages.PASSWORD_REQUIRED
            );
        }

        /* ================= FIND USER ================= */
        const user = await User.findOne({
            _id: userId,
            is_deleted: false
        });

        if (!user) {
            return apiResponse.badRequest(res, messages.USER_NOT_FOUND);
        }

        /* ================= CHECK SAME PASSWORD ================= */
        const isSamePassword = await user.comparePassword(new_password);

        if (isSamePassword) {
            return apiResponse.badRequest(
                res,
                messages.NEW_PASSWORD_SAME_AS_OLD
            );
        }

        /* ================= UPDATE PASSWORD ================= */
        user.password = new_password; // auto-hashed via pre-save
        user.forget_otp = null;
        user.is_forget_otp = false;
        user.expiry_time_otp = null;

        await user.save();

        return apiResponse.ok(
            res,
            {},
            messages.PASSWORD_CHANGED
        );

    } catch (error) {
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};


// ---------- SOCIAL LOGIN
const socialLogin = async (req, res) => {
    try {
        const {
            socialType,        // google | apple
            social_id,
            email,
            first_name,
            last_name,
            device_type,
            player_id
        } = req.body;

        /* ---------- VALIDATION ---------- */
        if (!socialType || !social_id) {
            return apiResponse.badRequest(res, messages.MSG_EMPTY_PARAM);
        }

        const normalizedType = socialType.toLowerCase();

        // ❌ facebook not supported in schema
        if (!["google", "apple"].includes(normalizedType)) {
            return apiResponse.badRequest(res, messages.INVALID_SOCIAL_TYPE);
        }

        /* ---------- BUILD SOCIAL QUERY ---------- */
        const socialQuery =
            normalizedType === "google"
                ? { socialkey_google: social_id }
                : { socialkey_apple: social_id };

        /* ---------- FIND USER ---------- */
        let user = await User.findOne({
            ...socialQuery,
            is_deleted: false
        });

        /* ================= LOGIN CASE ================= */
        if (user) {
            console.log('=--------------', user)
            /* ===== ADD THIS BLOCK (ANOTHER EMAIL OTP CHECK) ===== */
            if (user.another_email && !user.is_another_email_verify) {

                const emailOtp = '1234'

                const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

                user.email_otp = {
                    code: emailOtp,
                    expires_at: otpExpiry
                };

                await user.save();

                /* ================= SEND EMAIL ================= */

                const postData = {
                    app_name: process.env.APP_NAME || "YourApp",
                    app_logo: process.env.APP_LOGO || "https://yourdomain.com/logo.png",
                    name: user.full_name || user.name || "User",
                    otp: emailOtp
                };

                const subject = `${postData.app_name} - Email Verification OTP`;

                const mailBody = mailer.mailBodyEmailOtp(postData);

                await mailer.sendMail(user.another_email, subject, mailBody);

                return apiResponse.ok(
                    res,
                    { email: user.another_email },
                    messages.MSG_OTP_SENT
                );
            }
            /* ===== END OF ADDED BLOCK ===== */


            // ===== YOUR EXISTING CODE (UNCHANGED) =====
            user.device_type = device_type || user.device_type;
            user.player_id = player_id || user.player_id;
            await user.save();

            const token = generateToken.generateToken(user._id);
            const userData = await helper.getUserData(user._id);

            userData.token = token;
            userData.is_new_user = !user.is_profile_completed;

            return apiResponse.ok(
                res,
                userData,
                messages.LOGIN_SUCCESSFUL
            );
        }

        /* ---------- EMAIL CONFLICT CHECK ---------- */
        if (email) {
            const emailExists = await User.findOne({
                email: email.toLowerCase().trim(),
                is_deleted: false
            });

            if (emailExists) {
                return apiResponse.badRequest(
                    res,
                    messages.MSG_EMAIL_EXISTS
                );
            }
        }

        /* ================= SIGNUP CASE ================= */
        const cleanEmail = email
            ? email.toLowerCase().trim()
            : `${social_id}@${normalizedType}.social`;

        const userDataToCreate = {
            email: cleanEmail,
            first_name: first_name || "",
            last_name: last_name || "",
            name: `${first_name} ${last_name}`,
            login_type: normalizedType,
            is_verified: true,
            signup_step: 1,
            is_profile_completed: false,

            device_type: device_type || null,
            player_id: player_id || null
        };

        if (normalizedType === "google") {
            userDataToCreate.socialkey_google = social_id;
        } else {
            userDataToCreate.socialkey_apple = social_id;
        }

        user = await User.create(userDataToCreate);

        const token = generateToken.generateToken(user._id);
        const finalUserData = await helper.getUserData(user._id);

        finalUserData.token = token;
        finalUserData.is_new_user = true;

        return apiResponse.ok(
            res,
            finalUserData,
            messages.SIGNUP_BASIC_INFO_SAVED
        );

    } catch (error) {
        console.error("Social Login Error:", error);
        return apiResponse.serverError(
            res,
            messages.SERVER_ERROR,
            error.message
        );
    }
};

// ------------------- LOGOUT ACCOUNT -------------------
const logout = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId)
        user.player_id = null
        user.device_type = null

        await user.save()

        return apiResponse.ok(res, {}, messages.LOGOUT_SUCCESS)
    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
    }
}

// ------------------- Mobile Check -------------------
const checkMobileNumber = async (req, res) => {
    try {
        const { phone_number } = req.body;
        if (!phone_number)
            return apiResponse.badRequest(res, messages.PHONE_NUMBER_REQUIRED)
        const mobileCheck = await User.findOne({ phone_number, is_verified: true, is_deleted: false })
        if (!mobileCheck) {
            return apiResponse.ok(res, {}, "")
        }
        return apiResponse.badRequest(res, messages.MOBILE_NUMBER_CHECK)
    } catch (error) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message)
    }
}

export default {
    signupStepOne, otpVerify, resendOtp, getTopCities, signupStepTwo, getMusicGenres, getEventPreferences, getVibeCheckQuestions, signupStepThree, login, logout, resendEmailOtp, verifyEmailOtp, forgotPassword, resendForgotOtp, verifyForgotOtp, changePassword, socialLogin, checkMobileNumber
};