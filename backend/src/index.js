const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const os = require("os");
const QRCode = require("qrcode");
const { sha256FromParts } = require("./utils/hash");
const { resolveNextBoxSerials } = require("./utils/serials");
const storage = require("./services/storage");
const chain = require("./services/chain");

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(",").map((o) => o.trim()),
        }
      : {}
  )
);
app.use(express.json({ limit: "15mb" }));

const storageStatus = storage.initStorage();
const chainStatus = chain.initChain();

function buildVerifyUrl(serial, verifyBase) {
  const base = String(verifyBase || process.env.FRONTEND_VERIFY_BASE || "http://localhost:5173/verify").replace(
    /\/$/,
    ""
  );
  return `${base}/${encodeURIComponent(serial)}`;
}

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return [...new Set(ips)];
}

app.get("/api/host-hints", (_req, res) => {
  const lanIps = getLanIps();
  const frontendPort = process.env.FRONTEND_PORT || 5173;
  const primaryIp = lanIps[0] || null;
  res.json({
    lanIps,
    phoneVerifyBase: primaryIp ? `http://${primaryIp}:${frontendPort}/verify` : null,
    phoneFrontendUrl: primaryIp ? `http://${primaryIp}:${frontendPort}` : null,
    phoneApiBase: primaryIp ? `http://${primaryIp}:${port}/api` : null,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    storageMode: storageStatus.mode,
    chainMode: chainStatus.mode,
  });
});

