import jwt from "jsonwebtoken";
import { Admin, User, Vendor } from "../model/index.js";
import apiResponse from "../utility/apiResponse.js";
import messages from "../utility/messages.js";


const adminauth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer "))
    return apiResponse.unauthorized(res, messages.TOKEN_MISSING);

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) return apiResponse.forbidden(res, messages.FORBIDDEN);

    req.user = admin;
    next();
  } catch (err) {
    return apiResponse.unauthorized(res, messages.TOKEN_INVALID);
  }
};

const appAuth = async (req, res, next) => {
  let token;

  // Check for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Attach admin to request (excluding password)
      req.userId = decoded.id
      if (!decoded.id) {
        return apiResponse.forbidden(res, messages.FORBIDDEN);
      }
      const user = await User.findOne({ _id: decoded.id, is_deleted: false });
      req.user_type
      if (!user) return apiResponse.notFoundResponse(res, messages.NOT_FOUND);
      if (!user.is_active) return apiResponse.accountDeactiveResponse(res, messages.ACCOUNT_DEACTIVATE_BY_ADMIN);
      next();
    } catch (err) {
      return apiResponse.unauthorized(res, messages.TOKEN_INVALID);
    }
  } else {
    return apiResponse.unauthorized(res, messages.TOKEN_MISSING);
  }
};


const vendorauth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return apiResponse.unauthorized(res, messages.TOKEN_REQUIRED);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const vendor = await Vendor.findById(decoded.vendorId);
    if (!vendor || vendor.is_deleted) {
      return apiResponse.unauthorized(res, messages.INVALID_VENDOR);
    }

    req.vendor = vendor; // logged-in vendor data
    next();
  } catch (error) {
    return apiResponse.unauthorized(res, messages.TOKEN_INVALID);
  }
};

// Middleware that allows either admin or vendor access
const allowAdminOrVendor = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer "))
    return apiResponse.unauthorized(res, messages.TOKEN_MISSING);

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try admin first
    if (decoded?.id) {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (admin) {
        req.user = admin;
        return next();
      }
    }

    // Try vendor
    if (decoded?.vendorId) {
      const vendor = await Vendor.findById(decoded.vendorId);
      if (vendor && !vendor.is_deleted) {
        req.vendor = vendor;
        return next();
      }
    }

    return apiResponse.forbidden(res, messages.FORBIDDEN);
  } catch (err) {
    return apiResponse.unauthorized(res, messages.TOKEN_INVALID);
  }
};

export { adminauth, appAuth, vendorauth, allowAdminOrVendor };
