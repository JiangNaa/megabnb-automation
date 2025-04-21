#!/usr/bin/env node

/**
 * MegaBNB 自动化工具主入口
 * 
 * 功能:
 * 1. 从Excel文件中读取发送账户和接收地址
 * 2. 从水龙头请求代币
 * 3. 转账到指定接收地址
 * 4. 部署智能合约
 */

const { processAddress } = require('./index');
const { showAccountsSummary, readSenderList, readRecipientList } = require('./read-excel');
const { contractSettings } = require('./config');
const { web3 } = require('./utils');
const { requestFaucetTokens } = require('./faucet');
const { sendTokens } = require('./token-transfer');
const { deployEmptyContract } = require('./test-contract-deploy');

/**
 * 主函数 - 执行完整自动化流程
 */
async function main() {
  try {
    console.log('\n======== MegaBNB 自动化工具 ========');
    console.log('正在执行完整自动化流程...\n');
    
    // 从Excel文件中读取数据而不是配置
    const senders = readSenderList();
    const recipients = readRecipientList();
    
    // 显示账户信息摘要
    showAccountsSummary();
    
    // 检查配置是否有效
    if (!senders || senders.length === 0) {
      throw new Error('错误: 没有找到有效的发送账户。请检查Excel文件或配置。');
    }
    
    if (!recipients || recipients.length === 0) {
      throw new Error('错误: 没有找到有效的接收地址。请检查Excel文件或配置。');
    }
    
    // 设置转账金额
    const amountToSendPerAddress = web3.utils.toWei('0.01', 'ether'); // 每个地址发送0.01 MegaBNB
    
    // 创建一对一的映射关系
    const pairings = createOneToOnePairings(senders, recipients);
    console.log(`\n一对一转账映射关系 (共 ${pairings.length} 对):`);
    pairings.forEach((pair, index) => {
      console.log(`${index+1}. ${pair.sender.address} -> ${pair.recipient}`);
    });
    
    // 处理每一对配对关系 - 完全顺序执行
    const results = [];
    for (const pair of pairings) {
      const senderAddress = pair.sender.address;
      const senderPrivateKey = pair.sender.privateKey;
      const recipientAddress = pair.recipient;
      
      console.log(`\n======== 处理账户: ${senderAddress} ========`);
      try {
        // 步骤1: 从水龙头请求代币
        console.log(`\n1️⃣ 从水龙头请求代币到: ${senderAddress}`);
        try {
          const faucetResult = await requestFaucetTokens(senderAddress);
          if (faucetResult.success) {
            console.log(`✅ 成功从水龙头获取测试代币`);
          } else if (faucetResult.hasBalance) {
            console.log(`⚠️ 水龙头请求失败，但账户已有余额，继续执行`);
          } else {
            console.warn(`⚠️ 水龙头请求失败，尝试继续执行`);
          }
        } catch (faucetError) {
          console.error(`❌ 水龙头请求错误: ${faucetError.message}`);
          // 检查余额，如果有足够余额则继续
          const balance = await web3.eth.getBalance(senderAddress);
          if (BigInt(balance) > BigInt(amountToSendPerAddress)) {
            console.log(`当前余额: ${web3.utils.fromWei(balance, 'ether')} MegaBNB，足够继续执行`);
          } else {
            throw new Error(`余额不足，无法继续执行: ${web3.utils.fromWei(balance, 'ether')} MegaBNB`);
          }
        }
        
        // 等待余额确认
        console.log('等待3秒让交易确认...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 步骤2: 转账到一个接收地址
        console.log(`\n2️⃣ 转账 0.01 MegaBNB 到: ${recipientAddress}`);
        try {
          // 检查余额是否足够
          const balanceBeforeTransfer = await web3.eth.getBalance(senderAddress);
          console.log(`转账前余额: ${web3.utils.fromWei(balanceBeforeTransfer, 'ether')} MegaBNB`);
          
          if (BigInt(balanceBeforeTransfer) < BigInt(amountToSendPerAddress)) {
            throw new Error(`余额不足，无法执行转账: ${web3.utils.fromWei(balanceBeforeTransfer, 'ether')} MegaBNB`);
          }
          
          // 执行转账
          const transferReceipt = await sendTokens(senderPrivateKey, recipientAddress, amountToSendPerAddress);
          console.log(`✅ 转账成功: ${transferReceipt.transactionHash}`);
          
          // 检查转账后余额
          const balanceAfterTransfer = await web3.eth.getBalance(senderAddress);
          console.log(`转账后余额: ${web3.utils.fromWei(balanceAfterTransfer, 'ether')} MegaBNB`);
        } catch (transferError) {
          console.error(`❌ 转账失败: ${transferError.message}`);
          throw transferError; // 转账失败则中断该账户的处理
        }
        
        // 等待转账确认
        console.log('等待3秒让交易确认...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 步骤3: 部署合约
        console.log(`\n3️⃣ 从账户 ${senderAddress} 部署空合约`);
        try {
          const deployResult = await deployEmptyContract(senderPrivateKey, senderAddress);
          console.log(`✅ 合约部署成功: ${deployResult.contractAddress}`);
          
          // 存储成功结果
          results.push({
            address: senderAddress,
            recipient: recipientAddress,
            contractAddress: deployResult.contractAddress,
            status: 'success'
          });
        } catch (deployError) {
          console.error(`❌ 合约部署失败: ${deployError.message}`);
          throw deployError; // 部署失败则中断该账户的处理
        }
        
      } catch (error) {
        // 处理该对失败
        console.error(`❌ 处理账户 ${senderAddress} 失败: ${error.message}`);
        results.push({
          address: senderAddress,
          recipient: recipientAddress,
          status: 'failed',
          error: error.message
        });
      }
      
      console.log(`\n======== 完成处理账户: ${senderAddress} ========`);
    }
    
    // 显示执行结果摘要
    console.log('\n===== 执行结果摘要 =====');
    
    let successCount = 0;
    let failCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'success') {
        successCount++;
        console.log(`✅ ${index + 1}. ${result.address} -> ${result.recipient} - 成功`);
        console.log(`   合约地址: ${result.contractAddress}`);
      } else {
        failCount++;
        console.log(`❌ ${index + 1}. ${result.address} -> ${result.recipient} - 失败`);
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log(`\n成功: ${successCount} 对 | 失败: ${failCount} 对`);
    
    console.log('\n======== 自动化流程完成 ========');
    return { success: true, results };
  } catch (error) {
    console.error('\n❌ 自动化流程失败:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 创建一对一的发送方和接收方配对
 * @param {Array} senders - 发送方账户列表
 * @param {Array} recipients - 接收方地址列表
 * @returns {Array} - 配对数组
 */
function createOneToOnePairings(senders, recipients) {
  const pairings = [];
  const count = Math.min(senders.length, recipients.length);
  
  for (let i = 0; i < count; i++) {
    pairings.push({
      sender: senders[i],
      recipient: recipients[i]
    });
  }
  
  if (senders.length > recipients.length) {
    console.log(`⚠️ 警告: 发送账户数量(${senders.length})多于接收地址数量(${recipients.length})，多余的发送账户将被忽略`);
  }
  
  if (recipients.length > senders.length) {
    console.log(`⚠️ 警告: 接收地址数量(${recipients.length})多于发送账户数量(${senders.length})，多余的接收地址将被忽略`);
  }
  
  return pairings;
}

// 直接执行时调用主函数
if (require.main === module) {
  main()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('未捕获错误:', error);
      process.exit(1);
    });
}

module.exports = { main }; 