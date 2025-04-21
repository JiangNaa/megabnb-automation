const { requestFaucetTokens } = require('./faucet');
const { sendTokensToMultipleAddresses } = require('./token-transfer');
const { deployContract, getSampleERC20Contract } = require('./contract-deployer');
const { getAccountFromPrivateKey, getBalance, weiToEther, waitForTransaction, web3 } = require('./utils');
require('dotenv').config();

/**
 * Process a single address: request faucet tokens, send to recipients, deploy contract
 * @param {string} privateKey - Private key for the sender address
 * @param {string[]} recipientAddresses - Array of recipient addresses
 * @param {string|number} amountToSendPerAddress - Amount to send to each recipient address in wei
 * @param {object} [contractData] - Optional contract data with abi, bytecode and constructor args
 * @returns {object} - Results of the operations
 */
async function processAddress(privateKey, recipientAddresses, amountToSendPerAddress, contractData = null) {
  try {
    // Get account from private key
    const account = getAccountFromPrivateKey(privateKey);
    const fromAddress = account.address;
    
    console.log(`\n===== Processing address: ${fromAddress} =====`);
    
    // Get initial balance
    const initialBalance = await getBalance(fromAddress);
    console.log(`Initial balance: ${weiToEther(initialBalance)} MegaBNB`);
    
    // Step 1: Request faucet tokens
    console.log("\nStep 1: Requesting faucet tokens...");
    try {
      const faucetResult = await requestFaucetTokens(fromAddress);
      
      if (!faucetResult.success) {
        console.warn("Warning: Faucet request indicated no success. Checking balance to confirm...");
      } else {
        console.log("Faucet request reported successful. Waiting for transaction confirmation...");
        
        // 如果有交易哈希，等待交易被确认
        if (faucetResult.tx_hash) {
          try {
            await waitForTransaction(faucetResult.tx_hash);
            console.log("Faucet transaction confirmed on chain.");
          } catch (txError) {
            console.warn(`Warning: Could not confirm transaction: ${txError.message}`);
            console.log("Continuing anyway and checking balance...");
          }
        } else {
          console.warn("Warning: No transaction hash received from faucet. Checking balance directly...");
        }
      }
    
      // 无论水龙头是否报告成功，检查余额是否增加
      // Get balance after faucet
      const balanceAfterFaucet = await getBalance(fromAddress);
      console.log(`Balance after faucet: ${weiToEther(balanceAfterFaucet)} MegaBNB`);
      
      const receivedAmount = BigInt(balanceAfterFaucet) - BigInt(initialBalance);
      console.log(`Received: ${weiToEther(receivedAmount)} MegaBNB`);
      
      // 检查是否收到了代币
      if (receivedAmount <= 0) {
        console.error("No tokens received from faucet. Cannot proceed with transfers.");
        
        // 如果没有足够余额且需要发送代币，则抛出错误
        if (recipientAddresses.length > 0) {
          throw new Error("Insufficient balance for transfers. Faucet request did not increase balance.");
        }
      }
    } catch (faucetError) {
      console.error(`Faucet request failed: ${faucetError.message}`);
      
      // 检查当前余额，如果有足够的余额继续，否则终止
      const currentBalance = await getBalance(fromAddress);
      if (BigInt(currentBalance) <= 0 && recipientAddresses.length > 0) {
        throw new Error(`Faucet request failed and no existing balance available for transfers: ${faucetError.message}`);
      } else {
        console.log(`Continuing with existing balance: ${weiToEther(currentBalance)} MegaBNB`);
      }
    }
    
    // Step 2: Send tokens to recipient addresses
    if (recipientAddresses.length > 0) {
      console.log("\nStep 2: Sending tokens to recipient addresses...");
      
      // 再次检查余额，确保有足够的代币发送
      const balanceBeforeTransfer = await getBalance(fromAddress);
      const amountPerAddressBN = BigInt(amountToSendPerAddress);
      
      // 单笔交易的gas成本估算
      const gasPrice = process.env.GAS_PRICE || '5000000000';
      const gasLimit = 21000; // 简单转账的标准gas限制
      const gasPerTx = BigInt(gasPrice) * BigInt(gasLimit);
      const totalCostPerTx = amountPerAddressBN + gasPerTx;
      
      console.log(`每笔转账金额: ${weiToEther(amountToSendPerAddress)} MegaBNB`);
      console.log(`每笔交易Gas成本: ${weiToEther(gasPerTx.toString())} MegaBNB`);
      console.log(`每笔交易总成本: ${weiToEther(totalCostPerTx.toString())} MegaBNB`);
      
      // 为合约部署保留0.05 MegaBNB
      const reserveAmount = web3.utils.toWei('0.05', 'ether');
      const availableBalanceBN = BigInt(balanceBeforeTransfer) - BigInt(reserveAmount);
      console.log(`可用余额(保留合约部署资金后): ${weiToEther(availableBalanceBN.toString())} MegaBNB`);
      
      // 计算能支付多少次转账
      let possibleTxCount = 0;
      if (availableBalanceBN > totalCostPerTx) {
        possibleTxCount = Number(availableBalanceBN / totalCostPerTx);
      }
      
      // 如果当前余额不足以转账给所有接收地址
      if (possibleTxCount < recipientAddresses.length) {
        if (possibleTxCount <= 0) {
          console.log(`余额不足，无法进行任何转账。将跳过转账步骤继续部署合约。`);
          // 跳过转账步骤
        } else {
          console.log(`余额只足够转账给 ${possibleTxCount} 个地址 (原计划: ${recipientAddresses.length})`);
          // 调整接收地址数量
          const adjustedRecipients = recipientAddresses.slice(0, possibleTxCount);
          console.log(`已调整接收地址数量为 ${adjustedRecipients.length}`);
          
          const transferReceipts = await sendTokensToMultipleAddresses(
            privateKey,
            adjustedRecipients,
            amountToSendPerAddress
          );
          
          console.log(`成功发送 ${weiToEther(amountToSendPerAddress)} MegaBNB 到 ${transferReceipts.length} 个地址。`);
        }
      } else {
        // 余额足够，进行所有转账
        const transferReceipts = await sendTokensToMultipleAddresses(
          privateKey,
          recipientAddresses,
          amountToSendPerAddress
        );
        
        console.log(`成功发送 ${weiToEther(amountToSendPerAddress)} MegaBNB 到 ${transferReceipts.length} 个地址。`);
      }
      
      // Get balance after transfers
      const balanceAfterTransfers = await getBalance(fromAddress);
      console.log(`转账后余额: ${weiToEther(balanceAfterTransfers)} MegaBNB`);
    } else {
      console.log("\nStep 2: No recipient addresses provided, skipping token transfers.");
    }
    
    // Step 3: Deploy contract
    if (contractData) {
      console.log("\nStep 3: Deploying contract...");
      
      // 判断是否使用空合约部署方法（成功验证过的）
      if (contractData.preferEmpty || contractData.contractType === 'empty') {
        console.log("Using verified empty contract deployment method...");
        const { deployEmptyContract } = require('./test-contract-deploy');
        try {
          const deploymentResult = await deployEmptyContract(privateKey, fromAddress);
          console.log(`Empty contract deployed at: ${deploymentResult.contractAddress}`);
          return {
            address: fromAddress,
            contractAddress: deploymentResult.contractAddress
          };
        } catch (error) {
          console.error(`Empty contract deployment failed: ${error.message}`);
          throw error;
        }
      } else {
        // 尝试原始部署方法
        try {
          const { abi, bytecode, constructorArgs } = contractData;
          const deploymentResult = await deployContract(privateKey, abi, bytecode, constructorArgs || []);
          
          console.log(`Contract deployed at: ${deploymentResult.receipt.contractAddress}`);
          return {
            address: fromAddress,
            contractAddress: deploymentResult.receipt.contractAddress
          };
        } catch (error) {
          // 如果原始方法失败，尝试空合约部署方法
          console.error(`Original contract deployment failed: ${error.message}`);
          console.log("Trying fallback to empty contract deployment...");
          
          const { deployEmptyContract } = require('./test-contract-deploy');
          const deploymentResult = await deployEmptyContract(privateKey, fromAddress);
          
          console.log(`Fallback empty contract deployed at: ${deploymentResult.contractAddress}`);
          return {
            address: fromAddress,
            contractAddress: deploymentResult.contractAddress
          };
        }
      }
    } else {
      // 如果没有指定合约数据，使用空合约部署方法
      console.log("\nStep 3: Deploying empty contract (default)...");
      
      const { deployEmptyContract } = require('./test-contract-deploy');
      const deploymentResult = await deployEmptyContract(privateKey, fromAddress);
      
      console.log(`Empty contract deployed at: ${deploymentResult.contractAddress}`);
      return {
        address: fromAddress,
        contractAddress: deploymentResult.contractAddress
      };
    }
  } catch (error) {
    console.error(`❌ Error processing address: ${error.message}`);
    throw error;
  }
}