app.get("/api/chain-config", (_req, res) => {
  try {
    const cfg = chain.getPublicConfig();
    res.json({ ...cfg, chainMode: chainStatus.mode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/materials", async (req, res) => {
  try {
    const { materialId, name, origin, certificate, expiry, supplier, materialImageUrl } = req.body;
    if (!materialId || !origin || !certificate) {
      return res.status(400).json({ error: "materialId, origin, certificate are required" });
    }

    const materialHash = sha256FromParts([materialId, origin, certificate]);
    const persistedMaterialImageUrl = await storage.persistImage(
      materialImageUrl,
      "materials",
      materialId
    );

    const payload = {
      materialId,
      name,
      origin,
      certificate,
      expiry,
      supplier,
      materialImageUrl: persistedMaterialImageUrl || "",
      materialHash,
      createdAt: new Date().toISOString(),
    };

    await storage.saveMaterial(payload);
    const chainResult = await chain.registerMaterial(materialId, materialHash, supplier || "supplier");
    res.status(201).json({ ...payload, txHash: chainResult.txHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/materials", async (_req, res) => {
  try {
    const items = await storage.listMaterials();
    items.sort((a, b) => String(a.materialId).localeCompare(String(b.materialId)));
    res.json({ count: items.length, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/materials/offchain", async (req, res) => {
  try {
    const { materialId, name, origin, certificate, expiry, supplier, materialHash, txHash, materialImageUrl } = req.body;
    if (!materialId || !origin || !certificate || !materialHash) {
      return res.status(400).json({ error: "materialId, origin, certificate, materialHash are required" });
    }

    const persistedMaterialImageUrl = await storage.persistImage(
      materialImageUrl,
      "materials",
      materialId
    );

    const payload = {
      materialId,
      name,
      origin,
      certificate,
      expiry,
      supplier,
      materialImageUrl: persistedMaterialImageUrl || "",
      materialHash,
      txHash: txHash || "",
      createdAt: new Date().toISOString(),
    };

    await storage.saveMaterial(payload);
    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs", async (req, res) => {
  try {
    const { drugId, drugName, batch, materialsUsed, expiry, manufacturer, drugImageUrl, verifyBase, quantity } =
      req.body;
    if (!drugId || !batch || !Array.isArray(materialsUsed) || materialsUsed.length === 0) {
      return res.status(400).json({ error: "drugId, batch, materialsUsed are required" });
    }

    const allItems = await storage.listDrugs();
    const { serials, startIndex, endIndex, existingBoxCount, isContinuation } = await resolveNextBoxSerials(
      drugId,
      quantity,
      {
        listItems: allItems,
        exists: async (serial) => {
          const existingOffchain = await storage.getDrug(serial);
          const existingOnchain = await chain.drugExists(serial);
          return Boolean(existingOffchain || existingOnchain);
        },
      }
    );

    const persistedDrugImageUrl = await storage.persistImage(drugImageUrl, "drugs", String(drugId).trim());
    const items = [];
    const owner = manufacturer || "manufacturer";

    for (const serial of serials) {
      const drugHash = sha256FromParts([drugId, materialsUsed.join(","), batch, serial]);
      const verifyUrl = buildVerifyUrl(serial, verifyBase);
      // eslint-disable-next-line no-await-in-loop
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      const payload = {
        serial,
        drugId: String(drugId).trim(),
        drugName: drugName || "",
        batch,
        materialsUsed,
        expiry,
        manufacturer,
        drugImageUrl: persistedDrugImageUrl || "",
        currentOwner: owner,
        status: "Manufacturer",
        history: [{ status: "Manufacturer", owner, at: new Date().toISOString() }],
        drugHash,
        verifyUrl,
        qrDataUrl,
      boxIndex: Number(serial.split("-").pop()) || 0,
    };
      // eslint-disable-next-line no-await-in-loop
      const chainResult = await chain.registerDrug(serial, drugHash, owner);
      // eslint-disable-next-line no-await-in-loop
      await storage.saveDrug({ ...payload, txHash: chainResult.txHash });
      items.push({ ...payload, txHash: chainResult.txHash });
    }

    res.status(201).json({
      count: items.length,
      drugId: String(drugId).trim(),
      quantity: items.length,
      startIndex,
      endIndex,
      existingBoxCount,
      isContinuation,
      items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drugs", async (_req, res) => {
  try {
    const items = await storage.listDrugs();
    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    res.json({ count: items.length, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drugs/check-serials", async (req, res) => {
  try {
    const drugId = String(req.query.drugId || "").trim();
    const quantity = req.query.quantity;
    if (!drugId) {
      return res.status(400).json({ error: "drugId is required" });
    }

    const allItems = await storage.listDrugs();
    const plan = await resolveNextBoxSerials(drugId, quantity, {
      listItems: allItems,
      exists: async (serial) => {
        const existingOffchain = await storage.getDrug(serial);
        const existingOnchain = await chain.drugExists(serial);
        return Boolean(existingOffchain || existingOnchain);
      },
    });

    res.json({
      available: true,
      plannedSerials: plan.serials,
      quantity: plan.quantity,
      startIndex: plan.startIndex,
      endIndex: plan.endIndex,
      existingBoxCount: plan.existingBoxCount,
      isContinuation: plan.isContinuation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drugs/groups", async (_req, res) => {
  try {
    const items = await storage.listDrugs();
    const groupsMap = new Map();
    for (const item of items) {
      const key = item.drugId || item.serial;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          drugId: key,
          drugName: item.drugName || key,
          batch: item.batch,
          manufacturer: item.manufacturer,
          drugImageUrl: item.drugImageUrl,
          boxes: [],
        });
      }
      groupsMap.get(key).boxes.push(item);
    }
    const groups = Array.from(groupsMap.values()).map((g) => {
      g.boxes.sort((a, b) => String(a.serial).localeCompare(String(b.serial)));
      g.total = g.boxes.length;
      g.soldCount = g.boxes.filter((b) => b.status === "Sold").length;
      return g;
    });
    groups.sort((a, b) => String(b.drugId).localeCompare(String(a.drugId)));
    res.json({ count: groups.length, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs/offchain", async (req, res) => {
  try {
    const {
      serial,
      drugId,
      drugName,
      batch,
      materialsUsed,
      expiry,
      manufacturer,
      owner,
      status,
      drugHash,
      txHash,
      drugImageUrl,
      verifyBase,
    } = req.body;
    if (!serial || !drugId || !batch || !Array.isArray(materialsUsed) || materialsUsed.length === 0 || !drugHash) {
      return res.status(400).json({ error: "serial, drugId, batch, materialsUsed, drugHash are required" });
    }

    const verifyUrl = buildVerifyUrl(serial, verifyBase);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const persistedDrugImageUrl = await storage.persistImage(drugImageUrl, "drugs", serial);

    const payload = {
      serial,
      drugId,
      drugName: drugName || "",
      batch,
      materialsUsed,
      expiry,
      manufacturer,
      drugImageUrl: persistedDrugImageUrl || "",
      currentOwner: owner || manufacturer || "manufacturer",
      status: status || "Manufacturer",
      history: [{ status: status || "Manufacturer", owner: owner || manufacturer || "manufacturer", at: new Date().toISOString() }],
      drugHash,
      verifyUrl,
      qrDataUrl,
      txHash: txHash || "",
    };

    await storage.saveDrug(payload);
    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs/:serial/transfer", async (req, res) => {
  try {
    const { serial } = req.params;
    const { from, to, status } = req.body;
    const drug = await storage.getDrug(serial);
    if (!drug) return res.status(404).json({ error: "Drug not found" });

    const next = {
      ...drug,
      currentOwner: to || drug.currentOwner,
      status: status || "Distributor",
      history: [...drug.history, { owner: to || drug.currentOwner, status: status || "Distributor", at: new Date().toISOString() }],
    };

    await storage.saveDrug(next);
    const chainResult = await chain.transferDrug(serial, from || "unknown", to || "unknown", status || "Distributor");
    res.json({ ...next, txHash: chainResult.txHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs/:serial/sell", async (req, res) => {
  try {
    const { serial } = req.params;
    const { sellerAddress, sellerLabel, buyerAddress } = req.body;
    const drug = await storage.getDrug(serial);
    if (!drug) return res.status(404).json({ error: "Drug not found" });
    if (drug.status === "Sold") {
      return res.status(409).json({ error: "Hộp thuốc này đã được đánh dấu đã bán." });
    }

    const toAddress = String(buyerAddress || sellerAddress || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      return res.status(400).json({
        error: "sellerAddress hoặc buyerAddress phải là địa chỉ ví 0x... (42 ký tự).",
      });
    }

    const chainResult = await chain.transferDrug(serial, sellerLabel || "seller", toAddress, "Sold");
    const next = {
      ...drug,
      status: "Sold",
      currentOwner: sellerLabel || drug.currentOwner,
      soldTo: toAddress,
      soldAt: new Date().toISOString(),
      history: [
        ...drug.history,
        {
          status: "Sold",
          owner: sellerLabel || "seller",
          to: toAddress,
          at: new Date().toISOString(),
        },
      ],
    };
    await storage.saveDrug(next);
    res.json({ ...next, txHash: chainResult.txHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs/:serial/sell/offchain", async (req, res) => {
  try {
    const { serial } = req.params;
    const { sellerAddress, sellerLabel, buyerAddress, txHash } = req.body;
    const drug = await storage.getDrug(serial);
    if (!drug) return res.status(404).json({ error: "Drug not found" });
    if (drug.status === "Sold") {
      return res.status(409).json({ error: "Hộp thuốc này đã được đánh dấu đã bán." });
    }

    const toAddress = String(buyerAddress || sellerAddress || "").trim();
    const next = {
      ...drug,
      status: "Sold",
      currentOwner: sellerLabel || drug.currentOwner,
      soldTo: toAddress,
      soldAt: new Date().toISOString(),
      txHash: txHash || drug.txHash || "",
      history: [
        ...drug.history,
        {
          status: "Sold",
          owner: sellerLabel || "seller",
          to: toAddress,
          at: new Date().toISOString(),
          txHash: txHash || "",
        },
      ],
    };
    await storage.saveDrug(next);
    res.json(next);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drugs/:serial/transfer/offchain", async (req, res) => {
  try {
    const { serial } = req.params;
    const { from, to, status, txHash } = req.body;
    const drug = await storage.getDrug(serial);
    if (!drug) return res.status(404).json({ error: "Drug not found" });

    const next = {
      ...drug,
      currentOwner: to || drug.currentOwner,
      status: status || "Distributor",
      txHash: txHash || drug.txHash || "",
      history: [...drug.history, { owner: to || drug.currentOwner, status: status || "Distributor", at: new Date().toISOString(), txHash: txHash || "" }],
    };

    await storage.saveDrug(next);
    res.json(next);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/verify/:serial", async (req, res) => {
  try {
    const { serial } = req.params;
    const drug = await storage.getDrug(serial);
    if (!drug) return res.status(404).json({ authentic: false, message: "Không tìm thấy mã thuốc này." });

    const newHash = sha256FromParts([drug.drugId, drug.materialsUsed.join(","), drug.batch, drug.serial]);
    const legacyHash = sha256FromParts([drug.drugId, drug.materialsUsed.join(","), drug.batch]);
    const chainHash = await chain.getDrugHash(serial);
    const authentic = chainHash === newHash || chainHash === legacyHash;

    const materialsDetail = [];
    for (const materialId of drug.materialsUsed || []) {
      // eslint-disable-next-line no-await-in-loop
      const material = await storage.getMaterial(materialId);
      materialsDetail.push(
        material
          ? {
              materialId: material.materialId,
              name: material.name || "",
              origin: material.origin || "",
              certificate: material.certificate || "",
              expiry: material.expiry || "",
              supplier: material.supplier || "",
              materialImageUrl: material.materialImageUrl || "",
            }
          : {
              materialId,
              name: "Không tìm thấy trong hệ thống",
              origin: "",
              certificate: "",
              expiry: "",
              supplier: "",
              materialImageUrl: "",
            }
      );
    }

    await storage.logScan({
      serial,
      at: new Date().toISOString(),
      authentic,
      chainHash,
      newHash,
    });

    res.json({
      authentic,
      result: authentic ? "Thuốc chính hãng" : "Nghi ngờ thuốc giả",
      chainHash,
      newHash,
      drug,
      materialsDetail,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API running at http://localhost:${port}`);
});
