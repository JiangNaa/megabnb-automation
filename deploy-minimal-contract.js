#!/usr/bin/env node

const Web3 = require('web3');
const { getAccountFromPrivateKey } = require('./utils');
const { accounts } = require('./config');
require('dotenv').config();

// 获取私钥和地址
const account = accounts[0];
const privateKey = account.privateKey;
const fromAddress = account.address;

// 极简版合约字节码 - 只包含名称和符号 (Solidity 0.4.25 编译)
// 这个合约应该有最广泛的EVM兼容性
const MINIMAL_CONTRACT_BYTECODE = "0x6060604052341561000f57600080fd5b6040516102d83803806102d8833981016040528080518201919060200180518201919050508160009080519060200190610049929190610060565b5080600190805190602001906100609291906100e7565b505050610182565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100a157805160ff19168380011785556100cf565b828001600101855582156100cf579182015b828111156100ce5781518255916020019190600101906100b3565b5b5090506100dc919061016e565b5090565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061012857805160ff1916838001178555610156565b82800160010185558215610156579182015b8281111561015557825182559160200191906001019061013a565b5b5090506101639190610173565b5090565b5b80821115610186576000816000905550600101610174565b5090565b610147806101916000396000f300608060405260043610610041576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806306fdde0314610046575b600080fd5b34801561005257600080fd5b5061005b6100d6565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561009b578082015181840152602081019050610080565b50505050905090810190601f1680156100c85780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60008054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156101705780601f1061014557610100808354040283529160200191610170565b820191906000526020600020905b81548152906001019060200180831161015357829003601f168201915b5050505050815600a165627a7a72305820e0e2172f301f42d2a62397f535ccdea3c6eacaf960efb33f237b4d9563edf9980029";

// 简化版ABI - 只包含名称和符号
const MINIMAL_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "name": "name_",
        "type": "string"
      },
      {
        "name": "symbol_",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// 创建 Web3 实例
const web3 = new Web3(process.env.MEGABNB_RPC_URL);

/**
 * 部署最小化合约
 */
async function deployMinimalContract() {
  try {
    // 合约参数 (名称和符号)
    const name = "MinimalToken";
    const symbol = "MIN";
    
    console.log(`开始部署最小化合约...`);
    console.log(`从地址: ${fromAddress}`);
    console.log(`代币名称: ${name}`);
    console.log(`代币符号: ${symbol}`);
    
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
    
    // 3. 创建合约实例用于部署
    const contract = new web3.eth.Contract(MINIMAL_CONTRACT_ABI);
    
    // 4. 编码构造函数参数
    const deployTx = contract.deploy({
      data: MINIMAL_CONTRACT_BYTECODE,
      arguments: [name, symbol]
    });
    
    // 5. 估算 Gas
    let gasLimit;
    try {
      gasLimit = await deployTx.estimateGas({from: fromAddress});
      console.log(`估算的 Gas 限制: ${gasLimit}`);
    } catch (error) {
      console.warn(`无法估算 Gas: ${error.message}`);
      gasLimit = 300000; // 对于这种小合约应该足够
      console.log(`使用默认 Gas 限制: ${gasLimit}`);
    }
    
    // 6. 创建交易对象
    const txData = {
      from: fromAddress,
      data: deployTx.encodeABI(),
      gasPrice: gasPrice,
      gas: gasLimit,
      nonce: nonce,
      chainId: chainId
    };
    
    // 7. 签名交易
    console.log('签名交易...');
    const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
    
    // 8. 发送交易
    console.log('发送交易...');
    console.log(`使用 Gas 限制: ${gasLimit}`);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    
    // 9. 输出结果
    console.log('\n✅ 合约部署成功!');
    console.log(`交易哈希: ${receipt.transactionHash}`);
    console.log(`合约地址: ${receipt.contractAddress}`);
    console.log(`区块号: ${receipt.blockNumber}`);
    console.log(`Gas 使用量: ${receipt.gasUsed}`);
    
    // 10. 尝试调用合约 (读取名称)
    try {
      console.log('\n测试调用合约...');
      const deployedContract = new web3.eth.Contract(MINIMAL_CONTRACT_ABI, receipt.contractAddress);
      const tokenName = await deployedContract.methods.name().call();
      console.log(`读取的代币名称: ${tokenName}`);
    } catch (error) {
      console.warn(`合约调用失败: ${error.message}`);
      console.log('但合约部署已成功，可以稍后调用');
    }
    
    return {
      receipt,
      contractAddress: receipt.contractAddress,
      abi: MINIMAL_CONTRACT_ABI,
      name,
      symbol
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

// 运行部署
console.log('开始测试部署最小化合约...');
deployMinimalContract()
  .then((result) => {
    console.log('\n测试完成!');
    console.log(`合约地址: ${result.contractAddress}`);
    console.log(`代币名称: ${result.name}`);
    console.log(`代币符号: ${result.symbol}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  }); 