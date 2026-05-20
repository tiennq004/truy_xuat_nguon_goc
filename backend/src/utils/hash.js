const crypto = require("crypto");

function sha256FromParts(parts) {
  const normalized = parts.map((p) => String(p ?? "").trim()).join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

module.exports = { sha256FromParts };
