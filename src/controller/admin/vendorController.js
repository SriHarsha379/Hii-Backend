// Update your vendorController.js with these changes

import bcrypt from "bcryptjs";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import { Vendor, Event, Venue, Booking, WithdrawRequest } from "../../model/index.js";
import { updateVendorSchema } from "../../validation/admin/vendorValidation.js";
import sendmail from "../../utility/sendmail.js"; // Add this import
import logActivity from "../../utility/activityLogger.js";
import vendorOtpController from "./vendorOtpController.js";


/* GET ALL VENDORS
   Supports optional ?is_verified=true|false filter — used by the "Organiser
   Requests" review queue to list only pending (unapproved) signups, without
   changing behavior for existing callers that don't pass it. */
const getAllVendors = async (req, res) => {
  try {
    console.log('Fetching all vendors...');

    // FIXED: was an exact-match `is_deleted: false`, which silently
    // excludes any legacy vendor document that predates this field being
    // added to the schema — those documents don't have is_deleted set to
    // false, they just don't have it at all, and Mongoose's exact-match
    // filtering (which runs at the raw-document level, before schema
    // defaults are applied) doesn't treat "missing" as equivalent to
    // "false". Several real seed vendors (e.g. "The Vault") were silently
    // invisible to Organiser Requests because of exactly this.
    const filter = { is_deleted: { $ne: true } };
    // FIXED: exact-match `is_verified: false/true` had the same problem
    // as is_deleted above — confirmed directly via a diagnostic query,
    // which found 5 real pending vendors (including "The Vault") that a
    // strict `is_verified: false` match was silently excluding. Same fix:
    // type-loose matching instead of exact equality.
    if (req.query.is_verified === 'true') filter.is_verified = { $ne: false };
    if (req.query.is_verified === 'false') filter.is_verified = { $ne: true };

    // FIXED: was an explicit include-list (`.select("name email ...")`)
    // that predated capacity/contact_person/description/address/landmark
    // being added to the schema — those fields were saving correctly (see
    // updateVendor) but got silently stripped out of every list response
    // here, so the Profile page always looked empty after a reload even
    // though the save genuinely worked. Switched to an exclude-list so
    // this can't quietly happen again the next time a field is added —
    // only password is excluded now, everything else passes through.
    const vendors = await Vendor.find(filter)
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name')
      .sort({ createdAt: -1 });

    console.log(`Found ${vendors.length} vendors`);
    return apiResponse.ok(res, vendors, messages.VENDOR_LIST_FETCHED);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET SINGLE VENDOR */
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching vendor by ID:', id);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    })
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    if (!vendor) {
      console.log('Vendor not found with ID:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    console.log('Vendor found:', vendor.email);
    return apiResponse.ok(res, vendor, messages.SUCCESS);
  } catch (err) {
    console.error('Error fetching vendor by ID:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* ================= ORGANISER REQUESTS: APPROVE / REJECT =================
   Powers the "Organiser Requests" review queue — new club/event organiser
   signups land with is_verified: false and can't log in (see
   vendorAuthController.vendorLogin) until a Super Admin approves them here.
*/

/* APPROVE VENDOR */
const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Vendor.findOne({ _id: id, is_deleted: { $ne: true } });
    if (!existing) return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);

    if (existing.is_verified) {
      return apiResponse.ok(res, existing, "Vendor is already approved");
    }

    // FIXED: was `.findOne()` + mutate + `.save()` — Mongoose's `.save()`
    // re-validates the ENTIRE document, not just the changed fields. Some
    // seed/legacy vendor records predate the current schema (city stored
    // as a plain string instead of an ObjectId reference, missing
    // password/state/phone_number entirely), so approving them failed
    // outright on unrelated pre-existing data issues, even though only
    // is_verified was being changed. findOneAndUpdate only validates the
    // fields actually being set.
    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_verified: true, rejection_reason: null },
      { new: true, runValidators: false }
    );

    await logActivity(req, {
      action: "UPDATE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `Approved ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} "${vendor.name}"`,
    });

    return apiResponse.ok(res, vendor, messages.VENDOR_APPROVED);
  } catch (err) {
    console.error('Error approving vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* REJECT VENDOR */
const rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await Vendor.findOne({ _id: id, is_deleted: { $ne: true } });
    if (!existing) return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);

    // Same fix as approveVendor — findOneAndUpdate instead of save(), to
    // avoid full-document validation failing on unrelated legacy data.
    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_verified: false, is_active: false, is_deleted: true, rejection_reason: reason || null },
      { new: true, runValidators: false }
    );

    await logActivity(req, {
      action: "DELETE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `Rejected ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} "${vendor.name}"${reason ? ` (${reason})` : ""}`,
    });

    return apiResponse.ok(res, vendor, messages.VENDOR_REJECTED);
  } catch (err) {
    console.error('Error rejecting vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* CREATE VENDOR */
const createVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone_number,
      city,
      state,
      address,
      landmark,
      password,
      vendor_type,  // NEW: vendor_type field
      contact_person,
      description,
      registration_number,
      tax_id,
    } = req.body;

    console.log('🔨 Creating vendor with data:', {
      name,
      email,
      phone_number,
      city,
      state,
      address,
      landmark,
      vendor_type
    });

    // Validate required fields
    if (!name || !email || !phone_number || !city || !state || !address || !password || !vendor_type) {
      console.log('Missing required fields');
      return apiResponse.badRequest(res, "All fields are required including vendor type");
    }

    // Email OTP verification — only enforced for CLUB_ADMIN self-registration
    // (the flow this was actually built for). Super Admin creating a vendor
    // manually (Organiser Requests / Admins management) never goes through
    // the OTP step at all, so this must not block that existing flow.
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      const isVerified = await vendorOtpController.isEmailVerifiedForRegistration(email);
      if (!isVerified) {
        return apiResponse.badRequest(res, "Please verify your email with the OTP before completing registration.");
      }
    }

    // Validate vendor_type
    if (!['owner', 'event_organizer'].includes(vendor_type)) {
      return apiResponse.badRequest(res, "Vendor type must be either 'owner' or 'event_organizer'");
    }

    // Check if email already exists
    const emailExists = await Vendor.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    });

    if (emailExists) {
      console.log('❌ Email already exists:', email);
      return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
    }

    // Check if phone number already exists
    const phoneExists = await Vendor.findOne({
      phone_number: phone_number.trim(),
      is_deleted: { $ne: true },
    });

    if (phoneExists) {
      console.log('❌ Phone already exists:', phone_number);
      return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
    }

    // Create vendor object with new field
    const vendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone_number: phone_number.trim(),
      vendor_type: vendor_type,  // Add vendor type
      city,
      state,
      address: address.trim(),
      landmark: landmark ? landmark.trim() : "",
      password,
      business_image: req.file ? req.file.filename : "",
      contact_person: contact_person || "",
      description: description || "",
      registration_number: registration_number || "",
      tax_id: tax_id || "",
    };

    console.log('📝 Vendor data to save:', vendorData);

    // Create vendor
    const vendor = await Vendor.create(vendorData);

    console.log('✅ Vendor created successfully:', {
      id: vendor._id,
      email: vendor.email,
      name: vendor.name,
      vendor_type: vendor.vendor_type
    });

    /* ================= SEND WELCOME EMAIL ================= */

    try {

      console.log("📧 Sending welcome email to:", vendor.email);

      const mailResponse = await sendmail.vendorNotificationMailer(
        vendor.name,
        vendor.email,
        password,
        process.env.APP_NAME || "Nightlife",
        `Welcome to ${process.env.APP_NAME || "Nightlife"} as a ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}`,
        `Congratulations! Your ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'} account has been successfully created.<br><br>
    <strong>Account Details:</strong><br>
    • Vendor Name: ${vendor.name}<br>
    • Email: ${vendor.email}<br>
    • Phone: ${vendor.phone_number}<br>
    • Type: ${vendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}<br>
    You can now log in to your vendor dashboard and start managing your services.`,
        "Please login to your account to complete your profile setup.",
        'https://hii.life/app/server/uploads/hii_dark_logo.png'
      );

      console.log("📨 Mail response:", mailResponse);

      if (mailResponse !== "yes") {
        console.error("❌ Email failed");

        return apiResponse.serverError(
          res,
          "Vendor created but email not sent"
        );
      }

      console.log("✅ Email sent successfully");

    } catch (emailError) {

      console.error("❌ Email exception:", emailError);

      return apiResponse.serverError(
        res,
        "Vendor created but email crashed",
        emailError.message
      );
    }

    // Return vendor without password
    const vendorResponse = await Vendor.findById(vendor._id)
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    await logActivity(req, {
      action: "CREATE",
      resource: "Vendor",
      resource_id: vendor._id,
      details: `New ${vendor.vendor_type === 'owner' ? 'club' : 'event organiser'} signup: "${vendor.name}" — pending approval`,
    });

    // Clean up the now-used OTP verification record — only relevant when
    // this was a CLUB_ADMIN self-registration in the first place.
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      await vendorOtpController.consumeVerifiedOtp(email);
    }

    return apiResponse.created(res, vendorResponse, messages.VENDOR_CREATED);
  } catch (err) {
    console.error('❌ Error creating vendor:', err);

    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
      }
      if (err.keyPattern && err.keyPattern.phone_number) {
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return apiResponse.badRequest(res, errors.join(', '));
    }

    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


