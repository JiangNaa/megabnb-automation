#!/usr/bin/env node

const Web3 = require('web3');
const { getAccountFromPrivateKey } = require('./utils');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 空合约字节码 (经过验证的最小化合约)
const EMPTY_CONTRACT_BYTECODE = "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea2646970667358221220d1641b2c78e5e49e8ba1c302f7bfdc441d61417aed6f6e195f268af586edd22064736f6c634300060c0033";

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署空白合约
 */
async function deployEmptyContract() {
  try {
    console.log(`开始部署空白合约...`);
    console.log(`从地址: ${fromAddress}`);
    
    // 1. 获取当前网络状态
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const balance = await web3.eth.getBalance(fromAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    console.log(`当前余额: ${balanceInEther} MegaBNB`);
    console.log(`链ID: ${chainId}`);
    console.log(`Gas 价格: ${gasPrice} wei`);
    
    // 2. 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    console.log(`账户 nonce: ${nonce}`);
    
    // 3. 创建裸交易对象 (不使用 Contract ABI)
    const txData = {
      from: fromAddress,
      data: EMPTY_CONTRACT_BYTECODE,
      gasPrice: gasPrice,
      gas: 100000, // 对空合约来说这应该足够了
      nonce: nonce,
      chainId: chainId
    };
    
    // 4. 使用私钥签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 5. 发送交易
    console.log('发送交易...');
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    // 6. 输出结果
    console.log('\n✅ 合约部署成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`区块号: ${receipt.blockNumber}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return receipt;
  } catch (error) {
    console.error(`\n❌ 合约部署失败:`);
    console.error(error.message);
    
    // 提供更详细的错误信息 (如果有)
    if (error.receipt) {
      console.error('交易收据:', error.receipt);
    }
    
    throw error;
  }
}

// 运行部署
console.log('开始测试部署最简单的空白合约...');
deployEmptyContract()
  .then(() => {
    console.log('\n测试完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  }); 