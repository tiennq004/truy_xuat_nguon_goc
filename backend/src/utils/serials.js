const MAX_BOX_QUANTITY = 200;

function buildBoxSerials(drugId, quantity) {
  const id = String(drugId || "").trim();
  const qty = Math.max(1, Math.min(MAX_BOX_QUANTITY, Number(quantity) || 1));
  const serials = [];
  for (let i = 1; i <= qty; i += 1) {
    serials.push(`${id}-${String(i).padStart(4, "0")}`);
  }
  return serials;
}

module.exports = { buildBoxSerials, MAX_BOX_QUANTITY };
