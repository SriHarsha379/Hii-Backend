// ISSUE 3 FIX: Gemini API proxy — the API key never leaves the server.
// Frontend must call POST /app/server/api/v1/admin/ai/generate
// instead of calling Gemini directly with an inlined key.
import { GoogleGenAI } from "@google/genai";
import apiResponse from "../../utility/apiResponse.js";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generate = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return apiResponse.badRequest(res, "prompt is required");
    }
    if (prompt.length > 4000) {
      return apiResponse.badRequest(res, "prompt must be under 4000 characters");
    }
    const result = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return apiResponse.ok(res, { text: result.text }, "Generated successfully");
  } catch (err) {
    console.error("[AI generate]", err.message);
    return apiResponse.serverError(res, "AI generation failed", err.message);
  }
};

export default { generate };
