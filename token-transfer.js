const { web3, isValidAddress, getAccountFromPrivateKey, waitForTransaction, logTransactionReceipt } = require('./utils');
require('dotenv').config();

/**
 * Sends native tokens from the sender address to a recipient address
 * @param {string} privateKey - Private key of the sender
 * @param {string} toAddress - Recipient address
 * @param {string|number} amount - Amount to send in wei
 * @returns {object} - Transaction receipt
 */
async function sendTokens(privateKey, toAddress, amount) {
  // Validate recipient address
  if (!isValidAddress(toAddress)) {
    throw new Error(`Invalid recipient address: ${toAddress}`);
  }

  // Get sender account from private key
  const account = getAccountFromPrivateKey(privateKey);
  const fromAddress = account.address;

  console.log(`Preparing to send ${amount} wei from ${fromAddress} to ${toAddress}...`);

  // Check if sender has enough balance
  const balance = await web3.eth.getBalance(fromAddress);
  if (BigInt(balance) < BigInt(amount)) {
    throw new Error(`Insufficient balance: ${balance} wei. Required: ${amount} wei.`);
  }

  // Prepare transaction parameters
  const gasPrice = process.env.GAS_PRICE || '5000000000';
  const gasLimit = process.env.GAS_LIMIT || '21000';
  
  const estimatedGas = await web3.eth.estimateGas({
    from: fromAddress,
    to: toAddress,
    value: amount
  }).catch(() => gasLimit); // Use default if estimation fails

  const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');

  const txParams = {
    from: fromAddress,
    to: toAddress,
    value: amount,
    gasPrice: gasPrice,
    gas: estimatedGas,
    nonce: nonce,
    chainId: parseInt(process.env.MEGABNB_CHAIN_ID)
  };

  try {
    // Sign transaction
    console.log('Signing transaction...');
    const signedTx = await account.signTransaction(txParams);
    
    // Send transaction
    console.log('Sending transaction...');
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    // Log transaction details
    logTransactionReceipt(txReceipt, 'Token Transfer');
    
    return txReceipt;
  } catch (error) {
    console.error(`✗ Token transfer error:`, error.message);
    throw error;
  }
}

/**
 * Sends tokens to multiple recipient addresses
 * @param {string} privateKey - Private key of the sender
 * @param {string[]} toAddresses - Array of recipient addresses
 * @param {string|number} amountPerAddress - Amount to send to each address in wei
 * @returns {object[]} - Array of transaction receipts
 */
async function sendTokensToMultipleAddresses(privateKey, toAddresses, amountPerAddress) {
  const receipts = [];
  
  // Validate all addresses first
  for (const address of toAddresses) {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid recipient address: ${address}`);
    }
  }
  
  console.log(`Preparing to send ${amountPerAddress} wei to each of ${toAddresses.length} addresses...`);
  
  // Send tokens to each address sequentially
  for (const toAddress of toAddresses) {
    try {
      const receipt = await sendTokens(privateKey, toAddress, amountPerAddress);
      receipts.push(receipt);
      
      // Wait a short time between transactions to prevent nonce issues
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to send tokens to ${toAddress}:`, error.message);
      // Continue with the next address even if one fails
    }
  }
  
  return receipts;
}

module.exports = {
  sendTokens,
  sendTokensToMultipleAddresses
}; 