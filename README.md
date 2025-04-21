# MegaBNB 自动化工具

这个工具用于在MegaBNB网络上自动执行以下操作：
1. 从水龙头获取测试代币
2. 执行一对一的转账（每个发送账户对应一个接收地址）
3. 部署智能合约

## 一对一转账模式

此工具实现了**一对一的转账关系**：
- 每个发送账户只会向一个对应的接收地址转账

- 发送和接收地址按顺序配对（第1个发送账户->第1个接收地址，第2个->第2个，依此类推）

- 如果发送账户数量和接收地址数量不一致，会使用较少的那个数量进行配对

  

## 安装与设置

1. 克隆仓库并安装依赖:
```
git clone <仓库地址>
cd megabnb-automation
npm install
```

2. 创建环境配置文件:
```
cp .env.example .env
```

3. 编辑 `.env` 文件，确保以下配置正确:
```
MEGABNB_RPC_URL=https://megabnb.publicnode.com
MEGABNB_CHAIN_ID=91715
GAS_PRICE=5000000000
FAUCET_URL=https://mbscan.io/airdrop
```

如果只需要领水，执行文件  ./request-xx .JS 如果需要 megaCat n f t 也是执行单个文件 ./zero-xx .js

## 准备Excel文件

1. `MegaBNBSend.xlsx` - 发送账户列表:
   - 包含三列：`address`、`privateKey`、`mnemonic`
   - 每行表示一个发送账户
   - 必须填写 `address` 和 `privateKey` (带0x前缀)
   - `mnemonic` 列可以留空

2. `megaBNBRecive.xlsx` - 接收地址列表:
   - 包含三列：`address`、`privateKey`、`mnemonic`
   - 只需填写 `address` 列
   - 每行表示一个接收地址

## 运行自动化流程

执行自动化流程，按一对一的方式进行转账:
```
npm start
```

## 其他命令

- 只读取Excel文件并显示账户信息:
```
npm run read-excel
```

- 只执行合约部署步骤:
```
npm run deploy-only
```

## 流程说明

1. 读取Excel文件中的发送账户和接收地址
2. 创建一对一的转账配对关系
3. 对于每一对配对:
   - 从水龙头请求测试代币给发送账户
   - 从发送账户向对应的一个接收地址转账0.001 MegaBNB
   - 从发送账户部署一个智能合约
4. 显示执行结果摘要

## 注意事项

- 确保`privateKey`包含`0x`前缀
- 如果水龙头请求失败但账户已有余额，将继续执行后续步骤
- 程序会自动处理余额不足的情况，仍将执行合约部署步骤

## Prerequisites

- Node.js v14+
- npm or yarn

## Known Issues and Troubleshooting

### Faucet API Issues

If you encounter a 404 error when requesting tokens from the faucet, it may be because the faucet URL has changed. Try these solutions:

1. Visit the official MegaBNB website to find the correct faucet URL
2. Update the `FAUCET_URL` in your `.env` file accordingly
3. If the faucet is down, you may need to manually acquire test tokens through other means

### Alternative Faucet URLs to Try

If the default faucet URL doesn't work, you can try these alternatives by updating your `.env` file:

```
FAUCET_URL=https://mbscan.io/faucet
```

or

```
FAUCET_URL=https://faucet.mbscan.io
```

### Using Existing Balance

If you already have tokens in your wallet, the tool will detect this and proceed with transfers even if the faucet request fails.

## Usage

### Command-line Usage with run-example.js

The easiest way to use this tool is with the provided `run-example.js` script:

```bash
npm run example -- --private-key YOUR_PRIVATE_KEY --address YOUR_ADDRESS --recipients RECIPIENT1,RECIPIENT2
```

Or directly:

```bash
node run-example.js --private-key YOUR_PRIVATE_KEY --address YOUR_ADDRESS --recipients RECIPIENT1,RECIPIENT2
```

Available options:

```
Options:
  --private-key, -k   Private key (required)
  --address, -a       Initial address (required)
  --recipients, -r    Comma-separated list of recipient addresses (optional)
  --amount, -m        Amount to send to each recipient in ether (default: 0.01)
  --deploy-erc20, -d  Deploy ERC20 token contract (default: true)
  --token-name, -n    ERC20 token name (default: "MegaToken")
  --token-symbol, -s  ERC20 token symbol (default: "MGT")
  --help, -h          Show this help text
```

Example:
```bash
node run-example.js -k 0x123... -a 0xabc... -r 0xdef...,0x456... -m 0.02
```

### Basic Usage

The tool can also be used as a standard command-line application or imported as a module in your own JavaScript code.

#### Basic command-line usage:

1. Edit the `runExample()` function in `index.js` to include your accounts, recipient addresses, and contract data.
2. Run the script:
```
npm start
```

#### Programmatic usage:

```javascript
const { processMultipleAddresses } = require('./index');

// Define your accounts (private keys and addresses)
const accounts = [
  {
    privateKey: "your-private-key-1",
    address: "your-address-1"
  },
  // Add more accounts as needed
];

// Define recipient addresses
const recipientAddresses = [
  "recipient-address-1",
  "recipient-address-2"
  // Add more recipient addresses as needed
];

// Amount to send to each recipient (in wei)
const amountToSendPerAddress = "10000000000000000"; // 0.01 MegaBNB

// Optional: Custom contract data for deployment
// If not provided, a sample ERC20 token contract will be deployed
const contractData = {
  abi: [...], // Your contract ABI
  bytecode: "0x...", // Your contract bytecode
  constructorArgs: ["Arg1", "Arg2"] // Optional constructor arguments
};

// Run the automation
processMultipleAddresses(
  accounts,
  recipientAddresses,
  amountToSendPerAddress,
  contractData
)
  .then(results => {
    console.log("Automation completed successfully:", results);
  })
  .catch(error => {
    console.error("Automation failed:", error);
  });
```

### Module structure

- `index.js` - Main entry point for the application
- `faucet.js` - Handles interaction with the MegaBNB faucet