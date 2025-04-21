#!/usr/bin/env node

/**
 * MegaBNB 领水工具
 * 
 * 功能:
 * 从Excel文件中读取发送账户，为每个账户请求测试代币
 * 循环100轮，每轮每个账户请求一次
 */

const { readSenderList } = require('./read-excel');
const { web3 } = require('./utils');
const { requestFaucetTokens } = require('./faucet');
require('dotenv').config();

/**
 * 主函数 - 执行领水流程
 */
async function main() {
  try {
    console.log('\n======== MegaBNB 领水工具 ========');
    console.log('为账户请求测试代币，100轮循环...\n');
    
    // 从Excel文件中读取账户
    const senders = readSenderList();
    
    // 检查账户是否有效
    if (!senders || senders.length === 0) {
      throw new Error('错误: 没有找到有效的发送账户。请检查Excel文件。');
    }
    
    console.log(`找到 ${senders.length} 个账户\n`);
    
    // 显示账户信息
    senders.forEach((sender, index) => {
      // 隐藏私钥中间部分，只显示前6位和后4位
      const hiddenKey = `${sender.privateKey.substring(0, 6)}...${sender.privateKey.substring(sender.privateKey.length - 4)}`;
      console.log(`${index+1}. ${sender.address} (私钥: ${hiddenKey})`);
    });
    
    // 开始循环100轮
    const MAX_ROUNDS = 100;
    
    console.log(`\n开始请求测试代币，共${MAX_ROUNDS}轮，每轮处理${senders.length}个账户...\n`);
    
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      console.log(`\n======== 第 ${round}/${MAX_ROUNDS} 轮 ========`);
      
      // 处理每个账户
      for (let i = 0; i < senders.length; i++) {
        const sender = senders[i];
        const senderAddress = sender.address;
        
        console.log(`\n[${round}/${MAX_ROUNDS}] 账户 ${i+1}/${senders.length}: ${senderAddress}`);
        
        try {
          // 检查当前余额
          const balanceBefore = await web3.eth.getBalance(senderAddress);
          console.log(`当前余额: ${web3.utils.fromWei(balanceBefore, 'ether')} MegaBNB`);
          
          // 请求测试代币
          console.log(`从水龙头请求代币...`);
          const faucetResult = await requestFaucetTokens(senderAddress);
          
          if (faucetResult.success) {
            console.log(`✅ 成功从水龙头获取测试代币`);
          } else if (faucetResult.hasBalance) {
            console.log(`⚠️ 水龙头请求失败，但账户已有余额`);
          } else {
            console.warn(`⚠️ 水龙头请求失败`);
          }
          
          // 检查请求后余额
          const balanceAfter = await web3.eth.getBalance(senderAddress);
          console.log(`请求后余额: ${web3.utils.fromWei(balanceAfter, 'ether')} MegaBNB`);
          
          // 计算差额
          const balanceDiff = BigInt(balanceAfter) - BigInt(balanceBefore);
          if (balanceDiff > 0) {
            console.log(`✅ 余额增加了: ${web3.utils.fromWei(balanceDiff.toString(), 'ether')} MegaBNB`);
          } else {
            console.log(`❌ 余额没有变化`);
          }
          
        } catch (error) {
          console.error(`❌ 处理账户 ${senderAddress} 失败: ${error.message}`);
        }
        
        // 等待一定时间，避免请求过于频繁
        const waitTime = 3000; // 3秒
        console.log(`等待 ${waitTime/1000} 秒后处理下一个账户...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // 每轮结束后等待一定时间
      if (round < MAX_ROUNDS) {
        const roundWaitTime = 10000; // 10秒
        console.log(`\n第 ${round} 轮完成，等待 ${roundWaitTime/1000} 秒后开始下一轮...`);
        await new Promise(resolve => setTimeout(resolve, roundWaitTime));
      }
    }
    
    console.log('\n======== 所有轮次已完成 ========');
    return { success: true };
  } catch (error) {
    console.error('\n❌ 领水流程失败:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// 直接执行时调用主函数
if (require.main === module) {
  main()
    .then(result => {
      if (!result.success) {
        console.log('\n程序执行失败');
        process.exit(1);
      }
      console.log('\n程序执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('未捕获错误:', error);
      process.exit(1);
    });
}

module.exports = { main }; 