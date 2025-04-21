const axios = require('axios');
require('dotenv').config();
const { isValidAddress, web3 } = require('./utils');

/**
 * Request tokens from the MegaBNB faucet for a specific address
 * @param {string} address - The address to receive faucet tokens
 * @returns {object} - The faucet response containing amount, success, and tx_hash
 */
async function requestFaucetTokens(address) {
  // 验证地址
  if (!isValidAddress(address)) {
    throw new Error(`无效的以太坊地址: ${address}`);
  }

  // 确保使用正确的URL
  const faucetUrl = process.env.FAUCET_URL || 'https://mbscan.io/airdrop';
  
  try {
    console.log(`请求测试代币，地址: ${address}`);
    console.log(`发送请求到: ${faucetUrl}`);
    
    // 获取请求前的余额
    const balanceBefore = await web3.eth.getBalance(address);
    console.log(`请求前余额: ${web3.utils.fromWei(balanceBefore, 'ether')} MegaBNB`);
    
    // 使用更稳健的请求配置
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 30000
    };
    
    // 发送请求
    const response = await axios.post(faucetUrl, { address }, config);
    const { data } = response;
    
    console.log('收到响应:', JSON.stringify(data, null, 2));
    
    // 等待一段时间让交易确认
    console.log('等待5秒让交易确认...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 获取请求后的余额
    const balanceAfter = await web3.eth.getBalance(address);
    console.log(`请求后余额: ${web3.utils.fromWei(balanceAfter, 'ether')} MegaBNB`);
    
    // 计算是否余额增加
    const balanceIncrease = BigInt(balanceAfter) - BigInt(balanceBefore);
    
    // 处理响应
    if (data.success || balanceIncrease > 0) {
      // 如果API返回成功或者余额确实增加了
      console.log(`✅ 水龙头请求成功!`);
      
      if (data.tx_hash) {
        console.log(`交易哈希: ${data.tx_hash}`);
      }
      
      if (balanceIncrease > 0) {
        console.log(`增加的余额: ${web3.utils.fromWei(balanceIncrease.toString(), 'ether')} MegaBNB`);
      }
      
      return {
        success: true,
        tx_hash: data.tx_hash || null,
        amount: balanceIncrease.toString()
      };
    } else {
      // API返回失败但我们仍然检查余额是否增加
      if (balanceIncrease > 0) {
        console.log(`✅ 尽管API返回失败，但余额已增加!`);
        console.log(`增加的余额: ${web3.utils.fromWei(balanceIncrease.toString(), 'ether')} MegaBNB`);
        
        return {
          success: true,
          tx_hash: null,
          amount: balanceIncrease.toString()
        };
      }
      
      // 真的失败了
      const errorMsg = data.message || data.error || '未知错误';
      console.error(`❌ 水龙头请求失败: ${errorMsg}`);
      throw new Error(`水龙头请求失败: ${errorMsg}`);
    }
  } catch (error) {
    console.error(`❌ 水龙头请求错误:`, error.message);
    
    // 尝试再次检查余额，看是否有变化
    try {
      const currentBalance = await web3.eth.getBalance(address);
      console.log(`当前余额: ${web3.utils.fromWei(currentBalance, 'ether')} MegaBNB`);
      
      // 如果余额足够进行后续操作，则返回部分成功
      if (BigInt(currentBalance) > 0) {
        console.log(`尽管请求失败，但账户已有余额。继续流程...`);
        return {
          success: false,
          error: error.message,
          hasBalance: true
        };
      }
    } catch (balanceError) {
      console.error(`无法检查余额:`, balanceError.message);
    }
    
    // 提供详细错误信息
    if (error.response) {
      console.error('响应状态:', error.response.status);
      
      if (error.response.status === 404) {
        console.error('⚠️ 404 错误: API URL 可能不正确');
        console.error('请检查 .env 文件中的 FAUCET_URL 设置');
        console.error('正确的 URL 应该是: https://mbscan.io/airdrop');
      }
      
      console.error('响应头:', JSON.stringify(error.response.headers, null, 2));
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('未收到响应。网络错误或服务器超时。');
    }
    
    throw error;
  }
}

module.exports = {
  requestFaucetTokens,
}; 