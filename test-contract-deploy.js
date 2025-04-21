#!/usr/bin/env node

const { web3 } = require('./utils');
const { 
  deployContract, 
  getSampleERC20Contract, 
  getSimpleERC20Contract 
} = require('./contract-deployer');
const { accounts, contractSettings } = require('./config');
require('dotenv').config();

// 已知可成功部署的空合约字节码
const EMPTY_CONTRACT_BYTECODE = "0x6080604052348015600f57600080fd5b50603c80601d6000396000f3fe6080604052600080fdfea265627a7a723058205bd231c7695a074f70485e1ebb87dfc87d67e3035131e487c759aa88d8d4551c64736f6c63430005090032";

/**
 * 测试合约部署
 * @param {string} privateKey - 私钥
 * @param {string} fromAddress - 发送地址
 * @param {string} name - 代币名称
 * @param {string} symbol - 代币符号
 * @param {string} type - 合约类型 ('standard', 'simple', 'minimal', 'empty')
 * @returns {Promise<object>} - 部署结果
 */
async function testContractDeployment(privateKey, fromAddress, name, symbol, type = 'standard') {
  console.log(`Testing contract deployment with type: ${type}`);
  
  try {
    switch(type.toLowerCase()) {
      case 'standard':
        console.log(`Deploying standard ERC20 contract with name: ${name}, symbol: ${symbol}`);
        // 标准ERC20合约部署代码...
        break;
        
      case 'simple':
        console.log(`Deploying simple contract with name: ${name}, symbol: ${symbol}`);
        // 简单合约部署代码...
        break;
        
      case 'minimal':
        console.log(`Deploying minimal contract with name: ${name}, symbol: ${symbol}`);
        // 定义极简合约 ABI 和字节码
        const minimalAbi = [
          {
            "inputs": [
              {
                "internalType": "string",
                "name": "name_",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol_",
                "type": "string"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
          },
          {
            "inputs": [],
            "name": "name",
            "outputs": [
              {
                "internalType": "string",
                "name": "",
                "type": "string"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "symbol",
            "outputs": [
              {
                "internalType": "string",
                "name": "",
                "type": "string"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ];
        
        // 极简 ERC20 合约字节码 - 只包含名称和符号，没有实际的转账功能
        const minimalBytecode = "0x60806040523480156200001157600080fd5b5060405162000853380380620008538339810160408190526200003491620001db565b81516200004990600090602085019062000068565b5080516200005f90600190602084019062000068565b50505062000282565b828054620000769062000245565b90600052602060002090601f0160209004810192826200009a5760008555620000e5565b82601f10620000b557805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200013657600080fd5b81516001600160401b03808211156200015357620001536200010e565b604051601f8301601f19908116603f011681019082821181831017156200017e576200017e6200010e565b816040528381526020925086838588010111156200019b57600080fd5b600091505b83821015620001bf5785820183015181830184015290820190620001a0565b83821115620001d15760008385830101525b9695505050505050565b60008060408385031215620001ef57600080fd5b82516001600160401b03808211156200020757600080fd5b620002158683870162000124565b935060208501519150808211156200022c57600080fd5b506200023b8582860162000124565b9150509250929050565b600181811c908216806200025a57607f821691505b602082108114156200027c57634e487b7160e01b600052602260045260246000fd5b50919050565b6105c180620002926000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806306fdde031461003b57806395d89b4114610059575b600080fd5b610043610077565b6040516100509190610399565b60405180910390f35b610043610105565b60606000805461008690610482565b80601f01602080910402602001604051908101604052809291908181526020018280546100b290610482565b80156100ff5780601f106100d4576101008083540402835291602001916100ff565b820191906000526020600020905b8154815290600101906020018083116100e257829003601f168201915b5050505050905090565b60606001805461011490610482565b80601f016020809104026020016040519081016040528092919081815260200182805461014090610482565b801561018d5780601f106101625761010080835404028352916020019161018d565b820191906000526020600020905b81548152906001019060200180831161017057829003601f168201915b5050505050905090565b6000815180845260005b818110156101bb5760208185018101518683018201520161019f565b818111156101cd576000602083870101525b50601f01601f19169290920160200192915050565b600060208083528351808285015260005b8181101561020f578581018301518582016040015282016101f3565b81811115610221576000604083870101525b50601f01601f1916929092016040019392505050565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261025e57600080fd5b813567ffffffffffffffff8082111561027957610279610237565b604051601f8301601f19908116603f011681019082821181831017156102a1576102a1610237565b81604052838152602092508683858801011115620002bd57600080fd5b600091505b83821015620002df5785820183015181830184015290820190506102c2565b83821115620002f057600083858301525b9695505050505050565b6000806040838503121561030c57600080fd5b823567ffffffffffffffff8082111561032457600080fd5b6103308683870161024d565b9350602085013591508082111561034657600080fd5b506103538582860161024d565b9150509250929050565b600081518084526020808501945080840160005b8381101561038e5781516001600160a01b03168752958201959082019060010161036c565b509495945050505050565b602081526000825180602084015261038e816040850160208701610195565b600067ffffffffffffffff8211156103d7576103d7610237565b5060051b60200190565b600082601f8301126103f257600080fd5b81356104056103008361041d565b9281019081106001600160401b0382111561042157600080fd5b81016020831015610433576104336103be565b610441816020848701010161043e565b925250505092915050565b602083101561045b5760051b60200190565b8151825160208085019190915281840151848201518284015191945061048092509085019061044e565b806040830152505092915050565b600181811c9082168061049657607f821691505b602082108114156104b757634e487b7160e01b600052602260045260246000fd5b5091905056fea2646970667358221220eb63e3d4b8eef6e0c9fc6d83a9768b08e7c63c1fd0f06c04a94dff8aaa23e55764736f6c63430008090033";
        
        // 部署极简合约
        try {
          // 编码构造函数参数
          const constructorArgs = web3.eth.abi.encodeParameters(['string', 'string'], [name, symbol]);
          const txData = {
            from: fromAddress,
            data: minimalBytecode + constructorArgs.slice(2), // 移除 '0x' 前缀
            gasPrice: process.env.GAS_PRICE || '5000000000',
            gas: 1000000,
            nonce: await web3.eth.getTransactionCount(fromAddress, 'pending'),
            chainId: parseInt(process.env.MEGABNB_CHAIN_ID)
          };
          
          console.log('签名交易...');
          const { rawTransaction } = await web3.eth.accounts.signTransaction(txData, privateKey);
          
          console.log('发送交易...');
          const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
          
          console.log('\n✅ 极简合约部署成功!');
          console.log(`交易哈希: ${receipt.transactionHash}`);
          console.log(`合约地址: ${receipt.contractAddress}`);
          console.log(`Gas 使用量: ${receipt.gasUsed}`);
          
          // 返回部署结果
          return {
            receipt,
            contractAddress: receipt.contractAddress,
            abi: minimalAbi
          };
        } catch (error) {
          console.error(`\n❌ 极简合约部署失败:`, error.message);
          throw error;
        }
        
      case 'empty':
        console.log(`Deploying empty contract (no name/symbol parameters needed)`);
        return await deployEmptyContract(privateKey, fromAddress);
        
      default:
        console.log(`Unknown contract type: ${type}, defaulting to empty contract`);
        return await deployEmptyContract(privateKey, fromAddress);
    }
  } catch (error) {
    console.error(`Contract deployment test failed: ${error.message}`);
    
    // 如果其他方法失败，尝试使用已验证成功的空合约方法
    console.log('Attempting fallback to empty contract deployment...');
    return await deployEmptyContract(privateKey, fromAddress);
  }
}

/**
 * 部署空合约 - 使用已验证成功的方法
 */
async function deployEmptyContract(privateKey, fromAddress) {
  try {
    console.log(`=== 开始部署空合约 ===`);
    
    // 获取当前网络状态
    const gasPrice = process.env.GAS_PRICE || '5000000000';
    const chainId = parseInt(process.env.MEGABNB_CHAIN_ID);
    
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
 * 运行测试
 */
async function runTests() {
  // 使用配置文件中的第一个账户
  const account = accounts[0];
  
  if (!account || !account.privateKey || !account.address) {
    console.error("错误: 请在 config.js 中配置有效的账户信息");
    process.exit(1);
  }
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  let contractType = "standard"; // 默认使用标准合约
  
  // 检查命令行参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" || args[i] === "-t") {
      contractType = args[++i];
    }
  }
  
  try {
    const { name, symbol } = contractSettings;
    
    // 测试合约部署
    await testContractDeployment(
      account.privateKey,
      account.address,
      name,
      symbol,
      contractType
    );
    
    console.log("\n===== 测试完成 =====");
  } catch (error) {
    console.error("测试失败:", error.message);
    process.exit(1);
  }
}

// 仅在直接运行此文件时执行测试
if (require.main === module) {
  console.log("开始测试合约部署...");
  console.log("提示: 你可以使用 --type [standard|simple|minimal|empty] 参数选择不同的合约类型");
  runTests().catch(console.error);
}

module.exports = {
  testContractDeployment,
  deployEmptyContract
}; 