export function buildLotSerial(drugId, batch) {
  const id = String(drugId || "").trim();
  const b = String(batch || "").trim();
  return `${id}@${b}`;
}

export function lotHashInput(drugId, materialsUsed, batch) {
  const materials = Array.isArray(materialsUsed) ? materialsUsed.join(",") : String(materialsUsed || "");
  return `${String(drugId || "").trim()}|${materials}|${String(batch || "").trim()}`;
}

export function groupDrugsByLot(items) {
  const map = new Map();
  for (const item of items || []) {
    const lotSerial = item.lotSerial || buildLotSerial(item.drugId, item.batch);
    if (!map.has(lotSerial)) {
      map.set(lotSerial, {
        lotSerial,
        drugId: item.drugId,
        drugName: item.drugName || item.drugId,
        batch: item.batch,
        manufacturer: item.manufacturer,
        drugImageUrl: item.drugImageUrl,
        boxes: [],
      });
    }
    map.get(lotSerial).boxes.push(item);
  }
  for (const group of map.values()) {
    group.boxes.sort((a, b) => String(a.serial).localeCompare(String(b.serial)));
    group.total = group.boxes.length;
    group.soldCount = group.boxes.filter((b) => b.status === "Sold").length;
  }
  return Array.from(map.values()).sort((a, b) => String(b.lotSerial).localeCompare(String(a.lotSerial)));
}
