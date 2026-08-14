import jwt from "jsonwebtoken";

export const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },  // Include role in token payload
    process.env.JWT_SECRET,
    { expiresIn: "300d" }
  );
};

export const generateVendorToken = (vendorId) => {
  return jwt.sign({ vendorId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export default { generateToken, generateVendorToken };
