export const MAX_BOX_QUANTITY = 200;

export function buildBoxSerials(drugId, quantity) {
  const id = String(drugId || "").trim();
  const qty = Math.max(1, Math.min(MAX_BOX_QUANTITY, Number(quantity) || 1));
  const serials = [];
  for (let i = 1; i <= qty; i += 1) {
    serials.push(`${id}-${String(i).padStart(4, "0")}`);
  }
  return serials;
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
