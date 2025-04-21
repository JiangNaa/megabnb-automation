#!/usr/bin/env node

const { processMultipleAddresses } = require('./index');
const { web3 } = require('./utils');
const { getSampleERC20Contract, getSimpleERC20Contract } = require('./contract-deployer');
const config = require('./config');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const HELP_TEXT = `
MegaBNB Automation Tool

Usage: node run-example.js [options]

Options:
  --private-key, -k   Private key (optional, uses config.js if not provided)
  --address, -a       Initial address (optional, uses config.js if not provided)
  --recipients, -r    Comma-separated list of recipient addresses (optional, uses config.js if not provided)
  --amount, -m        Amount to send to each recipient in ether (default: 0.01)
  --deploy-erc20, -d  Deploy ERC20 token contract (default: true)
  --contract-type, -t Contract type: standard, simple, minimal, nano, empty (default: standard)
  --token-name, -n    ERC20 token name (default from config.js: "${config.contractSettings.name}")
  --token-symbol, -s  ERC20 token symbol (default from config.js: "${config.contractSettings.symbol}")
  --skip-deploy, -sd  Skip contract deployment entirely (default: false)
  --use-config, -uc   Use accounts and recipients from config.js (default: false)
  --help, -h          Show this help text

Example:
  node run-example.js -k 0x123... -a 0xabc... -r 0xdef...,0x456... -m 0.02

Note:
  The correct faucet URL for MegaBNB is https://mbscan.io/airdrop
  Make sure this is correctly set in your .env file
  
  If contract deployment fails, try with --skip-deploy flag to only request tokens and transfer
  or try with --contract-type minimal to use a minimal contract
  
  To use account and recipient information from config.js, use --use-config or -uc
`;

// Default values
let privateKey = null;
let address = null;
let recipientAddressesStr = '';
let amount = '0.01';
let deployErc20 = true;
let skipDeploy = false;
let useConfig = false;
let contractType = 'standard';
let tokenName = config.contractSettings.name;
let tokenSymbol = config.contractSettings.symbol;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--private-key':
    case '-k':
      privateKey = args[++i];
      break;
    case '--address':
    case '-a':
      address = args[++i];
      break;
    case '--recipients':
    case '-r':
      recipientAddressesStr = args[++i];
      break;
    case '--amount':
    case '-m':
      amount = args[++i];
      break;
    case '--deploy-erc20':
    case '-d':
      deployErc20 = args[++i] === 'true';
      break;
    case '--contract-type':
    case '-t':
      contractType = args[++i];
      break;
    case '--skip-deploy':
    case '-sd':
      skipDeploy = true;
      break; 
    case '--use-config':
    case '-uc':
      useConfig = true;
      break;
    case '--token-name':
    case '-n':
      tokenName = args[++i];
      break;
    case '--token-symbol':
    case '-s':
      tokenSymbol = args[++i];
      break;
    case '--help':
    case '-h':
      console.log(HELP_TEXT);
      process.exit(0);
      break;
    default:
      console.log(`Unknown option: ${args[i]}`);
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

// 检查环境配置
const faucetUrl = process.env.FAUCET_URL;
if (faucetUrl !== 'https://mbscan.io/airdrop') {
  console.warn('\n⚠️ WARNING: Your FAUCET_URL may be incorrect!');
  console.warn(`Current value: ${faucetUrl}`);
  console.warn('Recommended value: https://mbscan.io/airdrop');
  console.warn('You may need to update your .env file.\n');
}

// 如果使用配置文件中的账户信息
if (useConfig) {
  if (config.accounts && config.accounts.length > 0) {
    const account = config.accounts[0];
    privateKey = account.privateKey;
    address = account.address;
    console.log(`使用 config.js 中的账户信息: ${address}`);
  } else {
    console.error('Error: No accounts found in config.js');
    process.exit(1);
  }
} else if (!privateKey || !address) {
  console.error('Error: Private key and address are required unless using --use-config');
  console.log(HELP_TEXT);
  process.exit(1);
}

// 处理接收地址
let recipientAddresses = [];
if (useConfig && !recipientAddressesStr) {
  // 使用配置文件中的接收地址
  if (config.recipientAddresses && config.recipientAddresses.length > 0) {
    recipientAddresses = config.recipientAddresses;
    console.log(`使用 config.js 中的接收地址列表 (${recipientAddresses.length} 个地址)`);
  }
} else if (recipientAddressesStr) {
  // 使用命令行提供的接收地址
  recipientAddresses = recipientAddressesStr.split(',').map(addr => addr.trim());
}

// Convert amount to wei
const amountInWei = web3.utils.toWei(amount, 'ether');

