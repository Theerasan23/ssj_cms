const jwt = require("jsonwebtoken");

// JWT_SECRET must be provided via env — never fall back to a value committed in source,
// or anyone with the repo could forge tokens.
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error("JWT_SECRET is missing or too short (need ≥16 chars). Set it in cms-api/.env before starting the server.");
}
const EXPIRES = process.env.JWT_EXPIRES || "12h";

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}
function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
