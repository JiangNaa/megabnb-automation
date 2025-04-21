#!/usr/bin/env node

/**
 * MegaBNB 零值转账工具
 * 
 * 功能:
 * 从Excel文件中读取发送账户列表，向指定合约地址发送0 BNB
 */

const { readSenderList } = require('./read-excel');
const { web3, getAccountFromPrivateKey, logTransactionReceipt } = require('./utils');
require('dotenv').config();

// 目标合约地址
const CONTRACT_ADDRESS = '0xF042d211e1E58dAC1a106304A7F8568224B96CEb';

// 尝试不同的调用方法
let CALL_METHOD = 'MESSAGE'; // 可选: 'PING', 'EMPTY', 'MESSAGE', 'TRANSFER'

// 如果所有方法都不起作用，可以尝试直接转账一个微小金额
const SMALL_AMOUNT = web3.utils.toWei('0.000001', 'ether'); // 非常小的金额

/**
 * 检查地址是否为合约地址
 * @param {string} address - 要检查的地址
 * @returns {Promise<boolean>} - 如果是合约返回true，否则返回false
 */
async function isContractAddress(address) {
  const code = await web3.eth.getCode(address);
  return code !== '0x';
}

/**
 * 发送0值BNB交易
 * @param {string} privateKey - 发送方私钥
 * @param {string} toAddress - 接收方地址
 * @returns {object} - 交易收据
 */
async function sendZeroValueTransaction(privateKey, toAddress) {
  // 从私钥获取账户
  const account = getAccountFromPrivateKey(privateKey);
  const fromAddress = account.address;

  console.log(`准备从 ${fromAddress} 发送交易到 ${toAddress}...`);

  // 准备交易参数
  const gasPrice = process.env.GAS_PRICE || '5000000000';
  const gasLimit = process.env.GAS_LIMIT || '50000';
  
  // 选择不同的调用数据和值
  let callData;
  let value = '0';
  
  if (CALL_METHOD === 'PING') {
    // 使用ping()函数签名
    callData = web3.utils.sha3('ping()').substring(0, 10);
    console.log('使用ping()函数签名作为调用数据');
  } else if (CALL_METHOD === 'MESSAGE') {
    // 使用简单字符串消息
    callData = web3.utils.utf8ToHex('Hello MegaBNB');
    console.log('使用字符串消息作为调用数据');
  } else if (CALL_METHOD === 'TRANSFER') {
    // 使用微小金额转账
    callData = '0x';
    value = SMALL_AMOUNT;
    console.log(`使用微小金额转账: ${web3.utils.fromWei(SMALL_AMOUNT, 'ether')} BNB`);
  } else {
    // 使用空数据
    callData = '0x';
    console.log('使用空数据');
  }

  const estimatedGas = await web3.eth.estimateGas({
    from: fromAddress,
    to: toAddress,
    value: value,
    data: callData
  }).catch(() => gasLimit); // 估算失败时使用默认值

  const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');

  const txParams = {
    from: fromAddress,
    to: toAddress,
    value: value,
    gasPrice: gasPrice,
    gas: estimatedGas,
    nonce: nonce,
    data: callData,
    chainId: parseInt(process.env.MEGABNB_CHAIN_ID)
  };

  try {
    // 签名交易
    console.log('签名交易...');
    const signedTx = await account.signTransaction(txParams);
    
    // 发送交易
    console.log('发送交易...');
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    // 记录交易详情
    logTransactionReceipt(txReceipt, '0 BNB转账');
    
    return txReceipt;
  } catch (error) {
    console.error(`✗ 转账错误:`, error.message);
    throw error;
  }
}

/**
 * 主函数 - 执行0值转账流程
 */
async function main() {
  try {
    console.log('\n======== MegaBNB 零值转账工具 ========');
    console.log(`开始向地址 ${CONTRACT_ADDRESS} 发送交易...\n`);
    
    // 检查目标地址类型
    const code = await web3.eth.getCode(CONTRACT_ADDRESS);
    const isContract = code !== '0x';
    if (isContract) {
      console.log(`目标地址是一个智能合约，使用 ${CALL_METHOD} 方式与合约交互`);
    } else {
      console.log(`目标地址是普通账户(EOA)，将使用普通转账`);
      // 如果是普通账户，强制使用TRANSFER方式
      CALL_METHOD = 'TRANSFER';
    }
    
    // 从Excel文件中读取发送账户
    const senders = readSenderList();
    
    // 检查配置是否有效
    if (!senders || senders.length === 0) {
      throw new Error('错误: 没有找到有效的发送账户。请检查Excel文件。');
    }
    
    console.log(`找到 ${senders.length} 个发送账户`);
    
    // 处理每个账户 - 顺序执行
    const results = [];
    for (const sender of senders) {
      const senderAddress = sender.address;
      const senderPrivateKey = sender.privateKey;
      
      console.log(`\n======== 处理账户: ${senderAddress} ========`);
      try {
        // 执行0值转账
        console.log(`发送0 BNB到合约地址: ${CONTRACT_ADDRESS}`);
        const transferReceipt = await sendZeroValueTransaction(senderPrivateKey, CONTRACT_ADDRESS);
        console.log(`✅ 转账成功: ${transferReceipt.transactionHash}`);
        
        // 存储成功结果
        results.push({
          address: senderAddress,
          status: 'success',
          txHash: transferReceipt.transactionHash
        });
        
        // 等待2秒，避免发送过快
        console.log('等待2秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        // 处理失败
        console.error(`❌ 处理账户 ${senderAddress} 失败: ${error.message}`);
        results.push({
          address: senderAddress,
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
        console.log(`✅ ${index + 1}. ${result.address} - 成功 (交易哈希: ${result.txHash})`);
      } else {
        failCount++;
        console.log(`❌ ${index + 1}. ${result.address} - 失败`);
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log(`\n成功: ${successCount} 个账户 | 失败: ${failCount} 个账户`);
    
    console.log('\n======== 零值转账流程完成 ========');
    return { success: true, results };
  } catch (error) {
    console.error('\n❌ 零值转账流程失败:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
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