// Prepare contract data if deploying ERC20
let contractData = null;
if (deployErc20 && !skipDeploy) {
  let abi, bytecode;
  
  // 根据合约类型选择不同的合约实现
  switch (contractType.toLowerCase()) {
    case 'simple':
      console.log('Using simple ERC20 contract implementation');
      ({ abi, bytecode } = getSimpleERC20Contract());
      break;
    case 'minimal':
      console.log('Using minimal ERC20 contract implementation');
      // 使用极简合约的 ABI 和字节码
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
      
      // 极简版代币合约字节码 (仅包含名称和符号)
      const minimalBytecode = "0x608060405234801561001057600080fd5b5060405161015f38038061015f833981810160405260408110156100335760006040526020015191906020016100358061003d565b505061010e565b828054610049906100d3565b90600052602060002090601f01602090048101928261006b57600085556100b1565b82601f1061008457805160ff19168380011785556100b1565b828001600101855582156100b1579182015b828111156100b1578251825591602001919060010190610096565b506100bd9291506100c1565b5090565b5b808211156100bd57600081556001016100c2565b600181811c908216806100e757607f821691505b602082108114156101085783805160ff19168301179055606092831b6001600160c01b0319161781555b50919050565b6042806101196000396000f3fe6080604052600080fdfea26469706673582212204fd9f4d7cc9a88a602cc35d7cb1b46007f326d5065633bb1e4a021c85928728564736f6c634300080f0033";
      
      ({ abi, bytecode } = { abi: minimalAbi, bytecode: minimalBytecode });
      break;
    case 'nano':
      console.log('Using nano ERC20 contract implementation');
      // 使用预定义的超简单合约 ABI 和字节码
      const nanoAbi = [
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
        },
        {
          "constant": true,
          "inputs": [],
          "name": "symbol",
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
      
      // 用较老版本的 Solidity 编译的超简单字节码
      const nanoBytecode = "0x6060604052341561000f57600080fd5b60405161047038038061047083398101604052808051820191906020018051820191905050816000908051906020019061004b92919061008c565b50806001908051906020019061006292919061008c565b5050505061013189056060604052341561000f57600080fd5b6004361061003a576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806306fdde0314610039575b005b341561004457600080fd5b61004c61007c565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561008c5780820151818401525b602081019050610070565b50505050905090810190601f1680156100b95780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60008054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561014f5780601f106101245761010080835404028352916020019161014f565b820191906000526020600020905b81548152906001019060200180831161013257829003601f168201915b50505050508156fea265627a7a723058204a29cc3392acc3f4b04f364f24cfa51268b8b265eee905ad9f5c0ad5f2e08ac664736f6c634300050a0032";
      
      ({ abi, bytecode } = { abi: nanoAbi, bytecode: nanoBytecode });
      break;
    case 'empty':
      console.log('Using empty contract implementation');
      // 仅包含存储名称和符号的最基本合约
      const emptyAbi = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        }
      ];
      
      // 一个几乎为空的合约字节码
      const emptyBytecode = "0x6080604052348015600f57600080fd5b5060358060e56000396000f3fe6080604052600080fdfea26469706673582212208d13cf9ef94cc92be7fad62be5e95aa2bd5ce4f7ac93a0b20e1c662863f2dce264736f6c634300080a0033";
      
      ({ abi, bytecode } = { abi: emptyAbi, bytecode: emptyBytecode });
      break;
    default:
      console.log('Using standard ERC20 contract implementation');
      ({ abi, bytecode } = getSampleERC20Contract());
  }
  
  contractData = {
    abi,
    bytecode,
    constructorArgs: [tokenName, tokenSymbol],
    contractType // 传递合约类型标识
  };
}

// Prepare account object
const accounts = [
  {
    privateKey,
    address
  }
];

console.log('Starting MegaBNB automation process...');
console.log(`Using address: ${address}`);
console.log(`Recipients: ${recipientAddresses.length ? recipientAddresses.join(', ') : 'None'}`);
console.log(`Amount per recipient: ${amount} MegaBNB`);

if (skipDeploy) {
  console.log('Skipping contract deployment (--skip-deploy flag set)');
} else {
  console.log(`Deploying ERC20 contract: ${deployErc20 ? 'Yes' : 'No'}`);
  if (deployErc20) {
    console.log(`Contract type: ${contractType}`);
    console.log(`Token name: ${tokenName}`);
    console.log(`Token symbol: ${tokenSymbol}`);
  }
}

// Run the automation
processMultipleAddresses(
  accounts,
  recipientAddresses,
  amountInWei,
  contractData
)
  .then(results => {
    console.log('\nAutomation completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nAutomation failed:', error);
    process.exit(1);
  }); 