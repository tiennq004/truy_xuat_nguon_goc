export const SUPPLY_CHAIN_STEPS = [
  { key: "Manufacturer", label: "Nhà sản xuất", icon: "🏭" },
  { key: "Distributor", label: "Nhà phân phối", icon: "🚚" },
  { key: "Hospital", label: "Bệnh viện", icon: "🏥" },
  { key: "Pharmacy", label: "Nhà thuốc", icon: "💊" },
  { key: "Sold", label: "Đã bán", icon: "✅" },
];

const LEGACY_STATUS_MAP = {
  Created: "Manufacturer",
  Shipping: "Distributor",
  Warehouse: "Distributor",
  Delivered: "Pharmacy",
};

const STATUS_LABELS = {
  Manufacturer: "Tại nhà sản xuất",
  Distributor: "Tại nhà phân phối",
  Hospital: "Tại bệnh viện",
  Pharmacy: "Tại nhà thuốc",
  Sold: "Đã bán ra thị trường",
};

export function normalizeStatus(status) {
  return LEGACY_STATUS_MAP[status] || status || "Manufacturer";
}

export function getStatusLabel(status) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || normalized;
}

export function getSaleStatus(status) {
  return normalizeStatus(status) === "Sold"
    ? { label: "Đã bán", className: "sold-yes" }
    : { label: "Chưa bán", className: "sold-no" };
}

export function getReachedStepIndex(status, history = []) {
  const order = SUPPLY_CHAIN_STEPS.map((s) => s.key);
  const allStatuses = [status, ...history.map((h) => h.status)];
  let maxIndex = 0;
  for (const item of allStatuses) {
    const normalized = normalizeStatus(item);
    const idx = order.indexOf(normalized);
    if (idx > maxIndex) maxIndex = idx;
  }
  return maxIndex;
}
