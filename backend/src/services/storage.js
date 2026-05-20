const admin = require("firebase-admin");
const crypto = require("crypto");

let memoryStore = {
  materials: new Map(),
  drugs: new Map(),
  scans: [],
};

let firestore = null;
let bucket = null;
let storageUploadEnabled = false;

function initStorage() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    return { mode: "memory" };
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: storageBucket || undefined,
    });
  }

  firestore = admin.firestore();
  storageUploadEnabled = Boolean(
    storageBucket && String(process.env.ENABLE_FIREBASE_STORAGE || "").toLowerCase() === "true"
  );
  bucket = storageUploadEnabled ? admin.storage().bucket() : null;
  return { mode: "firebase" };
}

function useFirebase() {
  return Boolean(firestore);
}

async function saveMaterial(material) {
  if (!useFirebase()) {
    memoryStore.materials.set(material.materialId, material);
    return;
  }
  await firestore.collection("materials").doc(material.materialId).set(material);
}

async function getMaterial(materialId) {
  if (!useFirebase()) return memoryStore.materials.get(materialId) || null;
  const doc = await firestore.collection("materials").doc(materialId).get();
  return doc.exists ? doc.data() : null;
}

async function listMaterials() {
  if (!useFirebase()) {
    return Array.from(memoryStore.materials.values());
  }
  const snapshot = await firestore.collection("materials").get();
  return snapshot.docs.map((d) => d.data());
}

async function saveDrug(drug) {
  if (!useFirebase()) {
    memoryStore.drugs.set(drug.serial, drug);
    return;
  }
  await firestore.collection("drugs").doc(drug.serial).set(drug);
}

async function getDrug(serial) {
  if (!useFirebase()) return memoryStore.drugs.get(serial) || null;
  const doc = await firestore.collection("drugs").doc(serial).get();
  return doc.exists ? doc.data() : null;
}

async function listDrugs() {
  if (!useFirebase()) {
    return Array.from(memoryStore.drugs.values());
  }
  const snapshot = await firestore.collection("drugs").get();
  return snapshot.docs.map((d) => d.data());
}

async function logScan(scanEvent) {
  if (!useFirebase()) {
    memoryStore.scans.push(scanEvent);
    return;
  }
  await firestore.collection("scanLogs").add(scanEvent);
}

async function persistImage(dataUrl, folder, filePrefix) {
  if (!dataUrl) return "";
  if (!useFirebase() || !storageUploadEnabled || !bucket) return dataUrl;

  const matched = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matched) return dataUrl;

  const mimeType = matched[1];
  const base64 = matched[2];
  const buffer = Buffer.from(base64, "base64");
  const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const safePrefix = String(filePrefix || "image").replace(/[^a-zA-Z0-9-_]/g, "_");
  const random = crypto.randomBytes(8).toString("hex");
  const filePath = `${folder}/${safePrefix}-${Date.now()}-${random}.${extension}`;
  const file = bucket.file(filePath);

  try {
    await file.save(buffer, {
      metadata: { contentType: mimeType },
      resumable: false,
    });

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: "2500-01-01",
    });

    return signedUrl;
  } catch (_error) {
    // Spark free-tier projects can block Storage operations.
    // Fallback to inline data URL to keep the app functional.
    return dataUrl;
  }
}

module.exports = {
  initStorage,
  saveMaterial,
  getMaterial,
  listMaterials,
  saveDrug,
  getDrug,
  listDrugs,
  logScan,
  persistImage,
};
