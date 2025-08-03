export const CONTRACT_ADDRESS = "0xd8540A08f770BAA3b66C4d43728CDBDd1d7A9c3b"; // your deployed address

export const BNB_CHAIN = {
  id: 97,
  name: "BNB Testnet",
  network: "bnbTestnet",
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    },
    public: {
      http: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
}
