#!/usr/bin/env node

const Web3 = require('web3');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 更简单的存储合约字节码 - 使用更旧的Solidity 0.4.25编译，应该有更好的兼容性
// 这是一个极简的存储合约，只有一个变量、一个getter和一个setter
const SIMPLE_STORAGE_BYTECODE = "0x6060604052341561000f57600080fd5b5b60d08061001e6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806360fe47b11460475780636d4ce63c14606d575b600080fd5b3415605157600080fd5b606b60048080359060200190919050506093565b005b3415607757600080fd5b607d609e565b6040518082815260200191505060405180910390f35b806000819055505b50565b6000805490505b905600a165627a7a723058202b2d3f25739bc9f10eac3f89f0bdbabe19958655e7a1a691b544b7a27f2517730029";

// 合约的ABI
const SIMPLE_STORAGE_ABI = [
  {
    "constant": false,
    "inputs": [{"name": "x", "type": "uint256"}],
    "name": "set",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "get",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署存储合约 - 使用与成功的空合约相同的策略
 */
async function deployStorageContract() {
  try {
    console.log(`开始部署简单存储合约...`);
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
    
    // 创建交易对象 - 使用已知成功的gas配置
    const txData = {
      from: fromAddress,
      data: SIMPLE_STORAGE_BYTECODE,
      gasPrice: gasPrice,
      gas: 70000, // 使用接近成功值的gas限制
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    console.log(`使用 Gas 限制: ${txData.gas}`);
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
    
    // 如果失败，尝试使用更低的gas限制
    console.log('\n尝试使用更低的gas限制...');
    return tryWithLowerGas();
  }
}

/**
 * 使用更低的gas限制尝试部署
 */
async function tryWithLowerGas() {
  try {
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    // 使用更低的gas限制
    const txData = {
      from: fromAddress,
      data: SIMPLE_STORAGE_BYTECODE,
      gasPrice: gasPrice,
      gas: 60000, // 尝试更低的gas限制
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    console.log(`使用更低的 Gas 限制: ${txData.gas}`);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    console.log('\n✅ 合约部署成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return {
      receipt,
      contractAddress: receipt.contractAddress
    };
  } catch (error) {
    console.error(`\n❌ 使用更低gas的部署也失败了:`);
    console.error(error.message);
    
    // 最后一次尝试，使用极低的gas
    console.log('\n进行最后一次尝试，使用极低的gas限制...');
    return tryWithExtremelyLowGas();
  }
}

/**
 * 使用极低的gas限制尝试部署
 */
async function tryWithExtremelyLowGas() {
  try {
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    // 使用极低的gas限制
    const txData = {
      from: fromAddress,
      data: SIMPLE_STORAGE_BYTECODE,
      gasPrice: gasPrice, 
      gas: 50000, // 尝试极低的gas限制
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    console.log(`使用极低的 Gas 限制: ${txData.gas}`);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    console.log('\n✅ 最后尝试成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return {
      receipt,
      contractAddress: receipt.contractAddress
    };
  } catch (error) {
    console.error(`\n❌ 所有尝试均失败:`);
    console.error(error.message);
    throw error;
  }
}

/**
 * 与合约交互，测试其功能
 */
async function interactWithContract(contractAddress) {
  try {
    console.log('\n开始与合约交互...');
    
    // 创建合约实例
    const contract = new web3.eth.Contract(SIMPLE_STORAGE_ABI, contractAddress);
    
    // 1. 读取当前存储的值
    console.log('读取当前存储的值...');
    const initialValue = await contract.methods.get().call();
    console.log(`当前存储的值: ${initialValue}`);
    
    // 2. 设置一个新值
    const newValue = 42;
    console.log(`设置新值: ${newValue}`);
    
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    // 编码方法调用
    const data = contract.methods.set(newValue).encodeABI();
    
    // 创建交易对象
    const txData = {
      from: fromAddress,
      to: contractAddress,
      data: data,
      gasPrice: gasPrice,
      gas: 35000, // 方法调用使用更低的gas
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    console.log(`✅ 值设置成功!`);
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    // 3. 读取更新后的值
    console.log('读取更新后的值...');
    const updatedValue = await contract.methods.get().call();
    console.log(`更新后的值: ${updatedValue}`);
    
    if (updatedValue == newValue) {
      console.log('\n🎉 合约功能测试成功! 存储功能正常工作。');
    } else {
      console.log(`\n❓ 合约返回的值 (${updatedValue}) 与设置的值 (${newValue}) 不匹配。`);
    }
  } catch (error) {
    console.error('\n❌ 与合约交互失败:');
    console.error(error.message);
  }
}

// 运行部署和交互测试
console.log('开始测试部署存储合约...');
deployStorageContract()
  .then(async (result) => {
    console.log('\n部署成功!');
    console.log(`合约地址: ${result.contractAddress}`);
    
    // 等待几秒确保合约部署完成
    console.log('等待3秒确保合约部署完成...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 测试与合约的交互
    await interactWithContract(result.contractAddress);
    
    process.exit(0);
  })
  .catch(error => {
    console.error('部署测试失败:', error.message);
    process.exit(1);
  }); 