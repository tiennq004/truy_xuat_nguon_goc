import "dotenv/config";

const networks = {
  localhost: {
    type: "http",
    url: "http://127.0.0.1:8545",
  },
};

if (process.env.DEPLOY_RPC_URL) {
  networks.sepolia = {
    type: "http",
    url: process.env.DEPLOY_RPC_URL,
    accounts: process.env.DEPLOY_PRIVATE_KEY ? [process.env.DEPLOY_PRIVATE_KEY] : [],
  };
}

export default {
  solidity: "0.8.24",
  networks,
};
