import mongoose from "mongoose";

// Tracks admin/vendor write actions for the Super Admin "Activity Logs" page.
// This model did not exist anywhere in the codebase before — the Activity
// Logs page in the dashboard was calling a `${API_BASE}/activity-logs`
// endpoint that had no route, model, or controller behind it at all.
const ActivityLogSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "actor_type",
    },
    actor_type: {
      type: String,
      enum: ["Admin", "Vendor"],
      default: "Admin",
    },
    admin_name: {
      type: String,
      default: "Unknown",
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
      required: true,
    },
    resource: {
      type: String, // e.g. "User", "Ad", "City", "Genre", "Category"
      required: true,
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      default: "",
    },
    ip_address: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
export default ActivityLog;
