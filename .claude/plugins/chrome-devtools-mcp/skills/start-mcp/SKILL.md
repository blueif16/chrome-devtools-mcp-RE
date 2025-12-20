---
name: start-mcp
description: 启动Chrome DevTools mcp服务器并加载到Claude Code
allowed-tools: Read, Bash
---

# 启动Chrome DevTools MCP服务器

## 说明

此skill用于快速启动chrome-devtools-mcp服务器并将其加载到Claude Code中，让你可以立即开始使用浏览器自动化功能。

## 快速启动步骤

### 步骤1: 构建项目
```bash
cd /Users/tk/Desktop/chrome-devtools-mcp-RE
npm run build
```

### 步骤2: 添加到Claude Code
```bash
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js
```

### 步骤3: 验证安装
```bash
claude mcp list
```

应该能看到 `chrome-devtools` 出现在MCP服务器列表中。

## 重新加载MCP服务器

如果修改了代码需要重新加载：

```bash
# 1. 重新构建
npm run build

# 2. 移除旧的MCP服务器
claude mcp remove chrome-devtools

# 3. 重新添加
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js
```

## 测试MCP服务器

使用MCP Inspector进行测试：
```bash
npx @modelcontextprotocol/inspector node build/src/index.js
```

## 可用功能

加载后，你可以使用26个浏览器自动化工具，包括：
- 页面导航和管理
- 表单填写和点击操作
- 网络请求监控
- 性能分析
- 页面截图和快照
- JavaScript执行

## 常见问题

**Q: 如何知道MCP服务器是否正常运行？**
A: 在Claude Code中，MCP工具会自动出现在可用工具列表中。

**Q: 修改代码后需要重启吗？**
A: 是的，需要重新构建并重新添加MCP服务器。

**Q: 如何查看MCP服务器日志？**
A: 使用 `npm run start-debug` 启动服务器查看详细日志。
