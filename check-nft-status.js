#!/usr/bin/env node

/**
 * 检查MegaCat NFT合约的铸造状态
 * 分析已铸造数量和最大数量
 */

const Web3 = require('web3');
require('dotenv').config();

// 合约地址
const CONTRACT_ADDRESS = '0xc0e8dCE43D341A268893F8E5F5462170D0f5cdCb';

// ABI片段，只包含我们需要调用的函数
const MINIMAL_ABI = [
  // 尝试可能的函数名称
  { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalMints", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "maxSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "maxMints", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  // 添加更多可能的方法
  { "inputs": [], "name": "MAX_MINTS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "TOTAL_MINTS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "mintingFinished", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "isMintingFinished", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }
];

// 直接尝试读取存储槽位
async function getStorageValue(web3, contractAddress, slot) {
  try {
    const value = await web3.eth.getStorageAt(contractAddress, slot);
    return {
      hex: value,
      number: parseInt(value, 16)
    };
  } catch (error) {
    console.error(`读取存储槽位 ${slot} 失败:`, error.message);
    return { hex: '0x0', number: 0 };
  }
}

// 尝试调用合约方法
async function tryCallMethod(contract, methodName, fallbackValue = null) {
  try {
    if (contract.methods[methodName]) {
      const result = await contract.methods[methodName]().call();
      return result;
    }
  } catch (error) {
    console.log(`调用方法 ${methodName} 失败: ${error.message}`);
  }
  return fallbackValue;
}

async function main() {
  try {
    console.log('\n========== MegaCat NFT 状态检查 ==========');
    
    // 初始化Web3
    const web3 = new Web3(process.env.MEGABNB_RPC_URL);
    console.log(`连接到网络: ${process.env.MEGABNB_RPC_URL}`);
    
    // 获取区块链网络状态
    const chainId = await web3.eth.getChainId();
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`当前区块链ID: ${chainId}`);
    console.log(`当前区块高度: ${blockNumber}`);
    
    console.log(`\n检查合约: ${CONTRACT_ADDRESS}`);
    
    // 检查合约是否存在
    const code = await web3.eth.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.error('❌ 该地址不是合约地址!');
      process.exit(1);
    }
    console.log('✅ 确认地址是合约');
    
    // 创建合约实例
    const contract = new web3.eth.Contract(MINIMAL_ABI, CONTRACT_ADDRESS);
    
    // 尝试获取NFT基本信息
    console.log('\n----- NFT基本信息 -----');
    const name = await tryCallMethod(contract, 'name', '未知');
    const symbol = await tryCallMethod(contract, 'symbol', '未知');
    console.log(`NFT名称: ${name}`);
    console.log(`NFT符号: ${symbol}`);
    
    // 尝试通过合约方法获取铸造状态
    console.log('\n----- 通过合约方法查询 -----');
    // 尝试不同可能的方法名
    const totalSupply = await tryCallMethod(contract, 'totalSupply', null);
    const totalMints = await tryCallMethod(contract, 'totalMints', null);
    const TOTAL_MINTS = await tryCallMethod(contract, 'TOTAL_MINTS', null);
    const maxSupply = await tryCallMethod(contract, 'maxSupply', null);
    const maxMints = await tryCallMethod(contract, 'maxMints', null);
    const MAX_MINTS = await tryCallMethod(contract, 'MAX_MINTS', null);
    const MAX_SUPPLY = await tryCallMethod(contract, 'MAX_SUPPLY', null);
    const mintingFinished = await tryCallMethod(contract, 'mintingFinished', null);
    const isMintingFinished = await tryCallMethod(contract, 'isMintingFinished', null);
    
    if (totalSupply !== null) console.log(`总供应量(totalSupply): ${totalSupply}`);
    if (totalMints !== null) console.log(`已铸造数量(totalMints): ${totalMints}`);
    if (TOTAL_MINTS !== null) console.log(`已铸造数量(TOTAL_MINTS): ${TOTAL_MINTS}`);
    if (maxSupply !== null) console.log(`最大供应量(maxSupply): ${maxSupply}`);
    if (maxMints !== null) console.log(`最大铸造数量(maxMints): ${maxMints}`);
    if (MAX_MINTS !== null) console.log(`最大铸造数量(MAX_MINTS): ${MAX_MINTS}`);
    if (MAX_SUPPLY !== null) console.log(`最大供应量(MAX_SUPPLY): ${MAX_SUPPLY}`);
    if (mintingFinished !== null) console.log(`铸造是否完成(mintingFinished): ${mintingFinished}`);
    if (isMintingFinished !== null) console.log(`铸造是否完成(isMintingFinished): ${isMintingFinished}`);
    
    // 解析合约代码中的条件判断
    if (totalSupply !== null) {
      // 按字节码分析，合约可能在0xc槽位存储maxMints，0xb槽位存储totalMints
      const getMaxMintsFromStorage = async () => {
        try {
          const value = await web3.eth.getStorageAt(CONTRACT_ADDRESS, 0xc);
          return parseInt(value, 16);
        } catch (error) {
          console.error('读取maxMints存储失败:', error.message);
          return 10000; // 默认猜测值
        }
      };
      
      const getTotalMintsFromStorage = async () => {
        try {
          const value = await web3.eth.getStorageAt(CONTRACT_ADDRESS, 0xb);
          return parseInt(value, 16);
        } catch (error) {
          console.error('读取totalMints存储失败:', error.message);
          return 0; // 默认值
        }
      };
      
      // 获取从存储中读取的值
      const storageMaxMints = await getMaxMintsFromStorage();
      const storageTotalMints = await getTotalMintsFromStorage();
      
      console.log(`\n----- 基于合约存储分析 -----`);
      console.log(`从存储槽位0xb读取的已铸造数量: ${storageTotalMints}`);
      console.log(`从存储槽位0xc读取的最大铸造数量: ${storageMaxMints}`);
      console.log(`当前总供应量(totalSupply): ${totalSupply}`);
      
      // 从合约代码分析，交易会在 totalMints >= maxMints + 1 条件下回滚
      const moreCanBeMinted = storageTotalMints < storageMaxMints;
      console.log(`条件检查 totalMints(${storageTotalMints}) < maxMints(${storageMaxMints}): ${moreCanBeMinted}`);
      
      if (moreCanBeMinted) {
        console.log(`\n✅ 分析结果: NFT尚未铸造完毕 (${storageTotalMints}/${storageMaxMints})`);
        console.log(`还有 ${storageMaxMints - storageTotalMints} 个NFT可以铸造`);
      } else {
        console.log(`\n❗ 分析结果: NFT可能已经全部铸造完毕 (${storageTotalMints}/${storageMaxMints})`);
        console.log(`这就是为什么您的交易返回"fuck"错误的原因 - 没有更多NFT可铸造了`);
        
        // 以太坊交易检查 (如果条件为 totalMints >= maxMints + 1)
        if (storageTotalMints >= storageMaxMints + 1) {
          console.log(`\n符合条件 totalMints(${storageTotalMints}) >= maxMints(${storageMaxMints}) + 1`);
          console.log(`这正是合约代码中返回"fuck"错误的条件`);
        }
      }
    }
    
    // 如果方法调用失败，尝试直接读取存储
    if (totalSupply === null && totalMints === null && maxSupply === null && maxMints === null) {
      console.log('\n----- 通过存储槽位查询 -----');
      console.log('合约方法调用失败，尝试直接读取合约存储...');
      
      // 遍历可能的存储槽位 - ERC721合约通常在这些位置存储数量
      for (let i = 0; i <= 20; i++) {
        const storageValue = await getStorageValue(web3, CONTRACT_ADDRESS, i);
        if (storageValue.number > 0) {
          console.log(`存储槽位 ${i}: ${storageValue.hex} (${storageValue.number})`);
        }
      }
      
      // 特别关注从合约代码猜测的totalMints和maxMints所在的槽位
      console.log('\n根据合约代码分析的可能位置:');
      const possibleTotalMints = await getStorageValue(web3, CONTRACT_ADDRESS, 0xb);
      const possibleMaxMints = await getStorageValue(web3, CONTRACT_ADDRESS, 0xc);
      console.log(`可能的已铸造数量(槽位0xb): ${possibleTotalMints.number}`);
      console.log(`可能的最大铸造数量(槽位0xc): ${possibleMaxMints.number}`);
      
      if (possibleMaxMints.number > 0 && possibleTotalMints.number >= possibleMaxMints.number) {
        console.log(`\n❗ 分析结果: NFT可能已经全部铸造完毕，已铸造 ${possibleTotalMints.number}/${possibleMaxMints.number}`);
      }
    } else {
      // 判断是否已经全部铸造完毕
      const currentTotal = totalMints !== null ? totalMints : totalSupply;
      const maxTotal = maxMints !== null ? maxMints : maxSupply;
      
      if (currentTotal !== null && maxTotal !== null) {
        if (parseInt(currentTotal) >= parseInt(maxTotal)) {
          console.log(`\n❗ NFT已经全部铸造完毕，已铸造 ${currentTotal}/${maxTotal}`);
        } else {
          console.log(`\n✅ NFT尚未铸造完毕，已铸造 ${currentTotal}/${maxTotal}，还剩 ${maxTotal - currentTotal} 个可铸造`);
        }
      }
    }
    
    console.log('\n========== 检查完成 ==========');
  } catch (error) {
    console.error('\n❌ 检查失败:');
    console.error(error);
    process.exit(1);
  }
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('未捕获错误:', error);
    process.exit(1);
  }); 