/* UPDATE VENDOR */
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone_number, city, state, address, landmark, password, vendor_type, contact_person, capacity, description, registration_number, tax_id, company_type, website } = req.body;

    console.log('🔄 Updating vendor:', id);
    console.log('📥 Request body:', req.body);

    // ✅ ADD VALIDATION
    const { error } = updateVendorSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      return apiResponse.badRequest(res, error.details[0].message);
    }

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found for update:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    const updates = {};
    let hasChanges = false;

    // Track what changed for email notification
    const changes = [];

    // ✅ FIX: Always include email in updates if provided
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Only check for duplicates if email is actually changing
      if (normalizedEmail !== vendor.email) {
        const emailExists = await Vendor.findOne({
          email: normalizedEmail,
          _id: { $ne: vendor._id },
          is_deleted: { $ne: true },
        });

        if (emailExists) {
          console.log('❌ Email already exists during update:', email);
          return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
        }

        changes.push(`Email changed from ${vendor.email} to ${normalizedEmail}`);
      }

      updates.email = normalizedEmail;
      hasChanges = true;
      console.log('📧 Email updated:', normalizedEmail);
    }

    // Phone update check
    if (phone_number && phone_number !== vendor.phone_number) {
      const phoneExists = await Vendor.findOne({
        phone_number,
        _id: { $ne: vendor._id },
        is_deleted: { $ne: true },
      });

      if (phoneExists) {
        console.log('❌ Phone already exists during update:', phone_number);
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }

      updates.phone_number = phone_number;
      changes.push(`Phone number updated`);
      hasChanges = true;
      console.log('📞 Phone updated');
    }

    // Vendor type update
    if (vendor_type && vendor_type !== vendor.vendor_type) {
      if (!['owner', 'event_organizer'].includes(vendor_type)) {
        return apiResponse.badRequest(res, "Vendor type must be either 'owner' or 'event_organizer'");
      }

      updates.vendor_type = vendor_type;
      changes.push(`Vendor type changed to ${vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}`);
      hasChanges = true;
      console.log('👤 Vendor type updated:', vendor_type);
    }

    // Normal fields - always update if provided
    if (name && name !== vendor.name) {
      updates.name = name;
      changes.push(`Name updated to "${name}"`);
      hasChanges = true;
    }
    if (city && city.toString() !== vendor.city?.toString()) {
      updates.city = city;
      changes.push(`City updated`);
      hasChanges = true;
    }
    if (state && state.toString() !== vendor.state?.toString()) {
      updates.state = state;
      changes.push(`State updated`);
      hasChanges = true;
    }
    if (address && address !== vendor.address) {
      updates.address = address;
      changes.push(`Address updated`);
      hasChanges = true;
    }
    if (landmark !== undefined && landmark !== vendor.landmark) {
      updates.landmark = landmark;
      changes.push(`Landmark updated`);
      hasChanges = true;
    }
    if (contact_person !== undefined && contact_person !== vendor.contact_person) {
      updates.contact_person = contact_person;
      changes.push(`Contact person updated`);
      hasChanges = true;
    }
    if (capacity !== undefined && capacity !== '' && Number(capacity) !== vendor.capacity) {
      updates.capacity = Number(capacity);
      changes.push(`Capacity updated`);
      hasChanges = true;
    }
    if (description !== undefined && description !== vendor.description) {
      updates.description = description;
      changes.push(`Description updated`);
      hasChanges = true;
    }
    if (registration_number !== undefined && registration_number !== vendor.registration_number) {
      updates.registration_number = registration_number;
      changes.push(`Registration number updated`);
      hasChanges = true;
    }
    if (tax_id !== undefined && tax_id !== vendor.tax_id) {
      updates.tax_id = tax_id;
      changes.push(`Tax ID updated`);
      hasChanges = true;
    }
    if (company_type !== undefined && company_type !== vendor.company_type) {
      updates.company_type = company_type;
      changes.push(`Company type updated`);
      hasChanges = true;
    }
    if (website !== undefined && website !== vendor.website) {
      updates.website = website;
      changes.push(`Website updated`);
      hasChanges = true;
    }

    // Password update
    if (password) {
      updates.password = await bcrypt.hash(password, 12);
      changes.push(`Password updated`);
      hasChanges = true;
      console.log('🔑 Password updated');
    }

    // Image update
    if (req.file) {
      updates.business_image = req.file.filename;
      changes.push(`Business image updated`);
      hasChanges = true;
      console.log('🖼️ Image updated');
    }

    if (!hasChanges) {
      console.log('ℹ️ No changes detected for vendor:', id);
      return apiResponse.ok(res, vendor, "No changes made");
    }

    console.log('📝 Updates to apply:', updates);

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    )
      .select("-password")
      .populate('city', 'city_name')
      .populate('state', 'state_name');

    console.log('✅ Vendor updated successfully:', updatedVendor.email);

    // ✅ Send update notification email
    if (changes.length > 0) {
      try {
        await sendmail.vendorNotificationMailer(
          updatedVendor.name,
          updatedVendor.email,
          process.env.APP_NAME || "Nightlife",
          "Your Vendor Account Has Been Updated",
          `Your vendor account information has been updated by the administration.<br><br>
          <strong>Changes Made:</strong><br>
          • ${changes.join('<br>• ')}<br><br>
          <strong>Updated Account Information:</strong><br>
          • Name: ${updatedVendor.name}<br>
          • Email: ${updatedVendor.email}<br>
          • Phone: ${updatedVendor.phone_number}<br>
          • Type: ${updatedVendor.vendor_type === 'owner' ? 'Owner' : 'Event Organizer'}<br>
          • Status: ${updatedVendor.is_active ? 'Active' : 'Inactive'}<br><br>
          If you did not request these changes or have any concerns, please contact our support team immediately.`,
          "Please review your account information and contact support if needed.",
          process.env.APP_LOGO
        );
        console.log('📧 Update notification email sent to vendor:', updatedVendor.email);
      } catch (emailError) {
        console.error('❌ Failed to send update email:', emailError.message);
      }
    }

    return apiResponse.ok(res, updatedVendor, messages.VENDOR_UPDATED);

  } catch (err) {
    console.error("❌ Error updating vendor:", err);

    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return apiResponse.badRequest(res, "EMAIL_ALREADY_EXISTS");
      }
      if (err.keyPattern?.phone_number) {
        return apiResponse.badRequest(res, messages.MSG_PHONE_EXISTS);
      }
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return apiResponse.badRequest(res, errors.join(', '));
    }

    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* CHANGE STATUS - UPDATED WITH EMAIL NOTIFICATION */
