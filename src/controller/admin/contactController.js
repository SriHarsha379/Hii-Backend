import { Contact, User, Vendor, Notification } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import sendmail from "../../utility/sendmail.js";

const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .populate({
        path: "user_id",
        select: "first_name last_name email name username",
        model: User
      })
      .populate({
        path: "vendor_id",
        select: "store_name owner_name email name",
        model: Vendor
      })
      .sort({ createdAt: -1 });

    const result = contacts.map(contact => {
      // Ensure user object structure
      const userObj = contact.user_id ? {
        _id: contact.user_id._id,
        email: contact.user_id.email || contact.email,
        first_name: contact.user_id.first_name || "",
        last_name: contact.user_id.last_name || "",
        name: contact.user_id.name || "",
        username: contact.user_id.username || "",
        full_name:
          contact.user_id.first_name && contact.user_id.last_name
            ? `${contact.user_id.first_name} ${contact.user_id.last_name}`.trim()
            : contact.user_id.name
              ? contact.user_id.name
              : contact.user_id.username
                ? contact.user_id.username
                : contact.email ? contact.email.split('@')[0] : "User"
      } : null;

      // Ensure vendor object structure
      const vendorObj = contact.vendor_id ? {
        _id: contact.vendor_id._id,
        email: contact.vendor_id.email || contact.email,
        store_name: contact.vendor_id.store_name || "",
        owner_name: contact.vendor_id.owner_name || "",
        name: contact.vendor_id.name || ""
      } : null;

      return {
        _id: contact._id,
        email: contact.email,
        message: contact.message,
        is_reply: contact.is_reply,
        reply_date: contact.reply_date,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        admin_reply: contact.admin_reply,
        type: contact.type,
        user: userObj,
        vendor: vendorObj
      };
    });

    return apiResponse.ok(res, result, messages.CONTACT_LIST || "Contacts fetched successfully");
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    return apiResponse.serverError(res, error.message);
  }
};

const replyToContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return apiResponse.badRequest(res, "Reply message is required");
    }

    const contact = await Contact.findById(id)
      .populate({
        path: "user_id",
        select: "first_name last_name email name",
        model: User
      })
      .populate({
        path: "vendor_id",
        select: "store_name owner_name email name",
        model: Vendor
      });

    if (!contact) {
      return apiResponse.notFoundResponse(res, "Contact not found");
    }

    // Determine recipient details
    let recipientName = "";
    let recipientEmail = contact.email;
    let recipientType = contact.type;

    if (contact.type === "user" && contact.user_id) {
      const user = contact.user_id;
      recipientName = user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.name
          ? user.name
          : user.email.split('@')[0];
      recipientEmail = user.email || contact.email;
    } else if (contact.type === "vendor" && contact.vendor_id) {
      const vendor = contact.vendor_id;
      recipientName = vendor.store_name || vendor.owner_name || vendor.name || "Vendor";
      recipientEmail = vendor.email || contact.email;
    } else {
      // Fallback to email extraction
      recipientName = contact.email ? contact.email.split('@')[0] : "Customer";
      recipientType = contact.type || "user";
    }

    // Send email
    try {
      await sendmail.contectusMailer(
        'Admin',
        recipientName,
        recipientEmail,
        process.env.APP_NAME || "Your App",
        replyMessage.trim(),
        'Response to your inquiry',
        process.env.APP_LOGO || ""
      );
      console.log(`Email sent to ${recipientEmail}`);
    } catch (emailError) {
      console.warn("Email sending failed, but continuing:", emailError.message);
      // Don't fail the request if email fails
    }

    try {
      if (contact.type === "vendor" && contact.vendor_id) {
        await Notification.create({
          vendor_user_id: contact.vendor_id._id,
          other_user_id: null,
          title: "Admin Reply",
          message: replyMessage.trim(),
          read_status: 0,
          action: "reply"
        });
      }
    } catch (notifError) {
      console.warn("Notification failed:", notifError.message);
      // fail mat karna API ko
    }

    // Update contact in database
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      {
        is_reply: true,
        admin_reply: replyMessage.trim(),
        reply_date: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "user_id",
        select: "first_name last_name email name",
        model: User
      })
      .populate({
        path: "vendor_id",
        select: "store_name owner_name email name",
        model: Vendor
      });

    // Prepare response
    const responseData = {
      _id: updatedContact._id,
      email: updatedContact.email,
      message: updatedContact.message,
      is_reply: updatedContact.is_reply,
      reply_date: updatedContact.reply_date,
      createdAt: updatedContact.createdAt,
      updatedAt: updatedContact.updatedAt,
      admin_reply: updatedContact.admin_reply,
      type: updatedContact.type,
      user: updatedContact.user_id ? {
        _id: updatedContact.user_id._id,
        email: updatedContact.user_id.email,
        full_name: updatedContact.user_id.first_name && updatedContact.user_id.last_name
          ? `${updatedContact.user_id.first_name} ${updatedContact.user_id.last_name}`
          : updatedContact.user_id.name
      } : null,
      vendor: updatedContact.vendor_id ? {
        _id: updatedContact.vendor_id._id,
        email: updatedContact.vendor_id.email,
        store_name: updatedContact.vendor_id.store_name,
        owner_name: updatedContact.vendor_id.owner_name
      } : null
    };

    return apiResponse.ok(res, responseData, "Reply sent successfully");
  } catch (error) {
    console.error("Error in replyToContact:", error);
    return apiResponse.serverError(res, error.message);
  }
};

