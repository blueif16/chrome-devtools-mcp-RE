# chrome-devtools-mcp

Reliable automation, in-depth debugging, and performance analysis in Chrome using Chrome DevTools and Puppeteer

## 安装

```
/plugin marketplace add <marketplace-url>
/plugin install chrome-devtools-mcp
```

## 使用

### Skills

#### browser-mode-switching

在独立模式和Browserless模式之间切换浏览器，用于不同的自动化场景。

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

## MCP服务器配置

此插件需要配置chrome-devtools MCP服务器。在你的MCP配置中添加：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

## 开发

此插件遵循SkillForge插件规范。

### 目录结构

```
chrome-devtools-mcp/
├── .claude-plugin/
│   └── plugin.json          # 插件元数据
├── skills/                  # 立即可用的skills
│   └── browser-mode-switching/
│       └── SKILL.md
├── agents/                  # 立即可用的agents
├── commands/                # 需要安装才能使用
├── hooks/                   # 立即可用的hooks
│   └── hooks.json
├── .skillforge-meta        # SkillForge元数据
├── .gitignore
└── README.md
```
