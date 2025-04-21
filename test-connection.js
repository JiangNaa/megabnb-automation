const axios = require('axios');
const { web3 } = require('./utils');
require('dotenv').config();

/**
 * 测试网络连接和 API 访问
 */
async function testConnections() {
  console.log('===== Testing Network Connections =====');
  
  // 1. 测试 RPC 连接
  try {
    console.log(`Testing RPC connection to ${process.env.MEGABNB_RPC_URL}...`);
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✓ RPC connection successful! Current block number: ${blockNumber}`);
  } catch (error) {
    console.error(`✗ RPC connection failed: ${error.message}`);
  }
  
  // 2. 直接用 HTTP GET 测试水龙头网站
  try {
    console.log(`\nTesting HTTP connection to MegaBNB website...`);
    const response = await axios.get('https://mbscan.io', {
      timeout: 10000
    });
    console.log(`✓ Website connection successful! Status: ${response.status}`);
  } catch (error) {
    console.error(`✗ Website connection failed: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
  }
  
  // 3. 测试水龙头 API
  const testUrl = process.env.FAUCET_URL || 'https://mbscan.io/airdrop';
  console.log(`\nTesting airdrop API with OPTIONS request to ${testUrl}...`);
  
  try {
    const optionsResponse = await axios({
      method: 'OPTIONS',
      url: testUrl,
      timeout: 10000
    });
    console.log(`✓ OPTIONS request successful!`);
    console.log(`Response headers:`, optionsResponse.headers);
  } catch (error) {
    console.log(`OPTIONS request failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Headers:`, error.response.headers);
    }
  }
  
  // 4. 使用 curl 命令模拟请求
  console.log('\n===== Testing with curl commands =====');
  console.log('You can run these curl commands manually to test the API:');
  
  console.log(`\n# Test JSON POST request:`);
  console.log(`curl -X POST ${testUrl} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "User-Agent: Mozilla/5.0" \\
  -d '{"address":"0x1234567890123456789012345678901234567890"}' \\
  -v`);
  
  console.log(`\n# Test URL-encoded POST request:`);
  console.log(`curl -X POST ${testUrl} \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "Accept: application/json" \\
  -H "User-Agent: Mozilla/5.0" \\
  -d "address=0x1234567890123456789012345678901234567890" \\
  -v`);
  
  console.log(`\n# Test GET request:`);
  console.log(`curl "${testUrl}?address=0x1234567890123456789012345678901234567890" \\
  -H "Accept: application/json" \\
  -H "User-Agent: Mozilla/5.0" \\
  -v`);
}

// 运行测试
testConnections()
  .then(() => {
    console.log('\n===== Connection Tests Completed =====');
  })
  .catch(error => {
    console.error('Test failed with error:', error);
  }); 