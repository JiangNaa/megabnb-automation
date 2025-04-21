const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 读取Excel文件并提取信息
 * @param {string} filePath - Excel文件路径
 * @param {Array<string>} columns - 要提取的列名
 * @returns {Array<object>} - 提取的数据数组
 */
function readExcelFile(filePath, columns) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 将工作表转换为JSON
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // 提取指定列的数据
    const extractedData = data.map(row => {
      const result = {};
      columns.forEach(column => {
        if (row[column] !== undefined) {
          result[column] = row[column];
        }
      });
      return result;
    });
    
    return extractedData;
  } catch (error) {
    console.error(`读取Excel文件失败: ${error.message}`);
    return [];
  }
}

/**
 * 读取发送地址列表
 * @returns {Array<object>} - 包含address和privateKey的对象数组
 */
function readSenderList() {
  const filePath = path.join(__dirname, 'megaBNBSend.xlsx');
  const columns = ['address', 'privateKey', 'mnemonic'];
  const data = readExcelFile(filePath, columns);
  
  // 验证数据格式
  return data.filter(row => {
    if (!row.address || !row.privateKey) {
      console.warn(`警告: 发送地址列表中有无效行，缺少address或privateKey: ${JSON.stringify(row)}`);
      return false;
    }
    return true;
  }).map(row => ({
    address: row.address,
    privateKey: row.privateKey // 已包含0x前缀
  }));
}

/**
 * 读取接收地址列表
 * @returns {Array<string>} - 地址字符串数组
 */
function readRecipientList() {
  const filePath = path.join(__dirname, 'megaBNBRecive.xlsx');
  const columns = ['address'];
  const data = readExcelFile(filePath, columns);
  
  // 只提取address字段
  return data.filter(row => {
    if (!row.address) {
      console.warn(`警告: 接收地址列表中有无效行，缺少address: ${JSON.stringify(row)}`);
      return false;
    }
    return true;
  }).map(row => row.address);
}

/**
 * 显示读取到的账户信息摘要（隐藏完整私钥）
 */
function showAccountsSummary() {
  const senders = readSenderList();
  const recipients = readRecipientList();
  
  console.log(`\n===== 账户信息摘要 =====`);
  console.log(`发送账户数量: ${senders.length}`);
  
  senders.forEach((sender, index) => {
    // 隐藏私钥中间部分，只显示前6位和后4位
    const hiddenKey = `${sender.privateKey.substring(0, 6)}...${sender.privateKey.substring(sender.privateKey.length - 4)}`;
    console.log(`发送账户 ${index+1}: ${sender.address} (私钥: ${hiddenKey})`);
  });
  
  console.log(`\n接收账户数量: ${recipients.length}`);
  recipients.forEach((address, index) => {
    console.log(`接收账户 ${index+1}: ${address}`);
  });
}

// 直接执行时显示账户摘要
if (require.main === module) {
  showAccountsSummary();
}

module.exports = {
  readSenderList,
  readRecipientList,
  showAccountsSummary
}; 