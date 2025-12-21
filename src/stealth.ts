/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Browser, Page} from './third_party/index.js';
import {logger} from './logger.js';

/**
 * 隐身脚本：在页面加载前注入，移除 navigator.webdriver 等自动化特征
 * 这是反检测的核心，必须在任何网站 JavaScript 执行前运行
 */
const STEALTH_SCRIPT = `
  // ============================================
  // Fix 1: 完全移除 navigator.webdriver
  // 终极方案：使用 Proxy 劫持 navigator 对象
  // ============================================

  // 步骤 1: 尝试删除属性
  try {
    delete Object.getPrototypeOf(navigator).webdriver;
  } catch (e) {}

  try {
    delete navigator.webdriver;
  } catch (e) {}

  // 步骤 2: 使用 Proxy 包装 navigator，完全劫持 'in' 操作符
  const navigatorProxy = new Proxy(navigator, {
    has: (target, prop) => {
      if (prop === 'webdriver') {
        return false;
      }
      return Reflect.has(target, prop);
    },
    get: (target, prop) => {
      if (prop === 'webdriver') {
        return undefined;
      }
      return Reflect.get(target, prop);
    }
  });

  // 步骤 3: 替换全局 navigator
  try {
    Object.defineProperty(window, 'navigator', {
      get: () => navigatorProxy,
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 步骤 4: 劫持 Object.getOwnPropertyDescriptor
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  Object.getOwnPropertyDescriptor = function(obj, prop) {
    if ((obj === navigator || obj === navigatorProxy || obj === Object.getPrototypeOf(navigator)) && prop === 'webdriver') {
      return undefined;
    }
    return originalGetOwnPropertyDescriptor(obj, prop);
  };

  // 步骤 5: 劫持 Object.keys 和 Object.getOwnPropertyNames
  const originalKeys = Object.keys;
  Object.keys = function(obj) {
    const keys = originalKeys(obj);
    if (obj === navigator || obj === navigatorProxy) {
      return keys.filter(k => k !== 'webdriver');
    }
    return keys;
  };

  const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
  Object.getOwnPropertyNames = function(obj) {
    const names = originalGetOwnPropertyNames(obj);
    if (obj === navigator || obj === navigatorProxy || obj === Object.getPrototypeOf(navigator)) {
      return names.filter(n => n !== 'webdriver');
    }
    return names;
  };

  // 步骤 6: 劫持 hasOwnProperty
  const originalHasOwnProperty = Object.prototype.hasOwnProperty;
  Object.prototype.hasOwnProperty = function(prop) {
    if ((this === navigator || this === navigatorProxy) && prop === 'webdriver') {
      return false;
    }
    return originalHasOwnProperty.call(this, prop);
  };

  // ============================================
  // Fix 2: navigator.plugins with REAL prototypes
  // ============================================

  // 从干净的 iframe 获取真实的原型
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const realPluginArrayProto = iframe.contentWindow.navigator.plugins.__proto__;
  const realPluginProto = iframe.contentWindow.navigator.plugins[0]?.__proto__;
  document.body.removeChild(iframe);

  // 创建假插件
  const createPlugin = (name, filename, description) => {
    const plugin = {
      name,
      filename,
      description,
      length: 1,
      [0]: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description }
    };

    if (realPluginProto) Object.setPrototypeOf(plugin, realPluginProto);
    Object.defineProperty(plugin, Symbol.toStringTag, {
      get: () => 'Plugin',
      enumerable: false,
      configurable: true
    });

    return plugin;
  };

  const plugins = [
    createPlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format'),
    createPlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'Portable Document Format'),
    createPlugin('Native Client', 'internal-nacl-plugin', 'Native Client Executable')
  ];

  const pluginArray = {};
  if (realPluginArrayProto) Object.setPrototypeOf(pluginArray, realPluginArrayProto);

  plugins.forEach((plugin, i) => {
    Object.defineProperty(pluginArray, i, { value: plugin, enumerable: true });
  });

  Object.defineProperty(pluginArray, 'length', { value: plugins.length, enumerable: false });
  pluginArray.item = function(index) { return this[index] || null; };
  pluginArray.namedItem = function(name) {
    return plugins.find(p => p.name === name) || null;
  };
  pluginArray.refresh = function() {};

  Object.defineProperty(pluginArray, Symbol.toStringTag, {
    get: () => 'PluginArray',
    enumerable: false,
    configurable: true
  });

  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray,
    enumerable: true,
    configurable: true
  });

  // 语言设置
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en']
  });

  // ============================================
  // Fix 3: 添加 Chrome 对象
  // ============================================
  if (!window.chrome) {
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
  }

  // ============================================
  // Fix 4: 权限 API 修复
  // ============================================
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({
        state: Notification.permission,
        addEventListener: () => {},
        removeEventListener: () => {}
      });
    }
    return originalQuery(parameters);
  };

  // ============================================
  // Fix 5: 修复 Chrome 运行时
  // ============================================
  Object.defineProperty(navigator, 'connection', {
    get: () => ({
      effectiveType: '4g',
      rtt: 100,
      downlink: 10,
      saveData: false
    })
  });
`;

/**
 * 为单个页面应用隐身脚本
 */
export async function applyStealthToPage(page: Page): Promise<void> {
  try {
    await page.evaluateOnNewDocument(STEALTH_SCRIPT);
    logger('✅ Stealth script applied to page');
  } catch (error) {
    logger('❌ Failed to apply stealth script:', error);
    throw error;
  }
}

/**
 * 为浏览器的所有现有页面和未来新页面应用隐身脚本
 */
export async function applyStealthToBrowser(browser: Browser): Promise<void> {
  logger('🔒 Applying stealth mode to browser...');

  // 为新创建的页面自动应用隐身脚本
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      try {
        const page = await target.page();
        if (page) {
          await applyStealthToPage(page);
          logger('✅ Stealth applied to new page:', target.url());
        }
      } catch (error) {
        logger('❌ Failed to apply stealth to new page:', error);
      }
    }
  });

  // 为所有现有页面应用隐身脚本
  const pages = await browser.pages();
  logger(`📄 Applying stealth to ${pages.length} existing pages`);

  for (const page of pages) {
    try {
      await applyStealthToPage(page);
    } catch (error) {
      logger('❌ Failed to apply stealth to existing page:', error);
    }
  }

  logger('✅ Stealth mode activated for all pages');
}
