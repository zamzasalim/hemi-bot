import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import logger from './logger.js';
import fs from 'fs';
import readline from 'readline';

// Wallet class for generating wallet information
class Wallet {
  constructor() {
    // Generate a new private key
    this.privateKey = generatePrivateKey();
    // Generate account information (address and public key) from the private key
    this.account = privateKeyToAccount(this.privateKey);
  }

  // Return wallet information
  getInfo() {
    return {
      privateKey: this.privateKey,
      address: this.account.address,
      publicKey: this.account.publicKey,
    };
  }
}

async function createWallets(count) {
  const wallets = [];

  for (let i = 0; i < count; i++) {
    const wallet = new Wallet();
    wallets.push(wallet.getInfo());
    logger.info(`Wallet ${i + 1} created successfully: ${wallet.getInfo().address}`);
  }

  const configContent = `

  await saveToFile('PrivateKeys.js', configContent);
}

function saveToFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) {
        logger.error(`Error saving ${filename}: ${err.message}`); 
        reject(err);
      } else {
        logger.info(`${filename} saved successfully`); 
        resolve();
      }
    });
  });
}

async function getUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Please enter the number of wallets to create: ', (answer) => {
      rl.close();
      resolve(parseInt(answer, 10)); 
    });
  });
}

(async () => {
  const numberOfWallets = await getUserInput(); 
  if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
    console.error('Please enter a valid positive integer for the number of wallets.');
    return;
  }
  await createWallets(numberOfWallets);
})();
