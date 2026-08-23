import crypto from "crypto";

// NEW: real TOTP (RFC 6238) implementation for Admin 2FA. Deliberately
// dependency-free — uses only Node's built-in crypto module rather than
// requiring an npm install on the live production server, which would
// need write access to node_modules and carries real risk on a running
// server. Standard, well-tested algorithm (same one Google Authenticator,
// Authy, etc. all implement).

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Generates a random 20-byte secret, base32-encoded (the standard format
// authenticator apps expect for manual entry).
function generateSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.substring(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// Generates the 6-digit code for a given secret at a given time step.
function generateCode(secret, timeStep = 30, forTime = Date.now()) {
  const counter = Math.floor(forTime / 1000 / timeStep);
  const key = base32Decode(secret);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binCode % 1000000).padStart(6, "0");
}

// Verifies a submitted code, allowing +/- 1 time step (30s) either side to
// account for clock drift between the server and the person's phone —
// standard practice for TOTP verification.
function verifyCode(secret, submittedCode, timeStep = 30) {
  const clean = String(submittedCode).replace(/\s/g, "");
  const now = Date.now();
  for (const offset of [0, -1, 1]) {
    const code = generateCode(secret, timeStep, now + offset * timeStep * 1000);
    if (code === clean) return true;
  }
  return false;
}

function buildOtpAuthUri(secret, accountLabel, issuer = "Hii Admin") {
  const encodedLabel = encodeURIComponent(`${issuer}:${accountLabel}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export default { generateSecret, generateCode, verifyCode, buildOtpAuthUri };