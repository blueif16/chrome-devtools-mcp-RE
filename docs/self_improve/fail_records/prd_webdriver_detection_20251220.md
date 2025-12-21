# PRD: bot.incolumitas.com WEBDRIVER 检测失败

## 问题概述

**测试网站**: bot.incolumitas.com
**失败检测项**: WEBDRIVER
**严重程度**: HIGH
**日期**: 2025-12-20

## 测试结果

### Level 1: bot.sannysoft.com
✅ **通过** - 所有基础检测项通过
- navigator.webdriver: false
- User-Agent: 正常
- window.chrome: 存在
- navigator.plugins: 5 个插件

### Level 2: bot.incolumitas.com
❌ **失败** - WEBDRIVER 检测失败
- 检测结果: `"WEBDRIVER": "FAIL"`
- 详细数据: `"webDriver": true`, `"webDriverValue": false`
- 原型链检测: `"webdriver~~~function get webdriver() { [native code] }"`
- 行为评分: 未显示（显示为 "..."）

## 尝试的修复方案

### 修复 1: evaluateOnNewDocument 删除属性
**方法**: 使用 `Object.defineProperty` 重新定义 `navigator.webdriver` 为 `undefined`

**代码**:
```javascript
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true,
});
```

**结果**: ❌ 失败
**原因**: 属性本身的存在被检测到，即使值是 undefined

### 修复 2: Proxy 拦截
**方法**: 使用 Proxy 完全隐藏 webdriver 属性

**代码**:
```javascript
const navigatorProxy = new Proxy(originalNavigator, {
  get: (target, prop) => {
    if (prop === 'webdriver') return undefined;
    return target[prop];
  },
  has: (target, prop) => {
    if (prop === 'webdriver') return false;
    return prop in target;
  },
});
```

**结果**: ❌ 失败
**原因**: 检测网站仍能通过原型链或其他方式检测到属性

### 修复 3: （未尝试）
**建议**: 依赖 rebrowser-puppeteer 的原生补丁，移除自定义脚本

## 根本原因分析

1. **检测层级过深**: bot.incolumitas.com 使用了比 bot.sannysoft.com 更高级的检测
2. **原型链检测**: 检测代码检查 `Object.getPrototypeOf(navigator)` 中的属性
3. **属性描述符检测**: 可能检查属性的 configurable/enumerable/writable 标志
4. **rebrowser-puppeteer 限制**: 即使使用了 rebrowser-puppeteer，仍无法完全绕过此检测

## 技术限制

**当前配置**:
- 使用 `rebrowser-puppeteer` v24.8.1
- 启动参数: `--disable-blink-features=AutomationControlled`
- 环境变量: `REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated'`

**限制**:
- JavaScript 层面的修改无法完全隐藏自动化特征
- 需要更底层的补丁（如 rebrowser-patches）
- 或者需要修改 Chromium 源码

## 建议的解决方案

### 短期方案
1. **接受部分失败**: Level 1 通过已经足够应对大多数网站
2. **关注行为评分**: 如果行为评分 > 0.7，可能仍可通过实际应用

### 中期方案
1. **集成 puppeteer-extra-plugin-stealth**: 使用更成熟的反检测方案
2. **使用 rebrowser-patches**: 需要额外的二进制补丁
3. **优化人类行为模拟**: 改进鼠标移动、滚动等行为

### 长期方案
1. **使用真实设备指纹**: 从真实浏览器提取指纹数据
2. **CDP 隐藏**: 完全隐藏 Chrome DevTools Protocol 的痕迹
3. **考虑替代方案**: 如 Playwright with stealth mode

## 影响评估

**对 Reddit 自动化的影响**:
- **低风险**: Reddit 可能不使用 bot.incolumitas.com 级别的检测
- **建议**: 继续测试 Level 3 和 Level 4，验证实际影响
- **备选**: 如果 Reddit 失败，考虑使用更高级的反检测方案

## 下一步行动

1. ✅ 记录此 PRD 文档
2. ⏸️ 暂停 Level 2 的进一步修复
3. ❓ 决定是否继续 Level 3 测试（需要人工决策）
4. ❓ 或者停止测试，等待人工介入

## 参考资料

- [rebrowser-puppeteer](https://github.com/rebrowser/rebrowser-puppeteer)
- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [bot.incolumitas.com 检测方法](https://bot.incolumitas.com)