const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('🔄 CHANGE_STATUS endpoint called for vendor:', id);
    console.log('📧 Request body:', req.body);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found for status change:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    console.log('🔍 Current vendor status:', {
      name: vendor.name,
      email: vendor.email,
      currentStatus: vendor.is_active ? 'active' : 'inactive'
    });

    // Store old status for comparison
    const oldStatus = vendor.is_active;
    // FIXED: same findOneAndUpdate fix as approve/reject — .save() was
    // re-validating the whole document and failing on legacy records
    // missing required fields the current schema expects.
    const updatedVendor = await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_active: !vendor.is_active },
      { new: true, runValidators: false }
    );
    Object.assign(vendor, updatedVendor.toObject());

    // Determine status for email
    const statusType = vendor.is_active ? 'activated' : 'deactivated';

    console.log('✅ Vendor status changed:', {
      id: vendor._id,
      email: vendor.email,
      oldStatus: oldStatus ? 'active' : 'inactive',
      newStatus: vendor.is_active ? 'active' : 'inactive',
      statusType: statusType,
      reason: reason
    });

    // ✅ Send status change email to vendor
    try {
      console.log(`📧 Calling vendorStatusMailer with statusType: "${statusType}"`);

      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        statusType, // This should be "activated" or "deactivated"
        reason || (statusType === 'activated'
          ? "Your account has been reviewed and approved by our administration team."
          : "Please contact support for more information about this action."),
        process.env.APP_LOGO
      );

      console.log(`📧 Email sending result for ${statusType}:`, {
        success: emailResult.success,
        messageId: emailResult.messageId,
        subject: emailResult.subject,
        error: emailResult.error
      });

      if (emailResult.success) {
        console.log(`✅ ${statusType} email sent successfully to ${vendor.email}`);
      } else {
        console.warn(`⚠️ ${statusType} email failed for ${vendor.email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error(`❌ Error sending ${statusType} email:`, emailError.message);
      console.error(`❌ Email error stack:`, emailError.stack);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: vendor.is_active,
        statusText: vendor.is_active ? 'active' : 'inactive'
      },
      vendor.is_active
        ? messages.VENDOR_ACTIVATED
        : messages.VENDOR_DEACTIVATED
    );
  } catch (err) {
    console.error('❌ Error changing vendor status:', err);
    console.error('❌ Error stack:', err.stack);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};
/* SOFT DELETE - UPDATED WITH EMAIL NOTIFICATION */
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional deletion reason

    console.log('🗑️ Soft deleting vendor:', id, 'Reason:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found for deletion:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    // Store vendor info before deletion for email
    const vendorInfo = {
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone_number
    };

    vendor.is_deleted = true;
    vendor.is_active = false;
    vendor.deleted_at = new Date();
    // FIXED: findOneAndUpdate instead of save() — same legacy-data
    // validation issue as approve/reject.
    await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_deleted: true, is_active: false, deleted_at: new Date() },
      { new: true, runValidators: false }
    );

    console.log('✅ Vendor soft deleted:', {
      id: vendor._id,
      email: vendor.email,
      deleted_at: vendor.deleted_at
    });

    // ✅ Send deletion notification email to vendor
    try {
      await sendmail.vendorNotificationMailer(
        vendorInfo.name,
        vendorInfo.email,
        process.env.APP_NAME || "Nightlife",
        "Your Vendor Account Has Been Deleted",
        `We regret to inform you that your vendor account has been deleted from our platform.<br><br>
        <strong>Account Information:</strong><br>
        • Vendor Name: ${vendorInfo.name}<br>
        • Email: ${vendorInfo.email}<br>
        • Phone: ${vendorInfo.phone}<br>
        • Deletion Date: ${new Date().toLocaleDateString()}<br>
        ${reason ? `<br><strong>Reason for Deletion:</strong> ${reason}` : ''}<br><br>
        All your data will be permanently removed from our system within 30 days as per our data retention policy.<br><br>
        If you believe this was done in error or have any questions, please contact our support team immediately.`,
        "Contact support within 30 days if you want to restore your account.",
        process.env.APP_LOGO
      );
      console.log('📧 Deletion notification email sent to vendor:', vendorInfo.email);
    } catch (emailError) {
      console.error('❌ Failed to send deletion email:', emailError.message);
    }

    // Send notification to admin
    try {
      await sendmail.vendorNotificationMailer(
        "Admin Team",
        process.env.ADMIN_EMAIL || "admin@nightlife.com",
        process.env.APP_NAME || "Nightlife",
        `Vendor Account Deleted - ${vendorInfo.name}`,
        `A vendor account has been deleted from the system.<br><br>
        <strong>Deleted Vendor Details:</strong><br>
        • Name: ${vendorInfo.name}<br>
        • Email: ${vendorInfo.email}<br>
        • Phone: ${vendorInfo.phone}<br>
        • Deleted By: Admin<br>
        • Deletion Date: ${new Date().toLocaleString()}<br>
        ${reason ? `<br><strong>Reason:</strong> ${reason}` : ''}<br><br>
        This vendor account has been soft deleted and can be restored if needed.`,
        "Check the deleted vendors list in admin panel for restoration options.",
        process.env.APP_LOGO
      );
      console.log('📧 Admin deletion notification sent');
    } catch (adminEmailError) {
      console.error('❌ Admin deletion notification failed:', adminEmailError.message);
    }

    return apiResponse.ok(res, {
      message: messages.VENDOR_DELETED,
      vendor: vendorInfo,
      deleted_at: vendor.deleted_at
    }, messages.VENDOR_DELETED);
  } catch (err) {
    console.error('❌ Error deleting vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* ACTIVATE VENDOR SPECIFICALLY */
const activateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('✅ ACTIVATE VENDOR CALLED:', id);
    console.log('📧 Reason provided:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found for activation:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    if (vendor.is_active) {
      console.log('ℹ️ Vendor already active:', id);
      return apiResponse.ok(res, vendor, "Vendor is already active");
    }

    // Store old status
    const oldStatus = vendor.is_active;
    // FIXED: findOneAndUpdate instead of save() — same legacy-data fix.
    await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_active: true, activated_at: new Date() },
      { new: true, runValidators: false }
    );
    vendor.is_active = true;
    vendor.activated_at = new Date();

    console.log('✅ Vendor activated:', {
      id: vendor._id,
      email: vendor.email,
      activated_at: vendor.activated_at,
      new_status: vendor.is_active
    });

    // ✅ Send activation email
    try {
      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        "activated",  // Correct: "activated"
        reason || "Your account has been reviewed and approved by our administration team.",
        process.env.APP_LOGO
      );

      console.log('📧 Activation email result:', emailResult);

      if (emailResult.success) {
        console.log('✅ Activation email sent to vendor:', vendor.email);
        console.log('✅ Email subject:', emailResult.subject);
      } else {
        console.error('❌ Activation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Activation email failed with error:', emailResult?.error || emailError.message);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: true,
        activated_at: vendor.activated_at
      },
      messages.VENDOR_ACTIVATED
    );
  } catch (err) {
    console.error('❌ Error activating vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* DEACTIVATE VENDOR SPECIFICALLY */
const deactivateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('⛔ DEACTIVATE VENDOR CALLED:', id);
    console.log('📧 Reason provided:', reason);

    const vendor = await Vendor.findOne({
      _id: id,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found for deactivation:', id);
      return apiResponse.notFoundResponse(res, messages.VENDOR_NOT_FOUND);
    }

    if (!vendor.is_active) {
      console.log('ℹ️ Vendor already inactive:', id);
      return apiResponse.ok(res, vendor, "Vendor is already inactive");
    }

    // Store old status
    const oldStatus = vendor.is_active;
    // FIXED: findOneAndUpdate instead of save() — same legacy-data fix.
    await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_active: false, deactivated_at: new Date() },
      { new: true, runValidators: false }
    );
    vendor.is_active = false;
    vendor.deactivated_at = new Date();

    console.log('✅ Vendor deactivated:', {
      id: vendor._id,
      email: vendor.email,
      deactivated_at: vendor.deactivated_at,
      new_status: vendor.is_active
    });

    // ✅ Send deactivation email
    try {
      const emailResult = await sendmail.vendorStatusMailer(
        vendor.name,
        vendor.email,
        process.env.APP_NAME || "Nightlife",
        "deactivated",  // Correct: "deactivated"
        reason || "Please contact support for more information about this action.",
        process.env.APP_LOGO
      );

      console.log('📧 Deactivation email result:', emailResult);

      if (emailResult.success) {
        console.log('✅ Deactivation email sent to vendor:', vendor.email);
        console.log('✅ Email subject:', emailResult.subject);
      } else {
        console.error('❌ Deactivation email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Deactivation email failed with error:', emailResult?.error || emailError.message);
    }

    return apiResponse.ok(
      res,
      {
        vendor: vendor,
        oldStatus: oldStatus,
        newStatus: false,
        deactivated_at: vendor.deactivated_at
      },
      messages.VENDOR_DEACTIVATED
    );
  } catch (err) {
    console.error('❌ Error deactivating vendor:', err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR SERVICES (EVENT / VENUE) */
const getVendorServices = async (req, res) => {
  try {
    const { vendor_id, type } = req.query;

    if (!vendor_id || !type) {
      return apiResponse.badRequest(res, "vendor_id and type are required");
    }

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, "type must be event or venue");
    }

    let data = [];

    if (type === "event") {
      data = await Event.find({
        vendor_id,
        is_deleted: { $ne: true },
      })
        .populate("category_ids", "category_name")
        .sort({ createdAt: -1 });
    }

    if (type === "venue") {
      data = await Venue.find({
        vendor_id,
        is_deleted: { $ne: true },
      })
        .populate("category_ids", "category_name")
        .sort({ createdAt: -1 });
    }

    return apiResponse.ok(res, data, "Vendor services fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR BOOKINGS */
const getVendorBookings = async (req, res) => {
  try {
    const { vendor_id, type } = req.query;

    if (!vendor_id || !type) {
      return apiResponse.badRequest(res, "vendor_id and type are required");
    }

    if (!["event", "venue"].includes(type)) {
      return apiResponse.badRequest(res, "type must be event or venue");
    }

    const bookings = await Booking.find({
      vendor_id,
      booking_type: type,
      is_deleted: { $ne: true },
    })
      .populate("user_id", "name email")
      .populate("event_id")
      .populate("venue_id")
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, bookings, "Vendor bookings fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR EARNINGS */
const getVendorEarnings = async (req, res) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return apiResponse.badRequest(res, "vendor_id is required");
    }

    const bookings = await Booking.find({
      vendor_id,
      payment_status: "success",
      booking_status: { $ne: "cancelled" },
      is_deleted: { $ne: true },
    });

    let totalEarnings = 0;

    bookings.forEach((b) => {
      totalEarnings += b.total;
    });

    return apiResponse.ok(
      res,
      {
        total_bookings: bookings.length,
        total_earnings: totalEarnings,
      },
      "Vendor earnings fetched"
    );
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* GET VENDOR WITHDRAWALS */
const getVendorWithdrawals = async (req, res) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return apiResponse.badRequest(res, "vendor_id is required");
    }

    const withdrawals = await WithdrawRequest.find({
      vendor_id,
    }).sort({ createdAt: -1 });

    return apiResponse.ok(res, withdrawals, "Vendor withdrawals fetched");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

/* 1. GET BANK DETAILS */
const getBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: { $ne: true },
    }).select('bank_details');

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    return apiResponse.ok(
      res,
      vendor.bank_details || {
        account_holder_name: null,
        bank_name: null,
        account_number: null,
        ifsc_code: null,
        account_type: 'savings',
        is_verified: false,
        verified_at: null
      },
      "Bank details fetched successfully"
    );

  } catch (err) {
    console.error('Error fetching bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 2. ADD BANK DETAILS */
const addBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      account_type
    } = req.body;

    // Validation
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code || !account_type) {
      return apiResponse.badRequest(res, "All fields are required");
    }

    if (!['savings', 'current'].includes(account_type)) {
      return apiResponse.badRequest(res, "Account type must be savings or current");
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details already exist
    if (vendor.bank_details && vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "Bank details already exist. Use edit to update.");
    }

    // Add bank details
    vendor.bank_details = {
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.toUpperCase().trim(),
      account_type: account_type,
      is_verified: false,
      verified_at: null
    };

    await vendor.save();

    return apiResponse.created(
      res,
      vendor.bank_details,
      "Bank details added successfully"
    );

  } catch (err) {
    console.error('Error adding bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 3. EDIT/UPDATE BANK DETAILS */
const editBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      account_type
    } = req.body;

    // Validation
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code || !account_type) {
      return apiResponse.badRequest(res, "All fields are required");
    }

    if (!['savings', 'current'].includes(account_type)) {
      return apiResponse.badRequest(res, "Account type must be savings or current");
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details exist
    if (!vendor.bank_details || !vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "No bank details found. Please add first.");
    }

    // Update bank details (reset verification on edit)
    vendor.bank_details = {
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.toUpperCase().trim(),
      account_type: account_type,
      is_verified: false, // Reset verification on edit
      verified_at: null
    };

    await vendor.save();

    return apiResponse.ok(
      res,
      vendor.bank_details,
      "Bank details updated successfully"
    );

  } catch (err) {
    console.error('Error updating bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

/* 4. DELETE BANK DETAILS */
const deleteBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor;

    const vendor = await Vendor.findOne({
      _id: vendorId,
      is_deleted: { $ne: true },
    });

    if (!vendor) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Check if bank details exist
    if (!vendor.bank_details || !vendor.bank_details.account_number) {
      return apiResponse.badRequest(res, "No bank details found to delete");
    }

    // Reset bank details to default
    vendor.bank_details = {
      account_holder_name: null,
      bank_name: null,
      account_number: null,
      ifsc_code: null,
      account_type: 'savings',
      is_verified: false,
      verified_at: null
    };

    await vendor.save();

    return apiResponse.ok(
      res,
      null,
      "Bank details deleted successfully"
    );

  } catch (err) {
    console.error('Error deleting bank details:', err);
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

export default {
  getAllVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
  activateVendor,
  deactivateVendor,
  getVendorServices,
  getVendorBookings,
  getVendorEarnings,
  getVendorWithdrawals,
  getBankDetails,
  addBankDetails,
  editBankDetails,
  deleteBankDetails
};