const addContact = async (req, res) => {
  try {
    const { type, user_id, vendor_id, email, message } = req.body;

    if (!email || !message) {
      return apiResponse.badRequest(res, "Email and message are required");
    }

    if (type && !["user", "vendor"].includes(type)) {
      return apiResponse.badRequest(res, "Type must be either 'user' or 'vendor'");
    }

    // Verify user or vendor exists if IDs are provided
    if (user_id) {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        return apiResponse.notFoundResponse(res, "User not found");
      }
    }

    if (vendor_id) {
      const vendorExists = await Vendor.findById(vendor_id);
      if (!vendorExists) {
        return apiResponse.notFoundResponse(res, "Vendor not found");
      }
    }

    const payload = {
      type: type || (user_id ? "user" : vendor_id ? "vendor" : "user"),
      user_id: user_id || null,
      vendor_id: vendor_id || null,
      email,
      message
    };

    const newContact = await Contact.create(payload);

    // Populate the new contact
    const populatedContact = await Contact.findById(newContact._id)
      .populate({
        path: "user_id",
        select: "first_name last_name email name",
        model: User
      })
      .populate({
        path: "vendor_id",
        select: "store_name owner_name email name",
        model: Vendor
      });

    return apiResponse.ok(res, populatedContact, "Contact message received successfully");
  } catch (error) {
    console.error("Error in addContact:", error);
    return apiResponse.serverError(res, error.message);
  }
};
// GET /admin/contact/vendor/:vendorId
const getVendorContacts = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const contacts = await Contact.find({ vendor_id: vendorId })
      .populate({
        path: "user_id",
        select: "first_name last_name email name username"
      })
      .sort({ createdAt: -1 });

    return apiResponse.ok(
      res,
      contacts.map(c => ({
        _id: c._id,
        type: c.type,
        email: c.email,
        message: c.message,
        admin_reply: c.admin_reply,
        is_reply: c.is_reply,
        reply_date: c.reply_date,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: c.user_id
      })),
      "Vendor contacts fetched successfully"
    );
  } catch (err) {
    return apiResponse.serverError(res, err.message);
  }
};

// =========================
// VENDOR - GET MY CONTACTS
// =========================
const getVendorMyContacts = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const contacts = await Contact.find({
      vendor_id: vendorId,
      type: "vendor"
    })
      .sort({ createdAt: -1 });

    const formatted = contacts.map(c => ({
      _id: c._id,
      email: c.email,
      message: c.message,
      admin_reply: c.admin_reply,
      is_reply: c.is_reply,
      reply_date: c.reply_date,
      createdAt: c.createdAt
    }));

    return apiResponse.ok(
      res,
      formatted,
      "Your contact messages fetched successfully"
    );

  } catch (error) {
    console.error("Vendor Get Contacts Error:", error);
    return apiResponse.serverError(res, error.message);
  }
};

// VENDOR - ADD CONTACT
const addVendorContact = async (req, res) => {
  try {
    const vendorId = req.vendor._id;   // from auth middleware
    const { message } = req.body;

    if (!message || !message.trim()) {
      return apiResponse.badRequest(res, "Message is required");
    }

    // ✅ Get vendor details
    const vendor = await Vendor.findById(vendorId).select("email name store_name owner_name");

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Auto-fill name (for frontend display if needed)
    const vendorName =
      vendor.store_name ||
      vendor.owner_name ||
      vendor.name ||
      "Vendor";

    const newContact = await Contact.create({
      type: "vendor",
      vendor_id: vendorId,
      email: vendor.email,
      message: message.trim()
    });

    return apiResponse.ok(
      res,
      {
        _id: newContact._id,
        name: vendorName,
        email: vendor.email,
        message: newContact.message,
        createdAt: newContact.createdAt
      },
      "Your message has been sent to admin successfully"
    );

  } catch (error) {
    console.error("Vendor Add Contact Error:", error);
    return apiResponse.serverError(res, error.message);
  }
};


export default { getAllContacts, replyToContact, addContact, getVendorContacts, getVendorMyContacts, addVendorContact };