/**
 * 处理多个地址的自动化流程
 * @param {Array} accounts - 账户列表，每个包含 privateKey 和 address
 * @param {Array} recipientAddresses - 接收地址列表
 * @param {string} amountInWei - 发送给每个接收地址的金额(wei)
 * @param {Object} contractData - 合约数据，包含 abi、bytecode 和 constructorArgs
 * @returns {Promise} - 处理结果
 */
async function processMultipleAddresses(accounts, recipientAddresses, amountInWei, contractData = null) {
  console.log(`开始处理 ${accounts.length} 个账户的自动化流程...`);
  
  const results = [];
  
  // 处理每个账户
  for (const account of accounts) {
    try {
      console.log(`\n处理账户: ${account.address}`);
      
      // 为了简化流程，使用processAddress函数，它包含完整的水龙头请求、转账和合约部署流程
      const result = await processAddress(
        account.privateKey, 
        recipientAddresses, 
        amountInWei,
        contractData
      );
      
      results.push({
        address: account.address,
        status: 'success',
        contractAddress: result.contractAddress
      });
      
    } catch (error) {
      console.error(`❌ 处理账户 ${account.address} 时发生错误: ${error.message}`);
      results.push({
        address: account.address,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  // 汇总结果
  console.log('\n===== 自动化处理结果 =====');
  for (const result of results) {
    console.log(`${result.address}: ${result.status}`);
    if (result.contractAddress) {
      console.log(`  合约地址: ${result.contractAddress}`);
    }
  }
  
  return results;
}

/**
 * Example usage of the automation script
 */
async function runExample() {
  try {
    // 从配置文件加载账户和接收地址
    const { accounts, recipientAddresses: configRecipients, contractSettings } = require('./config');
    
    // 如果没有配置账户，使用示例账户
    const exampleAccounts = [
      {
        // This is just a placeholder private key and address
        privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        address: "0x1234567890123456789012345678901234567890"
      }
    ];
    
    // 使用配置的账户或示例账户
    const useAccounts = accounts && accounts.length > 0 ? accounts : exampleAccounts;
    
    // 使用配置的接收地址或示例接收地址
    const recipientAddresses = configRecipients && configRecipients.length > 0 ? configRecipients : [
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333"
    ];
    
    // Amount to send to each recipient (in wei)
    // For example, sending 0.01 MegaBNB to each recipient
    const amountToSendPerAddress = web3.utils.toWei("0.01", "ether");
    
    // Optional: Custom contract data
    // If not provided, a sample ERC20 token contract will be deployed
    const contractData = null; 
    
    console.log("Starting MegaBNB automation process...");
    console.log(`Processing ${useAccounts.length} account(s), sending to ${recipientAddresses.length} recipient(s)`);
    
    const results = await processMultipleAddresses(
      useAccounts,
      recipientAddresses,
      amountToSendPerAddress,
      contractData
    );
    
    console.log("\n===== Automation Process Completed =====");
    console.log("Results Summary:");
    
    results.forEach((result, index) => {
      console.log(`Account ${index + 1}: ${result.address}`);
      console.log(`  Status: ${result.status}`);
      if (result.status === 'failed') {
        console.log(`  Error: ${result.error}`);
      }
    });
    
    return results;
  } catch (error) {
    console.error("Automation process failed:", error.message);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (require.main === module) {
  runExample().catch(console.error);
}

module.exports = {
  processAddress,
  processMultipleAddresses,
  runExample
};