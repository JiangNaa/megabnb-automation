const { web3, getAccountFromPrivateKey, logTransactionReceipt } = require('./utils');
require('dotenv').config();
const Web3 = require('web3');
const { waitForTransaction } = require('./utils');

/**
 * Deploys a smart contract to the blockchain
 * @param {string} privateKey - Private key of the deployer
 * @param {object} abi - Contract ABI
 * @param {string} bytecode - Contract bytecode
 * @param {Array} constructorArgs - Constructor arguments for contract deployment
 * @param {object} options - Optional deployment options (gasPrice, gasLimit)
 * @returns {object} - Object containing transaction receipt and contract instance
 */
async function deployContract(privateKey, abi, bytecode, constructorArgs = [], options = {}) {
  // Get account from private key
  const account = getAccountFromPrivateKey(privateKey);
  const fromAddress = account.address;
  
  console.log(`Preparing to deploy contract from address: ${fromAddress}...`);
  
  // Create contract instance
  const contract = new web3.eth.Contract(abi);
  
  // Prepare deployment transaction
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: constructorArgs
  });
  
  // 增加默认 gas 限制以确保合约部署有足够的 gas
  const gasPrice = options.gasPrice || process.env.GAS_PRICE || '5000000000';
  const gasLimit = options.gasLimit || process.env.GAS_LIMIT || '6000000';
  
  let estimatedGas;
  try {
    estimatedGas = await deployTx.estimateGas({ from: fromAddress });
    console.log(`Estimated gas for deployment: ${estimatedGas}`);
  } catch (error) {
    console.warn(`Could not estimate gas: ${error.message}`);
    console.warn(`Using default gas limit: ${gasLimit}`);
    estimatedGas = gasLimit;
  }
  
  const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
  
  // Create transaction object
  const txData = {
    from: fromAddress,
    gas: estimatedGas,
    gasPrice: gasPrice,
    nonce: nonce,
    chainId: parseInt(process.env.MEGABNB_CHAIN_ID)
  };
  
  try {
    // Sign transaction
    console.log('Signing deployment transaction...');
    const signedTx = await account.signTransaction(
      {
        data: deployTx.encodeABI(),
        ...txData
      }
    );
    
    // Send transaction
    console.log('Sending deployment transaction...');
    console.log(`Using gas limit: ${estimatedGas}, gas price: ${gasPrice}`);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    // Log transaction details
    logTransactionReceipt(receipt, 'Contract Deployment');
    
    // Create contract instance at deployed address
    const deployedContract = new web3.eth.Contract(
      abi,
      receipt.contractAddress
    );
    
    return {
      receipt,
      contract: deployedContract
    };
  } catch (error) {
    console.error(`✗ Contract deployment error:`, error.message);
    throw error;
  }
}

/**
 * Loads a sample ERC20 token contract for testing
 * @returns {object} - Object containing ABI and bytecode
 */
