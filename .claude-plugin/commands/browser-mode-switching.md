---
name: browser-mode-switching
description: 在独立模式和Browserless模式之间切换浏览器，用于不同的自动化场景
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

# 浏览器模式切换

在独立模式（Standalone）和Browserless模式之间智能切换，一个MCP服务器处理两种模式。

## 执行流程

### 第一步：分析任务需求

根据用户的任务描述，自动判断应该使用哪种浏览器模式：

**独立模式适用场景**：
- 测试Ghost Cursor移动效果
- 验证Rebrowser反检测功能
- 快速功能开发和调试
- 机器人检测网站检查
- 单次会话临时任务

**Browserless模式适用场景**：
- Reddit账号自动化
- 多账号操作
- 需要持久化会话（cookies/localStorage）
- 特定指纹配置
- 生产环境工作流

### 第二步：配置浏览器连接

根据选择的模式，配置相应的浏览器连接参数：

**独立模式配置**：
```javascript
// 直接使用chrome_devtools_rebrowser
// 无需额外配置，MCP服务器会自动启动Chrome实例
await chrome_devtools_rebrowser.navigate_page({ url: "..." });
await chrome_devtools_rebrowser.click({ uid: "..." });
```

**Browserless模式配置**：
```javascript
// 步骤1: 启动Browserless配置文件
const browser = await browserless_automation.start_profile({
  profileId: "profile_name"
});

// 步骤2: 使用相同的chrome_devtools_rebrowser命令
await chrome_devtools_rebrowser.navigate_page({ url: "..." });
await chrome_devtools_rebrowser.click({ uid: "..." });

// 步骤3: 关闭配置文件
await browserless_automation.close_profile({ profileId: "profile_name" });
```

### 第三步：执行自动化任务

使用统一的chrome_devtools_rebrowser工具执行任务，无论哪种模式都使用相同的API。

### 第四步：模式切换建议

**从独立模式切换到Browserless**：
- 功能在独立模式下验证通过后
- 需要在生产环境部署前
- 使用Browserless配置文件进行测试

**从Browserless切换到独立模式**：
- 调试配置文件特定问题时
- 首先在独立模式下隔离测试
- 快速验证功能逻辑

## 模式选择决策表

| 场景 | 模式 | 原因 |
|------|------|------|
| 测试Ghost Cursor | 独立模式 | 快速迭代 |
| 机器人检测验证 | 独立模式 | 快速验证 |
| Reddit自动化 | Browserless | 需要指纹 |
| 多账号任务 | Browserless | 配置文件隔离 |
| 功能开发 | 独立模式 | 无设置开销 |
| 生产部署 | Browserless | 持久化会话 |

## 关键区别

**独立模式**：
- 每次启动新的临时会话
- 无指纹持久化
- 快速启动，适合开发测试
- 会话结束后数据不保留

**Browserless模式**：
- 持久化配置文件
- 指纹、cookies、localStorage跨会话保留
- 适合生产环境和多账号管理
- 需要配置文件管理

## 最佳实践

- 开发阶段优先使用独立模式进行快速迭代
- 生产环境使用Browserless模式确保会话持久化
- 两种模式使用相同的MCP服务器，通过是否启动Browserless配置文件来切换
- 在独立模式下验证功能后，再在Browserless模式下进行最终测试
- 使用清晰的配置文件命名规范管理多个Browserless配置文件

## 示例

**示例 1**: 独立模式 - 快速测试Ghost Cursor

```javascript
// 直接使用，无需额外配置
await chrome_devtools_rebrowser.navigate_page({
  url: "https://example.com"
});

await chrome_devtools_rebrowser.click({
  uid: "button-123",
  useGhostCursor: true
});
```

**示例 2**: Browserless模式 - Reddit账号自动化

```javascript
// 启动持久化配置文件
const browser = await browserless_automation.start_profile({
  profileId: "reddit_account_1"
});

// 执行自动化任务
await chrome_devtools_rebrowser.navigate_page({
  url: "https://reddit.com"
});

await chrome_devtools_rebrowser.fill({
  uid: "username-input",
  value: "myusername"
});

// 关闭配置文件（保留会话数据）
await browserless_automation.close_profile({
  profileId: "reddit_account_1"
});
```

**示例 3**: 模式切换 - 从开发到生产

```javascript
// 开发阶段：独立模式快速验证
await chrome_devtools_rebrowser.navigate_page({ url: "https://target-site.com" });
await chrome_devtools_rebrowser.click({ uid: "login-button" });
// 验证功能正常...

// 生产阶段：切换到Browserless模式
const browser = await browserless_automation.start_profile({
  profileId: "production_profile"
});

// 使用相同的代码
await chrome_devtools_rebrowser.navigate_page({ url: "https://target-site.com" });
await chrome_devtools_rebrowser.click({ uid: "login-button" });

await browserless_automation.close_profile({
  profileId: "production_profile"
});
```

## 错误处理

- 如果Browserless配置文件启动失败，自动回退到独立模式
- 提供清晰的错误信息说明当前使用的模式
- 在模式切换时验证必要的工具是否可用

## 注意事项

- 两种模式共享相同的chrome_devtools_rebrowser工具集
- 模式切换不需要重启MCP服务器
- Browserless模式需要额外的browserless_automation工具
- 独立模式的会话数据在浏览器关闭后会丢失
