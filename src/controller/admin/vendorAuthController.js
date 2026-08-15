import { Vendor } from "../../model/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendmail from "../../utility/sendmail.js";
import apiResponse from "../../utility/apiResponse.js";


const vendorAuthController = {
  vendorLogin: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const vendor = await Vendor.findOne({
        email: email.toLowerCase(),
        is_deleted: false
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Only real password check
      const isMatch = await bcrypt.compare(password, vendor.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // New organiser signups need Super Admin approval before they can
      // access their dashboard — see the "Organiser Requests" review queue.
      if (!vendor.is_verified) {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval. You'll be notified once it's reviewed.",
          pending_approval: true,
        });
      }

      const token = jwt.sign(
        { vendorId: vendor._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      vendor.last_login = new Date();
      await vendor.save();

      const vendorResponse = {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone_number: vendor.phone_number,
        city: vendor.city,
        state: vendor.state,
        address: vendor.address,
        landmark: vendor.landmark,
        business_image: vendor.business_image,
        is_active: vendor.is_active,
        is_verified: vendor.is_verified,
      };

      res.json({
        success: true,
        message: "Login successful",
        token,
        vendor: vendorResponse,
      });

    } catch (error) {
      console.error("Vendor Login Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  getVendorDetails: async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.vendor._id)
        .select("-password")
        .populate('city', 'city_name')
        .populate('state', 'state_name');

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      res.json({
        success: true,
        message: "Vendor details fetched",
        vendor,
      });
    } catch (error) {
      console.error("Get Vendor Details Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  updateVendorProfile: async (req, res) => {
    try {
      const {
        name,
        email,
        phone_number,
        state,
        city,
        address,
        landmark
      } = req.body;

      const vendorId = req.vendor._id;

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Update only if field is provided (even if empty string)
      if (name !== undefined) vendor.name = name;
      if (email !== undefined) vendor.email = email;
      if (phone_number !== undefined) vendor.phone_number = phone_number;
      if (state !== undefined) vendor.state = state;
      if (city !== undefined) vendor.city = city;
      if (address !== undefined) vendor.address = address;
      if (landmark !== undefined) vendor.landmark = landmark;

      // ✅ Optional image update
      if (req.file) {
        vendor.business_image = req.file.filename;
      }

      await vendor.save();

      const updatedVendor = await Vendor.findById(vendorId)
        .select("-password")
        .populate("city", "city_name")
        .populate("state", "state_name");

      res.json({
        success: true,
        message: "Vendor profile updated successfully",
        vendor: updatedVendor,
      });

    } catch (error) {
      console.error("Update Vendor Profile Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  changeVendorPassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const vendorId = req.vendor._id;

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ✅ Only real password check
      const isMatch = await bcrypt.compare(oldPassword, vendor.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Old password is incorrect",
        });
      }

      // Prevent same password reuse
      const isSamePassword = await bcrypt.compare(newPassword, vendor.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be same as old password",
        });
      }
      
      vendor.password = newPassword;
      await vendor.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });

    } catch (error) {
      console.error("Change Password Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  vendorForgetPassword: async (req, res) => {
    try {
      const { email } = req.body;

      // 1. Vendor check
      const vendor = await Vendor.findOne({
        email: email.toLowerCase(),
        is_deleted: false
      });

      if (!vendor) {
        return apiResponse.badRequest(res, "Vendor not found");
      }

      // Optional: mark token unused (same as admin)
      vendor.reset_token_used = false;
      await vendor.save();

      // 2. Create JWT Token (15 min expiry)
      const token = jwt.sign(
        { vendorId: vendor._id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      // 3. Reset link (change if needed for production)
      const resetLink = `https://hii.life/app/vendor/reset-password/${token}`;
      // const resetLink = `http://localhost:3000/app/vendor/reset-password/${token}`;

      // 4. Prepare professional email body
      const mailBody = sendmail.mailBodyVendorForgetPassword({
        app_name: "Hii Vendor",
        app_logo: "https://hii.life/app/server/uploads/hii_dark_logo.png",
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        resetLink,
      });

      // 5. Send email
      await sendmail.ForgetPasswordMail(
        vendor.email,
        "Reset Your Password",
        mailBody
      );

      return apiResponse.ok(res, "Password reset link sent successfully.");

    } catch (error) {
      console.error("Vendor Forget Password Error:", error);
      return apiResponse.serverError(res, "Server error", error.message);
    }
  },

  vendorForgetNewPassword: async (req, res) => {
    try {
      const { newPassword, token } = req.body;

      // 1️⃣ Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return apiResponse.badRequest(res, "Token expired or invalid");
      }

      // 2️⃣ Find Vendor
      const vendor = await Vendor.findById(decoded.vendorId);
      if (!vendor) {
        return apiResponse.badRequest(res, "Vendor not found");
      }

      // 3️⃣ Check if reset link already used
      if (vendor.reset_token_used) {
        return apiResponse.badRequest(
          res,
          "This reset link has already been used."
        );
      }

      // 4️⃣ Prevent same password reuse
      const isSamePassword = await bcrypt.compare(
        newPassword,
        vendor.password
      );

      if (isSamePassword) {
        return apiResponse.badRequest(
          res,
          "New password cannot be same as old password"
        );
      }

      vendor.password = newPassword;

      // 🔥 Mark reset link as used (one time only)
      vendor.reset_token_used = true;

      await vendor.save();

      return apiResponse.ok(res, null, "Password changed successfully");

    } catch (error) {
      console.error("Vendor Reset Password Error:", error);
      return apiResponse.serverError(res, "Server error", error.message);
    }
  },

  // ✅ Token verify API (frontend के लिए)
  verifyResetToken: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const vendorId = decoded.vendorId;
      const vendor = await Vendor.findById(vendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      res.json({
        success: true,
        message: "Token is valid",
        vendor: {
          id: vendor._id,
          email: vendor.email,
          name: vendor.name
        }
      });

    } catch (error) {
      console.error("Token Verify Error:", error);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

};

export default vendorAuthController;
