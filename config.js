/**
 * MegaBNB 自动化工具配置文件
 * 此文件包含账户信息和接收地址
 * 注意：不要在生产环境中将私钥存储在代码文件中
 */

/**
 * 账户配置
 * 
 * 警告: 不要在生产环境中直接硬编码私钥
 * 这里仅作为示例，建议使用环境变量或安全的密钥管理服务
 */

// 尝试导入Excel表格读取模块，如果失败则使用默认配置
let excelReader;
try {
  excelReader = require('./read-excel');
} catch (error) {
  console.warn('Excel读取模块加载失败，将使用默认配置');
  excelReader = null;
}

// 从Excel文件读取账户信息，如果有的话
let accounts = [];
let recipientAddresses = [];

if (excelReader) {
  try {
    accounts = excelReader.readSenderList();
    recipientAddresses = excelReader.readRecipientList();
    
    if (accounts.length > 0) {
      console.log(`已从Excel文件读取${accounts.length}个发送账户`);
    } else {
      console.warn('警告: Excel发送账户列表为空，将使用默认账户');
    }
    
    if (recipientAddresses.length > 0) {
      console.log(`已从Excel文件读取${recipientAddresses.length}个接收地址`);
    } else {
      console.warn('警告: Excel接收地址列表为空，将使用默认接收地址');
    }
  } catch (error) {
    console.warn(`Excel文件读取失败: ${error.message}`);
  }
}

// 如果Excel读取失败或结果为空，使用默认账户
if (accounts.length === 0) {
  accounts = [
    {
      // 测试账户 - 请替换为您自己的账户信息
      privateKey: "0x123...", // 替换为您的私钥
      address: "0x434031c4a90287c6e93c84668ee6e03c13077162" // 替换为您的地址
    }
  ];
}

// 如果Excel读取失败或结果为空，使用默认接收地址
if (recipientAddresses.length === 0) {
  recipientAddresses = [
    "0x5555555555555555555555555555555555555555"
  ];
}

// 合约设置
const contractSettings = {
  // 部署合约时使用的参数
  constructorArgs: ["MegaBNBToken", "MBT"],
  
  // 合约类型: 'standard', 'simple', 'minimal', 'empty'
  contractType: 'empty',
  
  // 强制使用空合约部署方法 (已验证可成功)
  preferEmpty: true
};

module.exports = {
  accounts,
  recipientAddresses,
  contractSettings
}; 