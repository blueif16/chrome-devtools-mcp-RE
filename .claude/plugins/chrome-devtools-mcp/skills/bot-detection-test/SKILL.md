---
name: bot-detection-test
description: 渐进式机器人检测测试和自动修复。从Level 1开始测试，失败时自动修复代码，只有通过当前级别才进入下一级别
allowed-tools: Read, Edit, Write, Bash, TodoWrite, Glob, Grep, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__new_page, mcp__chrome-devtools__list_pages
---

# 机器人检测测试与自动修复

## 目的
渐进式测试 chrome-devtools-mcp 的反检测能力，失败时自动修复代码，确保每个级别通过后才进入下一级别。

## 核心原则
1. **渐进式测试**：必须按 Level 1 → Level 2 → Level 3 → Level 4 顺序
2. **失败即停止**：当前级别不通过，不进入下一级别
3. **最多3次修复**：每个失败项最多尝试修复3次
4. **生成PRD**：3次失败后生成详细文档，等待人工介入
5. **代码修改前检查**：确保不破坏现有功能
6. **构建验证**：每次修改后必须 `npm run build` 并且根据 start mcp 重新添加到 claude code

## ⚠️ 关键错误记录

**错误：修改代码后忘记重启 MCP**

症状：代码已修改并构建，但测试结果无变化

原因：MCP 服务器仍运行旧代码，构建 ≠ 生效

解决：
```bash
npm run build
claude mcp remove chrome-devtools
claude mcp add chrome-devtools node /path/to/build/src/index.js
```

**记住：每次修改代码后必须重启 MCP！**

## 执行流程

### 阶段0：初始化

1. 使用 TodoWrite 创建任务列表
2. 创建 screenshots 目录：`mkdir -p screenshots`
3. 确认 MCP 服务器已重新启动 with start mcp, claude code add mcp
4. 输出测试开始信息

### 阶段1：Level 1 基础检测测试

#### 1.1 测试 bot.sannysoft.com

**步骤：**
1. 使用 navigate_page 访问 https://bot.sannysoft.com
2. 使用 wait_for 等待 5000ms
3. 使用 take_screenshot 保存到 screenshots/sannysoft_baseline.png
4. 使用 evaluate_script 检查关键属性
5. 分析结果，记录失败项

**失败判定：**
- navigator.webdriver === true → CRITICAL
- userAgent 包含 HeadlessChrome → CRITICAL
- hasChrome === false → HIGH
- hasPlugins === false → MEDIUM

#### 1.2 如果测试失败 - 自动修复（最多3次）

参考 docs/self_improve/simple_fix.md 中的修复方案：

**修复 navigator.webdriver：**
- 读取 src/browser.ts，添加启动参数 --disable-blink-features=AutomationControlled
- 或在 src/McpContext.ts 注入脚本删除 webdriver 属性
- 执行 npm run build 并重新测试

**修复 HeadlessChrome UA：**
- 读取 src/browser.ts，修改 User-Agent 为正常 Chrome
- 执行 npm run build 并重新测试

**修复 window.chrome：**
- 在页面初始化脚本中添加 window.chrome 对象
- 执行 npm run build 并重新测试

**修复 navigator.plugins：**
- 在页面初始化脚本中填充 plugins 数组
- 执行 npm run build 并重新测试

#### 1.3 修复失败处理

如果3次修复都失败：
1. 读取 docs/self_improve/prd_template.md
2. 生成 PRD 文档到 docs/self_improve/prd_sannysoft_{timestamp}.md
3. 输出：停止测试，等待人工介入
4. 不要进入 Level 2

#### 1.4 通过条件

只有所有检查都通过才进入 Level 2

### 阶段2：Level 2 行为检测测试

#### 2.1 测试 bot.incolumitas.com

Main test is "Bot Challenge
Your bot has to fill out the form below and submit it. Then you are prompted to confirm the pop-up dialoge. After confirmation, you will see a table with basket items and prices. Update the prices of this table and scrape the data as a final step.

Completing all those steps provides enough behaviroal information in order to classify you as BotOrNot."

**步骤：**
1. 访问 https://bot.incolumitas.com
2. 使用 take_snapshot 查看页面结构，找到表单元素
3. 使用 fill 工具填写表单字段（如果有）
4. 使用 click 工具点击提交按钮（如果需要）
5. 等待 15000ms 让检测完成
6. 使用 evaluate_script 提取检测结果和行为评分
7. 截图保存到 screenshots/incolumitas_with_score.png

**关键检查项：**
- 提取最终的行为评分（behavioral score）
- 检查是否有 FAIL 标记的检测项
- 特别关注：webdriver、WebWorker 一致性、插件检测

#### 2.2 如果行为评分 < 0.7 或有 CRITICAL 失败 - 自动修复

**修复方向：**
1. 检查 src/tools/input.ts 和 src/utils/mouse-helper.ts
2. 添加 Bezier 曲线鼠标移动算法
3. 添加变速滚动实现
4. 确保随机延迟（100-300ms）
5. 修复 WebWorker 上下文中的 navigator 属性
6. 执行 npm run build 并重启 MCP 重新测试

**如果3次失败：**
- 生成 PRD，建议集成 ghost-cursor
- 停止测试，不进入 Level 3

#### 2.3 通过条件

行为评分 > 0.7 且无 CRITICAL 失败项才进入 Level 3

### 阶段3：Level 3 高级检测测试

#### 3.1 测试 creepjs

访问 https://abrahamjuliot.github.io/creepjs/，提取 Trust Score

**如果 Trust Score < 65% 或 lies > 5：**
- 生成 PRD，说明需要真实设备指纹或 rebrowser-patches
- 停止测试

#### 3.2 测试 rebrowser-bot-detector

访问 https://bot-detector.rebrowser.net/

**如果检测到 CDP/Puppeteer 签名：**
- 输出：需要 rebrowser-patches，无法简单修复
- 生成 PRD
- 停止测试

### 阶段4：Level 4 Reddit 验证

访问 https://www.reddit.com/r/test，检查：
- 是否有 Cloudflare 挑战
- 内容是否正常加载
- 交互元素是否存在

### 阶段5：生成最终报告

输出测试摘要、详细结果、已应用的修复、下一步建议

## 代码修改关键文件

1. src/browser.ts - 浏览器启动配置
2. src/McpContext.ts - 页面初始化脚本注入
3. src/tools/input.ts - 输入工具
4. src/utils/mouse-helper.ts - 鼠标助手
5. src/utils/screen-position-patcher.ts - 屏幕位置修复

## 使用方式

用户调用此 skill 后自动执行完整测试流程

## 输出格式

每个级别测试后输出状态、详细结果、截图路径
失败时输出修复尝试过程
3次失败后输出 PRD 路径并停止
