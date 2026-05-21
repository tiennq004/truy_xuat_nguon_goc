const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const chainMemory = {
  materials: new Map(),
  drugs: new Map(),
  transfers: [],
};

let contract = null;
let loadedAbi = null;

function loadAbiFromEnvOrFile() {
  if (process.env.CONTRACT_ABI) {
    loadedAbi = JSON.parse(process.env.CONTRACT_ABI);
    return loadedAbi;
  }

  const candidates = [
    process.env.CONTRACT_ABI_FILE,
    path.join(__dirname, "../../abi/PharmaTrace.json"),
    "../blockchain/artifacts/contracts/PharmaTrace.sol/PharmaTrace.json",
  ].filter(Boolean);

  let abiPath = "";
  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      abiPath = resolved;
      break;
    }
  }
  if (!abiPath) {
    throw new Error("Contract ABI file not found. Set CONTRACT_ABI or CONTRACT_ABI_FILE.");
  }
  const raw = fs.readFileSync(abiPath, "utf8");
  const parsed = JSON.parse(raw);
  loadedAbi = parsed.abi;
  return loadedAbi;
}

function initChain() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return { mode: "memory" };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const abi = loadAbiFromEnvOrFile();
    contract = new ethers.Contract(contractAddress, abi, signer);
    return { mode: "ethereum" };
  } catch (error) {
    console.error("Blockchain init failed. Falling back to memory mode:", error.message);
    contract = null;
    return { mode: "memory" };
  }
}

async function registerMaterial(materialId, materialHash, owner) {
  if (!contract) {
    chainMemory.materials.set(materialId, { materialHash, owner });
    return { txHash: "memory-material-register" };
  }
  const tx = await contract.registerMaterial(materialId, materialHash, owner);
  await tx.wait();
  return { txHash: tx.hash };
}

async function getMaterialHash(materialId) {
  if (!contract) return chainMemory.materials.get(materialId)?.materialHash ?? null;
  return contract.getMaterialHash(materialId);
}

async function registerDrug(serial, drugHash, owner) {
  if (!contract) {
    chainMemory.drugs.set(serial, { drugHash, owner });
    return { txHash: "memory-drug-register" };
  }
  const tx = await contract.registerDrug(serial, drugHash, owner);
  await tx.wait();
  return { txHash: tx.hash };
}

async function getDrugHash(serial) {
  if (!contract) return chainMemory.drugs.get(serial)?.drugHash ?? null;
  try {
    return await contract.getDrugHash(serial);
  } catch (_error) {
    return null;
  }
}

async function drugExists(serial) {
  if (!contract) return chainMemory.drugs.has(serial);
  try {
    const hash = await contract.getDrugHash(serial);
    return Boolean(hash);
  } catch (_error) {
    return false;
  }
}

async function transferDrug(serial, from, to, status) {
  if (!contract) {
    const record = chainMemory.drugs.get(serial);
    if (record) record.owner = to;
    chainMemory.transfers.push({ serial, from, to, status, at: new Date().toISOString() });
    return { txHash: "memory-transfer" };
  }
  const tx = await contract.transferDrug(serial, to, status);
  await tx.wait();
  return { txHash: tx.hash };
}

module.exports = {
  initChain,
  registerMaterial,
  getMaterialHash,
  registerDrug,
  getDrugHash,
  drugExists,
  transferDrug,
  getPublicConfig: () => ({
    contractAddress: process.env.CONTRACT_ADDRESS || "",
    abi: loadedAbi || loadAbiFromEnvOrFile(),
  }),
};
