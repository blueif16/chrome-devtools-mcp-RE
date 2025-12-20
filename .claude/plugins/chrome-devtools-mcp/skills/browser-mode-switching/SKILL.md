---
name: browser-mode-switching
description: 在独立模式和Browserless模式之间切换Chrome DevTools MCP服务器连接方式
allowed-tools: Bash
---

# 浏览器模式切换

在Claude Code中切换Chrome DevTools MCP服务器的连接模式，支持独立模式和Browserless模式。

## 模式概述

### 独立模式（Standalone Mode）

MCP服务器自动启动和管理Chrome浏览器实例。

**适用场景**：
- 快速功能开发和调试
- 测试Ghost Cursor和反检测功能
- 机器人检测网站验证
- 单次会话临时任务
- 本地开发环境

**特点**：
- 零配置，开箱即用
- 自动启动Chrome实例
- 会话结束后数据不保留
- 快速启动，适合迭代开发

### Browserless模式

MCP服务器连接到外部Browserless服务（需要手动启动）。

**适用场景**：
- 生产环境部署
- 多账号管理
- 需要持久化会话（cookies/localStorage）
- 特定浏览器指纹配置
- 分布式自动化任务

**特点**：
- 需要先启动Browserless服务
- 支持配置文件持久化
- 跨会话保留数据
- 适合生产环境

## 模式切换操作

### 切换到独立模式

```bash
# 1. 移除现有MCP服务器
claude mcp remove chrome-devtools

# 2. 添加独立模式配置
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js

# 3. 验证配置
claude mcp list
```

**可选参数**：
```bash
# 使用headless模式
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js --headless

# 使用临时用户数据目录
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js --isolated

# 指定Chrome版本
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js --channel=canary
```

### 切换到Browserless模式

```bash
# 1. 确保Browserless服务已启动（需要手动启动）

# 2. 移除现有MCP服务器
claude mcp remove chrome-devtools

# 3. 添加Browserless模式配置
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js --browserUrl=http://127.0.0.1:9222

# 4. 验证配置
claude mcp list
```

**注意**：Browserless模式的具体配置将在后续补充。

## 可用的MCP工具

切换模式后，以下工具在两种模式下都可用：

**页面导航**：
- `mcp__chrome-devtools__navigate_page` - 导航到URL
- `mcp__chrome-devtools__new_page` - 创建新页面
- `mcp__chrome-devtools__close_page` - 关闭页面
- `mcp__chrome-devtools__list_pages` - 列出所有页面
- `mcp__chrome-devtools__select_page` - 选择页面

**交互操作**：
- `mcp__chrome-devtools__click` - 点击元素（支持Ghost Cursor）
- `mcp__chrome-devtools__fill` - 填写表单
- `mcp__chrome-devtools__hover` - 悬停元素
- `mcp__chrome-devtools__press_key` - 按键操作
- `mcp__chrome-devtools__drag` - 拖拽元素

**页面分析**：
- `mcp__chrome-devtools__take_snapshot` - 获取页面可访问性树快照
- `mcp__chrome-devtools__take_screenshot` - 截图
- `mcp__chrome-devtools__evaluate_script` - 执行JavaScript

**网络和性能**：
- `mcp__chrome-devtools__list_network_requests` - 列出网络请求
- `mcp__chrome-devtools__performance_start_trace` - 开始性能追踪
- `mcp__chrome-devtools__performance_stop_trace` - 停止性能追踪

## 使用示例

### 独立模式示例

```bash
# 配置独立模式
claude mcp remove chrome-devtools
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js
```

在Claude Code中使用：
- 直接调用MCP工具，服务器会自动启动Chrome
- 无需额外配置
- 适合快速测试和开发

### Browserless模式示例

```bash
# 配置Browserless模式
claude mcp remove chrome-devtools
claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js --browserUrl=http://127.0.0.1:9222
```

在Claude Code中使用：
- 确保Browserless服务已启动
- 调用相同的MCP工具
- 会话数据会持久化保存

## 模式选择决策

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 本地开发调试 | 独立模式 | 快速启动，零配置 |
| 测试Ghost Cursor | 独立模式 | 快速迭代验证 |
| 机器人检测测试 | 独立模式 | 临时会话即可 |
| 生产环境部署 | Browserless | 持久化会话 |
| 多账号管理 | Browserless | 配置文件隔离 |
| 需要保留登录状态 | Browserless | 跨会话保留cookies |

## 最佳实践

1. **开发阶段**：使用独立模式进行快速迭代和功能验证
2. **测试阶段**：在独立模式下完成基本功能测试
3. **生产阶段**：切换到Browserless模式进行最终部署
4. **模式切换**：每次切换后使用 `claude mcp list` 验证配置
5. **参数调整**：根据需求添加 `--headless`、`--isolated` 等参数

## 常见问题

**Q: 切换模式后需要重启Claude Code吗？**
A: 不需要，MCP服务器会自动重新连接。

**Q: 两种模式的工具调用方式有区别吗？**
A: 没有区别，使用相同的MCP工具名称和参数。

**Q: 如何验证当前使用的是哪种模式？**
A: 使用 `claude mcp list` 查看配置参数，有 `--browserUrl` 的是Browserless模式。

**Q: 独立模式的数据保存在哪里？**
A: 默认保存在 `$HOME/.cache/chrome-devtools-mcp/chrome-profile-stable`，使用 `--isolated` 参数会使用临时目录。

## 注意事项

- 同一时间只能有一个chrome-devtools MCP服务器运行
- 切换模式前必须先移除现有配置
- Browserless模式需要手动启动外部服务
- 独立模式的会话数据在浏览器关闭后可能丢失（除非指定userDataDir）
- 所有MCP工具在两种模式下行为一致
