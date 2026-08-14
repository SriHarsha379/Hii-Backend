import { Ads } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

/* ================= CREATE AD ================= */
const createAd = async (req, res) => {
    try {
        const { expiry_date } = req.body;
        const ad_image = req.file?.filename;

        if (!expiry_date) {
            return apiResponse.badRequest(res, messages.EXPIRYDATE_REQ);
        }

        if (!ad_image) {
            return apiResponse.badRequest(res, messages.ADS_REQ);
        }

        const ad = new Ads({
            ad_image,
            expiry_date: expiry_date || null
        });

        await ad.save();

        return apiResponse.ok(res, ad, messages.ADS_CREATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= GET ALL ADS ================= */
const getAds = async (req, res) => {
    try {
        const ads = await Ads.find({
            is_deleted: false
        }).sort({ createdAt: -1 });

        return apiResponse.ok(res, ads, messages.ADS_FOUND);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= UPDATE AD ================= */
const updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiry_date } = req.body;

        const ad_image = req.file?.filename;

        const ad = await Ads.findOne({
            _id: id,
            is_deleted: false
        });

        if (!ad) {
            return apiResponse.notFoundResponse(res, messages.ADS_NOT_FOUND);
        }

        // ✅ All fields optional
        if (expiry_date !== undefined) {
            ad.expiry_date = expiry_date;
        }

        if (ad_image !== undefined) {
            ad.ad_image = ad_image;
        }

        await ad.save();

        return apiResponse.ok(res, ad, messages.ADS_UPDATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= DELETE AD ================= */
const deleteAd = async (req, res) => {
    try {
        const ad = await Ads.findOne({
            _id: req.params.id,
            is_deleted: false
        });

        if (!ad) {
            return apiResponse.notFoundResponse(res, messages.ADS_NOT_FOUND);
        }

        ad.is_deleted = true;

        await ad.save();

        return apiResponse.ok(res, ad, messages.ADS_DELETED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default {
    createAd,
    getAds,
    updateAd,
    deleteAd
};