import { Ads } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";

/* ================= LOG AD IMPRESSION =================
   Was completely untracked — ads are injected into feeds (see
   feedController's injectAds) but nothing ever recorded that a member
   actually saw one. Called once per ad render from the app. */
const logImpression = async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await Ads.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $inc: { impressions_count: 1 }, $set: { last_impression_at: new Date() } },
      { new: true }
    );

    if (!ad) return apiResponse.notFoundResponse(res, "Ad not found");
    return apiResponse.ok(res, { impressions_count: ad.impressions_count }, "Impression logged");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

/* ================= LOG AD CLICK =================
   Called when a member taps an ad (i.e. its link_url is opened). */
const logClick = async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await Ads.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $inc: { clicks_count: 1 }, $set: { last_click_at: new Date() } },
      { new: true }
    );

    if (!ad) return apiResponse.notFoundResponse(res, "Ad not found");
    return apiResponse.ok(res, { clicks_count: ad.clicks_count }, "Click logged");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

export default {
  logImpression,
  logClick,
};