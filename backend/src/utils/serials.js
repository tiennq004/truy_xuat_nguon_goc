function normalizeQuantity(quantity) {
  const n = Number(quantity);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function getMaxBoxIndexFromList(items, drugId) {
  const id = String(drugId || "").trim();
  const prefix = `${id}-`;
  let max = 0;
  for (const item of items || []) {
    const serial = typeof item === "string" ? item : item?.serial;
    if (!serial || !String(serial).startsWith(prefix)) continue;
    const suffix = String(serial).slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    const n = parseInt(suffix, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function buildNextBoxSerials(drugId, quantity, startIndex) {
  const id = String(drugId || "").trim();
  const qty = normalizeQuantity(quantity);
  const start = Math.max(1, Math.floor(Number(startIndex) || 1));
  const serials = [];
  for (let i = 0; i < qty; i += 1) {
    serials.push(`${id}-${String(start + i).padStart(4, "0")}`);
  }
  return {
    serials,
    startIndex: start,
    endIndex: start + qty - 1,
    quantity: qty,
  };
}

/** @deprecated use resolveNextBoxSerials */
function buildBoxSerials(drugId, quantity) {
  return buildNextBoxSerials(drugId, quantity, 1).serials;
}

async function resolveNextBoxSerials(drugId, quantity, { listItems, exists }) {
  const id = String(drugId || "").trim();
  const qty = normalizeQuantity(quantity);
  const existingBoxCount = getMaxBoxIndexFromList(listItems, id);
  let nextIndex = existingBoxCount + 1;
  const serials = [];
  const maxIterations = qty + existingBoxCount + 50000;
  let iter = 0;

  while (serials.length < qty && iter < maxIterations) {
    const serial = `${id}-${String(nextIndex).padStart(4, "0")}`;
    nextIndex += 1;
    iter += 1;
    // eslint-disable-next-line no-await-in-loop
    if (await exists(serial)) continue;
    serials.push(serial);
  }

  if (serials.length < qty) {
    throw new Error("Could not allocate enough unique box serials");
  }

  const startIndex = parseInt(String(serials[0]).split("-").pop(), 10) || 1;
  return {
    serials,
    startIndex,
    endIndex: parseInt(String(serials[serials.length - 1]).split("-").pop(), 10) || startIndex,
    quantity: serials.length,
    existingBoxCount,
    isContinuation: existingBoxCount > 0,
  };
}

module.exports = {
  normalizeQuantity,
  getMaxBoxIndexFromList,
  buildNextBoxSerials,
  buildBoxSerials,
  resolveNextBoxSerials,
};
