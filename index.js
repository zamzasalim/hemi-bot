import { 
  http, 
  createWalletClient, 
  createPublicClient, 
  parseEther, 
  encodeFunctionData 
} from "viem";
import { 
  hemiPublicBitcoinKitActions, 
  hemiPublicOpNodeActions, 
  hemiSepolia 
} from "hemi-viem";
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from "viem/chains";
import logger from './logger.js'; 
import hemiABI from './contract/abi.js'; 
import WETHABI from './chain/WETH.js'; 
import UNIABI from './chain/uniswap.js'; 
import { accounts } from './privateKeys.js'; 
import printBanner from './contract/banner.js'; 

console.clear();
printBanner();

class EthereumClient {
  constructor(privateKey) {
    this.parameters = { chain: sepolia, transport: http() };
    this.account = privateKeyToAccount(privateKey);
    
    this.walletClient = createWalletClient({
      account: this.account,
      ...this.parameters
    });

    this.publicClient = createPublicClient(this.parameters);
  }

  async depositETH(minGasLimit, extraData, amount, transactionNumber) {
    const proxyContractAddress = '0xc94b1BEe63A3e101FE5F71C80F912b4F4b055925';
    const sendEth = parseEther(amount.toString());
    const { address } = this.account;
    const balance = await this.publicClient.getBalance({ address });

    // Total cost calculation
    const gasPrice = await this.publicClient.getGasPrice();
    const totalCost = (BigInt(minGasLimit) * BigInt(gasPrice)) + BigInt(sendEth.toString());

    if (balance < totalCost) {
      logger.error(`Insufficient balance, please deposit enough ETH. Balance: ${balance}`);
      throw new Error('Invalid balance');
    }

    const data = encodeFunctionData({
      abi: hemiABI,
      functionName: 'depositETH',
      args: [minGasLimit, extraData]
    });

    try {
      const tx = await this.walletClient.sendTransaction({
        to: proxyContractAddress,
        data,
        value: sendEth,
      });

      logger.info(`\x1b[92mTx Hash: ${tx}\nBridge: depositETH | Amount: ${amount} ETH | Total Tx: ${transactionNumber}\x1b[0m`);
      return tx; 
    } catch (error) {
      logger.error(`Error sending transaction: ${error.message}`);
      throw error;
    }
  }
}

class HemiSepolia {
  constructor(privateKey) {
    this.parameters = { chain: hemiSepolia, transport: http() };
    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient(this.parameters)
      .extend(hemiPublicOpNodeActions())
      .extend(hemiPublicBitcoinKitActions());

    this.walletClient = createWalletClient({
      account: this.account,
      ...this.parameters
    });
  }

  async swapWeth(transactionNumber) {
    const WethContractAddress = '0x0C8aFD1b58aa2A5bAd2414B861D8A7fF898eDC3A';
    const sendEth = parseEther('0.0001');
    const { address } = this.account;
    const balance = await this.publicClient.getBalance({ address });

    const gasPrice = await this.publicClient.getGasPrice();
    const totalCost = (BigInt(100000) * BigInt(gasPrice)) + BigInt(sendEth.toString()); // Adjust gas limit as necessary

    if (balance < totalCost) {
      logger.error(`Insufficient balance for WETH swap`);
      throw new Error('Insufficient balance for WETH swap');
    }

    const data = encodeFunctionData({
      abi: WETHABI,
      functionName: 'deposit',
    });

    try {
      const tx = await this.walletClient.sendTransaction({
        to: WethContractAddress,
        data,
        value: sendEth,
      });

      logger.info(`\x1b[92mWETH Transaction sent: ${tx}\nBridge: WETH Swap | Amount: ${sendEth} | Total Tx: ${transactionNumber}\x1b[0m`);
      return tx; 
    } catch (error) {
      logger.error(`Error swapping WETH: ${error.message}`);
      throw error;
    }
  }

  async swapDai(transactionNumber) {
    const UniswapContractAddress = '0xA18019E62f266C2E17e33398448e4105324e0d0F';
    const sendEth = parseEther('0.0001');
    const { address } = this.account;
    const balance = await this.publicClient.getBalance({ address });

    const gasPrice = await this.publicClient.getGasPrice();
    const gasLimit = 100000; // Set an appropriate gas limit

    const totalCost = (BigInt(gasLimit) * BigInt(gasPrice)) + BigInt(sendEth.toString());

    if (balance < totalCost) {
        logger.error(`Insufficient balance for DAI swap`);
        throw new Error('Insufficient balance for DAI swap');
    }

    const data = encodeFunctionData({
      abi: UNIABI,
      functionName: 'execute',
      args: [
        '0x0b00',
        [
          "0x000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a4000",
          "0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000457fd60a0614bb5400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b0c8afd1b58aa2a5bad2414b861d8a7ff898edc3a000bb8ec46e0efb2ea8152da0327a5eb3ff9a43956f13e000000000000000000000000000000000000000000"
        ],
        Math.floor(Date.now() / 1000) + 60 * 20 + ''
      ]
    });

    try {
      const tx = await this.walletClient.sendTransaction({
        to: UniswapContractAddress,
        data,
        value: sendEth,
      });

      logger.info(`\x1b[92mDAI Tx Sent: ${tx}\nBridge: DAI Swap | Amount: ${sendEth} | Total Tx: ${transactionNumber}\x1b[0m`);
      return tx; 
    } catch (error) {
      logger.error(`Error swapping DAI: ${error.message}`);
      logger.error(`Request Arguments:\nfrom: ${address}\nto: ${UniswapContractAddress}\nvalue: ${sendEth}\ndata: ${data}`);
      throw error;
    }
  }
}

(async () => {
  let completedTransactions = 0;

  for (const account of accounts) {
    const { privateKey } = account;
    let formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;

    try {
      const accountInfo = privateKeyToAccount(formattedPrivateKey);
    } catch (error) {
      logger.error(`Error converting account: ${error.message} (Private Key: ${formattedPrivateKey})`);
      continue;
    }

    try {
      const ethClient = new EthereumClient(formattedPrivateKey);
      await ethClient.depositETH(200000, '0x', 0.1, ++completedTransactions);

      await new Promise(resolve => setTimeout(resolve, Math.random() * (2000) + 8000)); // Delay 8-10 seconds

      const hemiSepolia = new HemiSepolia(formattedPrivateKey);
      await hemiSepolia.swapWeth(++completedTransactions);

      await new Promise(resolve => setTimeout(resolve, Math.random() * (2000) + 8000)); // Delay 8-10 seconds
      await hemiSepolia.swapDai(++completedTransactions);
    } catch (error) {
      logger.error(`Error during operations: ${error.message}`);
    }
  }

  logger.info(`Total transactions completed: ${completedTransactions}\x1b[0m`);
})();
