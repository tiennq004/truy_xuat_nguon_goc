export function normalizeQuantity(quantity) {
  const n = Number(quantity);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function getMaxBoxIndexFromList(items, drugId) {
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

export function buildNextBoxSerials(drugId, quantity, startIndex) {
  const id = String(drugId || "").trim();
  const qty = normalizeQuantity(quantity);
  const start = Math.max(1, Math.floor(Number(startIndex) || 1));
  const serials = [];
  for (let i = 0; i < qty; i += 1) {
    serials.push(`${id}-${String(start + i).padStart(4, "0")}`);
  }
  return { serials, startIndex: start, endIndex: start + qty - 1, quantity: qty };
}

export function groupDrugsByProduct(items) {
  const map = new Map();
  for (const item of items || []) {
    const drugId = item.drugId || item.serial;
    if (!map.has(drugId)) {
      map.set(drugId, {
        drugId,
        drugName: item.drugName || drugId,
        batch: item.batch,
        manufacturer: item.manufacturer,
        drugImageUrl: item.drugImageUrl,
        boxes: [],
      });
    }
    map.get(drugId).boxes.push(item);
  }
  for (const group of map.values()) {
    group.boxes.sort((a, b) => String(a.serial).localeCompare(String(b.serial)));
    group.total = group.boxes.length;
    group.soldCount = group.boxes.filter((b) => b.status === "Sold").length;
  }
  return Array.from(map.values()).sort((a, b) => String(b.drugId).localeCompare(String(a.drugId)));
}
