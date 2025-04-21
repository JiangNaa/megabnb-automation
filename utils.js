const Web3 = require('web3');
const axios = require('axios');
require('dotenv').config();

// Initialize Web3 with the MegaBNB RPC URL
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * Validates an Ethereum address
 * @param {string} address - Ethereum address to validate
 * @returns {boolean} - Whether the address is valid
 */
function isValidAddress(address) {
  return web3.utils.isAddress(address);
}

/**
 * Gets the account from a private key
 * @param {string} privateKey - Private key (with or without 0x prefix)
 * @returns {object} - Web3 account object
 */
function getAccountFromPrivateKey(privateKey) {
  // Ensure the private key has the 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  return web3.eth.accounts.privateKeyToAccount(formattedKey);
}

/**
 * Gets the current balance of an address
 * @param {string} address - Ethereum address
 * @returns {string} - Balance in wei
 */
async function getBalance(address) {
  const balance = await web3.eth.getBalance(address);
  return balance;
}

/**
 * Logs a transaction receipt with relevant information
 * @param {object} receipt - Transaction receipt
 * @param {string} operation - Description of the operation
 */
function logTransactionReceipt(receipt, operation) {
  console.log(`\n===== ${operation} =====`);
  console.log(`Transaction Hash: ${receipt.transactionHash}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed}`);
  console.log(`Status: ${receipt.status ? 'Success' : 'Failed'}`);
  if (receipt.contractAddress) {
    console.log(`Contract Address: ${receipt.contractAddress}`);
  }
  console.log('=====================\n');
}

/**
 * Wait for a transaction to be mined
 * @param {string} txHash - Transaction hash to wait for
 * @returns {object} - Transaction receipt
 */
async function waitForTransaction(txHash) {
  console.log(`Waiting for transaction ${txHash} to be mined...`);
  const receipt = await web3.eth.getTransactionReceipt(txHash);
  if (receipt) {
    return receipt;
  }
  
  // Wait for 2 seconds before checking again
  await new Promise(resolve => setTimeout(resolve, 2000));
  return waitForTransaction(txHash);
}

/**
 * Convert wei to ether
 * @param {string|number} wei - Amount in wei
 * @returns {string} - Amount in ether
 */
function weiToEther(wei) {
  return web3.utils.fromWei(wei.toString(), 'ether');
}

/**
 * Convert ether to wei
 * @param {string|number} ether - Amount in ether
 * @returns {string} - Amount in wei
 */
function etherToWei(ether) {
  return web3.utils.toWei(ether.toString(), 'ether');
}

module.exports = {
  web3,
  isValidAddress,
  getAccountFromPrivateKey,
  getBalance,
  logTransactionReceipt,
  waitForTransaction,
  weiToEther,
  etherToWei
}; 