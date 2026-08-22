import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    phone_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    vendor_type: {
      type: String,
      enum: ['owner', 'event_organizer'],
      default: 'owner',
      required: true
    },

    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    landmark: {
      type: String,
      default: "",
    },

    // Was collected in the admin dashboard's "Profile" edit form but had
    // nowhere to actually save — these fields never existed on this schema.
    contact_person: {
      type: String,
      default: "",
    },

    capacity: {
      type: Number,
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    business_image: {
      type: String,
      default: "",
    },

    // Bank Details for Indian Banks
    bank_details: {
      account_holder_name: {
        type: String,
        trim: true,
        default: null
      },
      bank_name: {
        type: String,
        trim: true,
        default: null
      },
      account_number: {
        type: String,
        trim: true,
        default: null
      },
      ifsc_code: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },
      account_type: {
        type: String,
        enum: ['savings', 'current'],
        default: 'savings'
      },
      is_verified: {
        type: Boolean,
        default: false
      },
      verified_at: {
        type: Date,
        default: null
      }
    },

    is_verified: {
      type: Boolean,
      // New organiser signups now require Super Admin approval before they
      // can log in — see the "Organiser Requests" review queue. Existing
      // vendors already in the DB keep whatever value they had; this only
      // changes the default for new documents.
      default: false,
    },

    rejection_reason: {
      type: String,
      default: null,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    last_login: {
      type: Date,
    }
  },
  { timestamps: true }
);


VendorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

VendorSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Guard against "OverwriteModelError: Cannot overwrite `Vendor` model once
// compiled" - happens if this file ends up imported via two different
// module paths in the same process (e.g. a script importing it directly
// alongside something that pulls it in via model/index.js). Reusing the
// already-compiled model instead of re-registering fixes it regardless of
// which import path caused the double-load.
const Vendor = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

export default Vendor;