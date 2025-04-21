const axios = require('axios');
const { isValidAddress } = require('./utils');
require('dotenv').config();

/**
 * 测试水龙头请求
 * @param {string} address - 以太坊地址
 * @param {string} url - 水龙头 URL
 */
async function testFaucetRequest(address, url) {
  // 验证地址
  if (!isValidAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  
  console.log(`\n===== Testing Faucet Request to ${url} =====`);
  console.log(`Requesting tokens for address: ${address}`);
  
  // 请求配置
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
  
  try {
    console.log('Sending POST request...');
    const startTime = Date.now();
    const response = await axios.post(url, { address }, config);
    const endTime = Date.now();
    
    console.log(`Request completed in ${endTime - startTime}ms`);
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && (response.data.success || response.data.status === 'success')) {
      console.log('✓ Faucet request SUCCESSFUL!');
    } else {
      console.log('✗ Faucet request FAILED (no success indicator in response)');
    }
    
    return response.data;
  } catch (error) {
    console.error('✗ Error making faucet request:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Network error or server timeout.');
    }
    
    throw error;
  }
}

/**
 * 运行测试
 */
async function runTest() {
  // 测试地址 - 注意：请替换为你的真实地址
  const address = process.argv[2] || '0x1234567890123456789012345678901234567890';
  
  if (process.argv[2]) {
    console.log('Using provided address:', address);
  } else {
    console.log('Using test address (not expecting real tokens):', address);
    console.log('To use your real address, run: node test-faucet.js YOUR_ADDRESS');
  }
  
  // 尝试多个可能的 URL
  const urls = [
    process.env.FAUCET_URL || 'https://mbscan.io/airdrop',
    'https://mbscan.io/faucet',
    'https://mbscan.io/api/faucet'
  ];
  
  // 逐个测试 URL
  for (const url of urls) {
    try {
      await testFaucetRequest(address, url);
    } catch (error) {
      console.error(`Test for ${url} failed:`, error.message);
    }
  }
}

// 运行测试
runTest()
  .then(() => {
    console.log('\n===== Faucet Tests Completed =====');
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 