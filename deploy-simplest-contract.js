#!/usr/bin/env node

const Web3 = require('web3');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 一个已知能工作的最简单合约字节码 - 没有任何功能的空合约
const EMPTY_CONTRACT_BYTECODE = "0x6080604052348015600f57600080fd5b50603c80601d6000396000f3fe6080604052600080fdfea265627a7a723058205bd231c7695a074f70485e1ebb87dfc87d67e3035131e487c759aa88d8d4551c64736f6c63430005090032";

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署最简单的空合约 - 使用已知可工作的配置
 */
async function deploySimplestContract() {
  try {
    console.log(`开始部署最简单的空合约...`);
    console.log(`从地址: ${fromAddress}`);
    
    // 获取当前网络状态
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const balance = await web3.eth.getBalance(fromAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    console.log(`当前余额: ${balanceInEther} MegaBNB`);
    console.log(`链ID: ${chainId}`);
    console.log(`Gas 价格: ${gasPrice} wei`);
    
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    console.log(`账户 nonce: ${nonce}`);
    
    // 使用已知成功的配置创建交易对象
    // 注意：将gas限制设置为70000，接近之前成功交易的67072
    const txData = {
      from: fromAddress,
      data: EMPTY_CONTRACT_BYTECODE,
      gasPrice: gasPrice,
      gas: 70000, // 使用接近成功交易的gas限额
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    console.log(`使用 Gas 限制: 70000`);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    // 输出结果
    console.log('\n✅ 合约部署成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`区块号: ${receipt.blockNumber}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return {
      receipt,
      contractAddress: receipt.contractAddress
    };
  } catch (error) {
    console.error(`\n❌ 合约部署失败:`);
    console.error(error.message);
    
    if (error.receipt) {
      console.error('交易收据:', error.receipt);
    }
    
    throw error;
  }
}

/**
 * 如果第一次部署失败，尝试更低的gas限制
 */
async function tryWithDifferentGasLimits() {
  try {
    return await deploySimplestContract();
  } catch (error) {
    console.log('\n第一次尝试失败，尝试更低的gas限制...');
    
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    // 使用更低的gas限制
    const txData = {
      from: fromAddress,
      data: EMPTY_CONTRACT_BYTECODE,
      gasPrice: gasPrice,
      gas: 50000, // 更低的gas限制
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    console.log(`使用较低的 Gas 限制: 50000`);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    console.log('\n✅ 第二次尝试成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return {
      receipt,
      contractAddress: receipt.contractAddress
    };
  }
}

// 运行部署
console.log('开始测试部署最简单的合约...');
tryWithDifferentGasLimits()
  .then((result) => {
    console.log('\n测试完成!');
    console.log(`合约地址: ${result.contractAddress}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('所有测试尝试均失败:', error.message);
    process.exit(1);
  }); 