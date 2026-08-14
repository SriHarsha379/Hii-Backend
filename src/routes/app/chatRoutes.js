import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Venue, Event, Category } from "../../model/index.js";
import { appAuth } from "../../middleware/authMiddleware.js";

const route = express.Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Hii App's nightlife concierge. You help users discover
clubs, bars, lounges, and events. Always use the search_venues or search_events tools
to answer recommendation questions — never invent venue or event names, addresses, or
details that aren't returned by the tools. Keep replies short, friendly, and specific.
If no results are found, say so honestly and suggest broadening the search.
Note: venues/events don't have a strict "city" field — location is matched against
free-text addresses, so treat location matches loosely.`;

const tools = [
  {
    name: "search_venues",
    description:
      "Search nightlife venues by location (matches against address text) or venue type (matches against category name, e.g. club, bar, lounge).",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or area, matched against address" },
        venueType: { type: "string", description: "e.g. club, bar, lounge, pub" },
      },
    },
  },
  {
    name: "search_events",
    description:
      "Search upcoming nightlife events by location (matches against address text) or event type (matches against category name).",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or area, matched against address" },
        eventType: { type: "string", description: "e.g. music festival, DJ night" },
      },
    },
  },
];

async function filterByCategoryName(items, typeText, categoryType) {
  if (!typeText) return items;
  const allCategoryIds = items.flatMap((i) => i.category_ids || []);
  const matchedCategories = await Category.find({
    _id: { $in: allCategoryIds },
    category_type: categoryType,
    category_name: new RegExp(typeText, "i"),
    is_active: true,
    is_deleted: false,
  }).lean();
  const matchedIds = new Set(matchedCategories.map((c) => c._id.toString()));
  return items.filter((i) =>
    (i.category_ids || []).some((id) => matchedIds.has(id.toString()))
  );
}

async function searchVenues(input) {
  const match = { is_active: true, is_deleted: false };
  if (input.location) {
    match.address = new RegExp(input.location, "i");
  }
  let venues = await Venue.find(match).limit(10).lean();
  venues = await filterByCategoryName(venues, input.venueType, 2);
  venues = venues.slice(0, 5);

  return venues.map((v) => ({
    name: v.venue_name,
    address: v.address,
    open_days: v.open_days,
    hours: `${v.start_time} - ${v.end_time}`,
  }));
}

async function searchEvents(input) {
  const match = { is_active: true, is_deleted: false };
  if (input.location) {
    match.address = new RegExp(input.location, "i");
  }
  let events = await Event.find(match).sort({ start_date: 1 }).limit(10).lean();
  events = await filterByCategoryName(events, input.eventType, 1);
  events = events.slice(0, 5);

  return events.map((e) => ({
    name: e.venue_name,
    address: e.address,
    start_date: e.start_date,
    end_date: e.end_date,
    hours: `${e.start_time} - ${e.end_time}`,
  }));
}

async function runTool(toolUse) {
  if (toolUse.name === "search_venues") return searchVenues(toolUse.input);
  if (toolUse.name === "search_events") return searchEvents(toolUse.input);
  return { error: `Unknown tool: ${toolUse.name}` };
}

async function sendMessage(req, res) {
  try {
    const incomingMessages = Array.isArray(req.body.messages) ? req.body.messages : [];

    if (incomingMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: ["Message history is required", "Message history is required"],
      });
    }

    let messages = incomingMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    let loopGuard = 0;
    while (response.stop_reason === "tool_use" && loopGuard < 4) {
      loopGuard += 1;
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const result = await runTool(toolUse);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock ? textBlock.text : "Sorry, I couldn't find anything on that.";

    return res.json({
      success: true,
      message: ["Success", "Success"],
      data: { reply },
    });
  } catch (err) {
    console.error("chat/send error:", err);
    return res.status(500).json({
      success: false,
      message: ["Chat request failed. Please try again.", "Chat request failed. Please try again."],
    });
  }
}

route.post("/send", appAuth, sendMessage);

export default route;
