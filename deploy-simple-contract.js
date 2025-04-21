#!/usr/bin/env node

const Web3 = require('web3');
const { getAccountFromPrivateKey } = require('./utils');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 一个更简单的合约字节码，兼容性更好
// 这个合约有两个函数 - 一个getter和一个存储函数
const SIMPLE_CONTRACT_BYTECODE = "0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146049575b600080fd5b60476042366004605e565b600055565b005b60005460405190815260200160405180910390f35b600060208284031215606f57600080fd5b5035919050565b7f4e487b7160e01b600052604160045260246000fdfea2646970667358221220e9bb69572a5e1a61b9f4e92cb54db0b1d6c6d95db61ebb123e7ab01e9fe48e9b64736f6c634300080c0033";

// 这是上面合约字节码对应的ABI
const SIMPLE_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "x",
        "type": "uint256"
      }
    ],
    "name": "set",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "get",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署简单合约
 */
async function deploySimpleContract() {
  try {
    console.log(`开始部署简单合约...`);
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
      data: SIMPLE_CONTRACT_BYTECODE,
      gasPrice: gasPrice,
      gas: 200000, // 对简单合约稍微增加gas限制
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
    
    // 7. 测试调用合约方法
    console.log('\n测试调用合约...');
    const deployedContract = new web3.eth.Contract(SIMPLE_CONTRACT_ABI, receipt.contractAddress);
    
    // 调用 get 函数 (这是一个view函数，不需要交易)
    const initialValue = await deployedContract.methods.get().call();
    console.log(`初始值: ${initialValue}`);
    
    // 尝试调用 set 函数设置一个值
    console.log('\n尝试设置值...');
    const setValue = 42;
    
    // 创建交易数据
    const setData = deployedContract.methods.set(setValue).encodeABI();
    const setTxData = {
      from: fromAddress,
      to: receipt.contractAddress,
      data: setData,
      gasPrice: gasPrice,
      gas: 100000,
      nonce: nonce + 1, // 增加nonce
      chainId: chainId
    };
    
    // 签名和发送交易
    const setSignedTx = await web3.eth.accounts.signTransaction(setTxData, privateKey);
    
    try {
      console.log('发送 set 交易...');
      const setReceipt = await web3.eth.sendSignedTransaction(setSignedTx.rawTransaction);
      console.log(`✅ 设置值成功! 交易哈希: ${setReceipt.transactionHash}`);
      
      // 再次调用 get 函数检查值是否已更改
      const newValue = await deployedContract.methods.get().call();
      console.log(`新值: ${newValue}`);
    } catch (setError) {
      console.error('设置值失败:', setError.message);
      // 失败也没关系，至少我们部署成功了
    }
    
    return {
      receipt,
      contractAddress: receipt.contractAddress,
      abi: SIMPLE_CONTRACT_ABI
    };
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
console.log('开始测试部署简单合约...');
deploySimpleContract()
  .then((result) => {
    console.log('\n测试完成!');
    console.log(`合约地址: ${result.contractAddress}`);
    console.log('你可以使用以下ABI与合约交互:');
    console.log(JSON.stringify(SIMPLE_CONTRACT_ABI, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  }); 