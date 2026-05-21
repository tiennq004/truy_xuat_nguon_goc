import axios from "axios";
import { getApiBase, setLanIp } from "./utils/url";

const api = axios.create({
  baseURL: getApiBase(),
});

export function refreshApiBase() {
  api.defaults.baseURL = getApiBase();
}

export async function loadHostHints() {
  try {
    const data = await api.get("/host-hints").then((r) => r.data);
    if (data.lanIps?.length) {
      setLanIp(data.lanIps[0]);
      refreshApiBase();
    }
    return data;
  } catch {
    return null;
  }
}

export function healthCheck() {
  return api.get("/health").then((r) => r.data);
}

export function getChainConfig() {
  return api.get("/chain-config").then((r) => r.data);
}

export function createMaterial(payload) {
  return api.post("/materials", payload).then((r) => r.data);
}

export function listMaterials() {
  return api.get("/materials").then((r) => r.data);
}

export function createMaterialOffchain(payload) {
  return api.post("/materials/offchain", payload).then((r) => r.data);
}

export function createDrug(payload) {
  return api.post("/drugs", payload).then((r) => r.data);
}

export function listDrugs() {
  return api.get("/drugs").then((r) => r.data);
}

export function checkDrugSerials(drugId, quantity) {
  return api
    .get("/drugs/check-serials", { params: { drugId, quantity } })
    .then((r) => r.data);
}

export function listDrugGroups() {
  return api.get("/drugs/groups").then((r) => r.data);
}

export function sellDrugBox(serial, payload) {
  return api.post(`/drugs/${serial}/sell`, payload).then((r) => r.data);
}

export function sellDrugBoxOffchain(serial, payload) {
  return api.post(`/drugs/${serial}/sell/offchain`, payload).then((r) => r.data);
}

export function createDrugOffchain(payload) {
  return api.post("/drugs/offchain", payload).then((r) => r.data);
}

export function transferDrug(serial, payload) {
  return api.post(`/drugs/${serial}/transfer`, payload).then((r) => r.data);
}

export function transferDrugOffchain(serial, payload) {
  return api.post(`/drugs/${serial}/transfer/offchain`, payload).then((r) => r.data);
}

export function verifyDrug(serial) {
  return api.get(`/verify/${serial}`).then((r) => r.data);
}
