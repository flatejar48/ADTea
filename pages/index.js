import { useEffect, useState } from "react";
import { ethers } from "ethers";

const contractABI = [
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "Claimed",
    type: "event",
  },
];

const contractAddress = "0x854bab28e45bf6c06c9802c3f1eadf96bcb1a3eb";
const RPC = "https://tea-sepolia.g.alchemy.com/public";

export default function ClickToTxDApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [claimCount, setClaimCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
    }
    fetchClaimCountToday();
  }, []);

  const getStartOfDayTimestamp = () => {
    const now = new Date();
    const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    bangkok.setHours(7, 0, 0, 0);
    return Math.floor(bangkok.getTime() / 1000);
  };

  const fetchClaimCountToday = async () => {
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(contractAddress, contractABI, rpcProvider);
    const targetTimestamp = getStartOfDayTimestamp();
    const latestBlock = await rpcProvider.getBlockNumber();
    let fromBlock = latestBlock - 5000;
    let found = false;

    while (!found && fromBlock < latestBlock) {
      const block = await rpcProvider.getBlock(fromBlock);
      if (block.timestamp >= targetTimestamp) {
        found = true;
        break;
      }
      fromBlock += 50;
    }

    const logs = await contract.queryFilter("Claimed", fromBlock, "latest");
    const uniqueAddresses = new Set();

    logs.forEach((log) => {
      uniqueAddresses.add(log.args.user.toLowerCase());
    });

    setClaimCount(uniqueAddresses.size);
  };

  const connectWallet = async () => {
    try {
      if (!provider) return;
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSigner(signer);
      setWalletAddress(address);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const addTeaSepoliaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x27EA",
            chainName: "Tea Sepolia Testnet",
            nativeCurrency: {
              name: "TEA",
              symbol: "TEA",
              decimals: 18,
            },
            rpcUrls: ["https://tea-sepolia.g.alchemy.com/public"],
            blockExplorerUrls: ["https://sepolia.tea.xyz/"],
          },
        ],
      });
      console.log("✅ Tea Sepolia Testnet added to MetaMask");
    } catch (err) {
      console.error("❌ Error adding Tea Sepolia Testnet:", err);
    }
  };

  const handleClickTx = async () => {
    if (!signer) return;
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.claim();
      await tx.wait();
      setTxHash(tx.hash);
      fetchClaimCountToday();
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1F1C2C] to-[#928DAB] text-white px-6 py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">🫖 Tea Protocol DApp</h1>
        <p className="text-sm text-gray-300">Claim your reward on-chain</p>
        {walletAddress && (
          <p className="text-green-300 mt-2 text-xs">Connected: {walletAddress}</p>
        )}
      </div>

      <div className="flex flex-col items-center space-y-4">
        {walletAddress ? (
          <>
            <button
              onClick={handleClickTx}
              className="w-48 h-48 rounded-full bg-teal-500 hover:bg-teal-600 text-xl font-semibold flex items-center justify-center shadow-lg transition"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Let’s Go"}
            </button>
            {txHash && (
              <p className="text-sm text-green-400">
                TX Hash: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">{txHash}</a>
              </p>
            )}
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-3 rounded-xl shadow-md"
          >
            Connect Wallet
          </button>
        )}
      </div>

      <div className="fixed bottom-4 right-4 bg-black bg-opacity-60 text-xs px-4 py-2 rounded-lg">
        👥 Claimed Today: {claimCount}
      </div>

      <div className="fixed bottom-4 left-4 flex gap-3">
        <button
          onClick={addTeaSepoliaNetwork}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs px-4 py-2 rounded-md shadow"
        >
          Add Tea Sepolia
        </button>

        <a
          href="https://faucet-sepolia.tea.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-md shadow"
        >
          Get TEA
        </a>
      </div>
    </div>
  );
}
