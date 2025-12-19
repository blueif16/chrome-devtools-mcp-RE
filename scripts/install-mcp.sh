#!/bin/bash

# MCP安装脚本
# 用于快速安装和配置chrome-devtools-mcp

set -e

echo "=== Chrome DevTools MCP 安装脚本 ==="
echo ""

# 检查Node.js版本
echo "检查Node.js版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "错误: 需要Node.js 20.19+版本"
    exit 1
fi
echo "✓ Node.js版本符合要求"

# 安装依赖
echo ""
echo "安装项目依赖..."
npm ci

# 构建项目
echo ""
echo "构建项目..."
npm run build

echo ""
echo "✓ 安装完成！"
echo ""
echo "=== 使用方法 ==="
echo ""
echo "1. 本地测试运行:"
echo "   npm start"
echo ""
echo "2. 带UI模式运行（可以看到ghost cursor）:"
echo "   node build/src/index.js"
echo ""
echo "3. 无头模式运行:"
echo "   node build/src/index.js --headless"
echo ""
echo "4. 配置MCP客户端（如Claude Code）:"
echo "   claude mcp add chrome-devtools node $(pwd)/build/src/index.js"
echo ""
