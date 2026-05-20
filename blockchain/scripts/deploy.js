import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/PharmaTrace.sol/PharmaTrace.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const rpcUrl = process.env.DEPLOY_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.DEPLOY_PRIVATE_KEY ||
    process.env.WALLET_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log("Deployer:", wallet.address);
  const address = await contract.getAddress();
  console.log("PharmaTrace deployed to:", address);
  console.log(
    "Use CONTRACT_ABI_FILE=../blockchain/artifacts/contracts/PharmaTrace.sol/PharmaTrace.json in backend .env"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
