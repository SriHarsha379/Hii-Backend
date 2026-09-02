import { Ads } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import logActivity from "../../utility/activityLogger.js";

/* ================= CREATE AD ================= */
const createAd = async (req, res) => {
    try {
        const { expiry_date, link_url, video_width, video_height } = req.body;
        const ad_image = req.files?.ad_image?.[0]?.filename;
        const ad_video = req.files?.ad_video?.[0]?.filename;

        if (!expiry_date) {
            return apiResponse.badRequest(res, messages.EXPIRYDATE_REQ);
        }

        if (!ad_image) {
            return apiResponse.badRequest(res, messages.ADS_REQ);
        }

        if (link_url && !/^https?:\/\/.+/i.test(link_url)) {
            return apiResponse.badRequest(res, messages.INVALID_AD_LINK);
        }

        // Video dimensions are required whenever a video is attached — the
        // app needs the exact aspect ratio ahead of time to avoid layout
        // shift while the video loads; a "recommended" hint isn't enough.
        if (ad_video && (!video_width || !video_height)) {
            return apiResponse.badRequest(res, messages.VIDEO_DIMENSIONS_REQ);
        }

        const ad = new Ads({
            ad_image,
            ad_video: ad_video || null,
            video_width: ad_video ? Number(video_width) : null,
            video_height: ad_video ? Number(video_height) : null,
            link_url: link_url || null,
            expiry_date: expiry_date || null
        });

        await ad.save();

        await logActivity(req, { action: "CREATE", resource: "Ad", resource_id: ad._id, details: `Created ad (expires ${expiry_date})` });

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
        const { expiry_date, link_url, video_width, video_height } = req.body;

        const ad_image = req.files?.ad_image?.[0]?.filename;
        const ad_video = req.files?.ad_video?.[0]?.filename;

        const ad = await Ads.findOne({
            _id: id,
            is_deleted: false
        });

        if (!ad) {
            return apiResponse.notFoundResponse(res, messages.ADS_NOT_FOUND);
        }

        if (link_url && !/^https?:\/\/.+/i.test(link_url)) {
            return apiResponse.badRequest(res, messages.INVALID_AD_LINK);
        }

        // If a new video is being attached (either now or already present
        // on the ad), dimensions must be provided.
        const willHaveVideo = ad_video || ad.ad_video;
        if (willHaveVideo && ad_video && (!video_width || !video_height)) {
            return apiResponse.badRequest(res, messages.VIDEO_DIMENSIONS_REQ);
        }

        // ✅ All fields optional
        if (expiry_date !== undefined) {
            ad.expiry_date = expiry_date;
        }

        if (ad_image !== undefined) {
            ad.ad_image = ad_image;
        }

        if (ad_video !== undefined) {
            ad.ad_video = ad_video;
            ad.video_width = video_width ? Number(video_width) : ad.video_width;
            ad.video_height = video_height ? Number(video_height) : ad.video_height;
        } else if (video_width && video_height) {
            // Dimensions updated without replacing the video file itself.
            ad.video_width = Number(video_width);
            ad.video_height = Number(video_height);
        }

        if (link_url !== undefined) {
            ad.link_url = link_url || null;
        }

        await ad.save();

        await logActivity(req, { action: "UPDATE", resource: "Ad", resource_id: ad._id, details: "Updated ad" });

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

        await logActivity(req, { action: "DELETE", resource: "Ad", resource_id: ad._id, details: "Deleted ad" });

        return apiResponse.ok(res, ad, messages.ADS_DELETED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


/* ================= AD ANALYTICS =================
   Was entirely missing — the app injects ads into feeds but nothing
   tracked impressions/clicks, and there was no admin view for it.
   Returns per-ad counts (each ad already carries its own counters)
   plus totals across all non-deleted ads, for the AdsBroadcast
   analytics view. */
const getAdStats = async (req, res) => {
    try {
        const ads = await Ads.find({ is_deleted: false })
            .select("ad_image link_url expiry_date impressions_count clicks_count last_impression_at last_click_at createdAt")
            .sort({ impressions_count: -1 });

        const totals = ads.reduce(
            (acc, ad) => {
                acc.total_impressions += ad.impressions_count || 0;
                acc.total_clicks += ad.clicks_count || 0;
                return acc;
            },
            { total_impressions: 0, total_clicks: 0 }
        );

        const ctr = totals.total_impressions > 0
            ? Number(((totals.total_clicks / totals.total_impressions) * 100).toFixed(2))
            : 0;

        return apiResponse.ok(res, { ads, totals: { ...totals, ctr } }, "Ad stats fetched successfully");
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default {
    createAd,
    getAds,
    updateAd,
    deleteAd,
    getAdStats
};