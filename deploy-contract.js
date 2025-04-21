#!/usr/bin/env node

const Web3 = require('web3');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 空合约字节码 - 已知可工作
const EMPTY_CONTRACT_BYTECODE = "0x6080604052348015600f57600080fd5b50603c80601d6000396000f3fe6080604052600080fdfea265627a7a723058205bd231c7695a074f70485e1ebb87dfc87d67e3035131e487c759aa88d8d4551c64736f6c63430005090032";

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署空合约 - 使用已知成功的配置
 */
async function deployEmptyContract() {
  try {
    console.log(`=== 开始部署空合约 ===`);
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
    const txData = {
      from: fromAddress,
      data: EMPTY_CONTRACT_BYTECODE,
      gasPrice: gasPrice,
      gas: 70000, // 使用已知成功的gas值
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
    
    throw error;
  }
}

/**
 * 检查合约地址 - 验证合约是否部署成功
 */
async function verifyContract(contractAddress) {
  try {
    console.log(`\n=== 验证合约部署 ===`);
    console.log(`合约地址: ${contractAddress}`);
    
    // 检查合约地址上的代码
    const code = await web3.eth.getCode(contractAddress);
    
    if (code === '0x' || code === '0x0') {
      console.log('❌ 合约验证失败: 地址上没有合约代码');
      return false;
    }
    
    console.log(`✅ 合约验证成功: 合约代码已部署`);
    console.log(`代码长度: ${code.length} 字节`);
    return true;
  } catch (error) {
    console.error('❌ 合约验证失败:', error.message);
    return false;
  }
}

/**
 * 发送交易到合约 - 尝试与合约交互
 */
async function sendTransactionToContract(contractAddress) {
  try {
    console.log(`\n=== 尝试向合约发送交易 ===`);
    
    // 准备交易数据
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
    // 由于是空合约，我们只发送一个带有少量以太币的交易
    const txData = {
      from: fromAddress,
      to: contractAddress,
      value: web3.utils.toWei('0.0001', 'ether'), // 发送极少量的代币
      gasPrice: gasPrice,
      gas: 30000, // 方法调用需要的gas更少
      nonce: nonce,
      chainId: chainId
    };
    
    // 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 发送交易
    console.log('发送交易...');
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    console.log(`✅ 交易发送成功!`);
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    return receipt;
  } catch (error) {
    console.error('\n❌ 交易发送失败:');
    console.error(error.message);
    return null;
  }
}

/**
 * 获取交易收据和合约信息
 */
async function getTransactionInfo(txHash) {
  try {
    console.log(`\n=== 获取交易信息 ===`);
    console.log(`交易哈希: ${txHash}`);
    
    // 获取交易收据
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    console.log(`交易状态: ${receipt.status ? '成功' : '失败'}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    if (receipt.contractAddress) {
      console.log(`合约地址: ${receipt.contractAddress}`);
    }
    
    // 获取交易详情
    const tx = await web3.eth.getTransaction(txHash);
    console.log(`Gas 价格: ${web3.utils.fromWei(tx.gasPrice, 'gwei')} Gwei`);
    
    return { receipt, tx };
  } catch (error) {
    console.error('❌ 获取交易信息失败:', error.message);
    return null;
  }
}

/**
 * 主程序 - 执行整个合约部署和交互流程
 */
async function main() {
  try {
    console.log('===== 开始MegaBNB合约部署流程 =====');
    
    // 步骤1: 部署空合约
    const deployResult = await deployEmptyContract();
    const contractAddress = deployResult.contractAddress;
    
    // 步骤2: 验证合约部署
    console.log('\n等待5秒后验证合约...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const isVerified = await verifyContract(contractAddress);
    if (!isVerified) {
      throw new Error('合约验证失败，流程终止');
    }
    
    // 步骤3: 尝试与合约交互
    console.log('\n等待3秒后尝试与合约交互...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const txResult = await sendTransactionToContract(contractAddress);
    
    if (txResult) {
      // 步骤4: 获取交易信息
      await getTransactionInfo(txResult.transactionHash);
    }
    
    console.log('\n===== MegaBNB合约部署流程完成 =====');
    console.log(`合约地址: ${contractAddress}`);
    console.log('合约已成功部署，可以在区块浏览器上查看');
    
    return {
      success: true,
      contractAddress
    };
  } catch (error) {
    console.error('\n===== MegaBNB合约部署流程失败 =====');
    console.error(error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行脚本，执行主程序
if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        console.log(`\n部署成功！合约地址: ${result.contractAddress}`);
        process.exit(0);
      } else {
        console.error(`\n部署失败: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('未捕获错误:', error);
      process.exit(1);
    });
} else {
  // 如果作为模块导入，导出相关函数
  module.exports = {
    deployEmptyContract,
    verifyContract,
    sendTransactionToContract,
    getTransactionInfo,
    main
  };
} 