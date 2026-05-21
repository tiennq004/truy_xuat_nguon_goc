function buildLotSerial(drugId, batch) {
  const id = String(drugId || "").trim();
  const b = String(batch || "").trim();
  return `${id}@${b}`;
}

function lotHashParts(drugId, materialsUsed, batch) {
  const materials = Array.isArray(materialsUsed) ? materialsUsed.join(",") : String(materialsUsed || "");
  return [String(drugId || "").trim(), materials, String(batch || "").trim()];
}

module.exports = { buildLotSerial, lotHashParts };