function getSampleERC20Contract() {
  // 使用更简单的 ERC20 代币 ABI 和字节码
  const abi = [
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
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
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  
  // OpenZeppelin 标准 ERC20 字节码 (Solidity v0.8.20 编译)
  const bytecode = "0x608060405234801561001057600080fd5b5060405162000c3838038062000c388339810160408190526200003491620001db565b81516200004990600390602085019062000068565b5080516200005f90600490602084019062000068565b50505062000282565b828054620000769062000245565b90600052602060002090601f0160209004810192826200009a5760008555620000e5565b82601f10620000b557805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200013657600080fd5b81516001600160401b03808211156200015357620001536200010e565b604051601f8301601f19908116603f011681019082821181831017156200017e576200017e6200010e565b816040528381526020925086838588010111156200019b57600080fd5b600091505b83821015620001bf5785820183015181830184015290820190620001a0565b83821115620001d15760008385830101525b9695505050505050565b60008060408385031215620001ef57600080fd5b82516001600160401b03808211156200020757600080fd5b620002158683870162000124565b935060208501519150808211156200022c57600080fd5b506200023b8582860162000124565b9150509250929050565b600181811c908216806200025a57607f821691505b602082108114156200027c57634e487b7160e01b600052602260045260246000fd5b50919050565b6109a680620002926000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461012957806370a082311461013c57806395d89b4114610165578063a457c2d71461016d578063a9059cbb14610180578063dd62ed3e1461019357600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101cc565b6040516100c3919061072c565b60405180910390f35b6100df6100da36600461079d565b61025e565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f3660046107c7565b610278565b604051601281526020016100c3565b6100df61013736600461079d565b61029c565b6100f361014a366004610803565b6001600160a01b031660009081526020819052604090205490565b6100b66102be565b6100df61017b36600461079d565b6102cd565b6100df61018e36600461079d565b61034d565b6100f36101a1366004610825565b6001600160a01b03918216600090815260016020908152604080832093909416808352929052205490565b6060600380546101db9061085a565b80601f01602080910402602001604051908101604052809291908181526020018280546102079061085a565b80156102545780601f1061022957610100808354040283529160200191610254565b820191906000526020600020905b81548152906001019060200180831161023757829003601f168201915b5050505050905090565b60003361026c81858561035b565b60019150505b92915050565b600033610286858285610480565b61029185858561051d565b506001949350505050565b6000336102aa81858561050a565b6102b4858561035b565b506001949350505050565b6060600480546101db9061085a565b600033816102db82866101a1565b9050838110156103405760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b6102918286868403610480565b60003361026c818585610517565b6001600160a01b0383166103c05760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610337565b6001600160a01b0382166104225760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610337565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b0384166104e65760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b6064820152608401610337565b6001600160a01b038316600090815260016020908152604080832093909416808352929052205482821101610467576001600160a01b038316600090815260016020908152604080832093909416808352929052205490036104f7565b6001600160a01b0383166000908152600160209081526040808320938616835292905220548290038290039150505b6001600160a01b038316600090815260016020908152604080832093909416835292905220829055505050565b6105178383610663565b505050565b610517838383610663565b6001600160a01b0383166105825760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b6064820152608401610337565b6001600160a01b03821661059f5761059f6105ff565b6001600160a01b038316600090815260208190526040902054818110156106225760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015262616c616e636560e81b6064820152608401610337565b610630828261064c565b6001600160a01b0381166000908152602081905260408120805484929061065790849061088e565b9250508190555050505050565b600080fd5b6001600160a01b038216600090815260208190526040902080548290039055600280548290039055505050565b6001600160a01b038216600090815260208190526040902080548290039055600280548290039055505050565b6001600160a01b0383166106b557610517826106c0565b505050565b600254610516908290565b6000815180845260005b818110156106ec576020818501810151868301820152016106d0565b506000602082860101526020601f19601f83011685010191505092915050565b60006020808301818452808551808352604092508286019150828160051b8701018488016000805b8481101561078e57603f198a87030181890152878201518682018390526060828101889052885180610100850152805163ffffffff1688870152606081015187870152608081015186870152928801929092506000905b8682101561077157600181018a52825183808452870152818c0191909152858301819052869150879052845b8181101561075957878101830151878201840152810161073d565b50978601979096019594505050505281016107a8565b5081015161076c565b5096879003601f19016101208a810183015289808c51949750908601915b878210156107d2578684830152938501936001919091019061071d565b505050602093840196919550938301929190910191016106aa565b600082601f83011261073f5750809150610744565b50919050565b60006020828403121561075d57600080fd5b81356001600160a01b038116811461077457600080fd5b60006020828403121561078557600080fd5b5035919050565b828152604060208201526000610791816040850161070f565b949350505050565b600080604083850312156107b057600080fd5b82356001600160a01b03811681146107c757600080fd5b946020939093013593505050565b6000806000606084860312156107dc57600080fd5b83356001600160a01b03811681146107f357600080fd5b95602085013595506040909401359392505050565b60006020828403121561081557600080fd5b81356001600160a01b038116811461082c57600080fd5b9392505050565b6000806040838503121561083857600080fd5b82356001600160a01b038116811461084f57600080fd5b9150610828602084016107c7565b600181811c9082168061086e57607f821691505b6020821081141561088f57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b8181038181111561027257634e487b7160e01b600052601160045260246000fd5b63ffffffff8416825260208201839052606060408201526000610853606083018461070f565b602082015260006108538361070f56fea26469706673582212208fcd582d943af6789c8ba3fc97bf2a0eeaa9d1f4a5429cce3d8c5d30dbb0ef5864736f6c63430008140033";
  
  return { abi, bytecode };
}

/**
 * 获取一个非常简单的 ERC20 代币合约，体积更小，适合测试
 * @returns {object} - 包含 ABI 和字节码的对象
 */
function getSimpleERC20Contract() {
  const abi = [
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
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
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
    },
    {
      "inputs": [],
      "name": "totalSupply",
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
  
  // 一个最小化的 ERC20 代币字节码，只包含核心功能
  const bytecode = "0x608060405234801561001057600080fd5b506040516103e83803806103e883398101604081905261002f91610105565b81516200004290600090602085019062000068565b5080516200005890600490602084019062000068565b5050610205565b8280546200006f9062000245565b90600052602060002090601f016020900481019282620000935760008555620000e5565b82601f10620000ae57805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600080604083850312156101185761011761010f565b5b82516001600160401b03808211156200013257610132600080fd5b9084019060608287031215610147561014761010f565b60005b82811015620001675761015c878401835260208181019390935260408082019490945291906001019061014a565b509295945050505050565b600181811c9082168061018c57607f821691505b60208210811415620001ad57634e487b7160e01b600052602260045260246000fd5b50919050565b6101d4806102146000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806306fdde0314610051578063095ea7b31461006f57806318160ddd14610084578063313ce5671461008c575b600080fd5b610059610095565b6040516100669190610123565b60405180910390f35b61008261007d3660046101b8565b610123565b005b610059610129565b60408051602081019091526000815290565b606060008054620000a490620001e2565b80601f0160208091040260200160405190810160405280929190818152602001828054620000d090620001e2565b80156200011d5780601f10620000f2576101008083540402835291602001916200011d565b820191906000526020600020905b8154815290600101906020018083116200010057829003601f168201915b5050505050905090565b505050565b6000805462000116906200017d565b9081601f8301126200012457808288840111156200012257600080fd5b5092915050565b60006020828403121562000139576101d5620001d5565b506000602082840312156200014c576101d562000152565b90505b919050565b600063ffffffff808416806200017957506001600160a01b038316155b9392505050565b600181811c908216806200019157607f821691505b60208210811415620001b2576101b2620001e9565b50919050565b60008060408385031215620001cb57600080fd5b5050803592602090910135915050565b600080fd5b634e487b7160e01b600052602260045260246000fd56fea264697066735822122011a17a7a0b9c9e1cc6ebfb1c8ec8a1bcfac49a9e95db6c06e22fbb4a6c2737e864736f6c634300080a0033";
  
  return { abi, bytecode };
}

// 已知可成功部署的空合约字节码
const EMPTY_CONTRACT_BYTECODE = "0x6080604052348015600f57600080fd5b50603c80601d6000396000f3fe6080604052600080fdfea265627a7a723058205bd231c7695a074f70485e1ebb87dfc87d67e3035131e487c759aa88d8d4551c64736f6c63430005090032";

/**
 * 部署成功验证过的空合约
 * @param {string} privateKey - 发送者的私钥 
 * @param {string} fromAddress - 发送者的地址
 * @returns {Promise<object>} - 部署结果，包含交易收据和合约地址
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
 * 验证合约是否成功部署
 * @param {string} contractAddress - 要验证的合约地址
 * @returns {Promise<boolean>} - 验证结果
 */
async function verifyContract(contractAddress) {
  try {
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

module.exports = {
  deployContract,
  deployEmptyContract,
  verifyContract,
  getSampleERC20Contract,
  getSimpleERC20Contract
}; 