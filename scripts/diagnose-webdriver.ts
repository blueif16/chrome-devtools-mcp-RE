/**
 * 诊断脚本：检查 navigator.webdriver 的真实状态
 * 用于验证 rebrowser-puppeteer 是否正确工作
 */

import puppeteer from 'rebrowser-puppeteer';

async function diagnoseWebdriver() {
  console.log('🔍 开始诊断 webdriver 状态...\n');

  // 移除 Runtime Patches 环境变量，让 rebrowser-puppeteer 使用 Binary Patches
  // process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';

  const browser = await puppeteer.launch({
    headless: false,
    // 移除 channel 参数，让 rebrowser-puppeteer 下载并使用补丁版 Chrome
    // channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-dev-shm-usage',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();

  // 检查 webdriver 属性的各个方面
  const diagnostics = await page.evaluate(() => {
    const nav = window.navigator;
    const proto = Object.getPrototypeOf(nav);

    return {
      // 基础检查
      webdriverValue: nav.webdriver,
      webdriverType: typeof nav.webdriver,

      // 属性存在性检查
      inNavigator: 'webdriver' in nav,
      inPrototype: 'webdriver' in proto,
      hasOwnProperty: nav.hasOwnProperty('webdriver'),

      // 属性描述符检查
      navigatorDescriptor: Object.getOwnPropertyDescriptor(nav, 'webdriver'),
      prototypeDescriptor: Object.getOwnPropertyDescriptor(proto, 'webdriver'),

      // 原型链检查
      prototypeChain: (() => {
        const chain: string[] = [];
        let obj = nav;
        while (obj && chain.length < 5) {
          const desc = Object.getOwnPropertyDescriptor(obj, 'webdriver');
          if (desc) {
            chain.push(
              `Found at ${obj.constructor.name}: ${desc.get?.toString().substring(0, 50) || desc.value}`,
            );
          }
          obj = Object.getPrototypeOf(obj);
        }
        return chain;
      })(),

      // rebrowser 标记检查
      rebrowserVersion:
        (window as any).__rebrowser_patch_version || 'not found',

      // Chrome 对象检查
      hasChromeRuntime:
        typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',

      // 其他自动化特征
      automationFeatures: {
        plugins: navigator.plugins.length,
        languages: navigator.languages.length,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        platform: navigator.platform,
        userAgent: navigator.userAgent.substring(0, 100),
      },
    };
  });

  console.log('📊 诊断结果：\n');
  console.log('=== 基础检查 ===');
  console.log(`webdriver 值: ${diagnostics.webdriverValue}`);
  console.log(`webdriver 类型: ${diagnostics.webdriverType}`);
  console.log();

  console.log('=== 属性存在性 ===');
  console.log(
    `在 navigator 中: ${diagnostics.inNavigator ? '❌ 是' : '✅ 否'}`,
  );
  console.log(
    `在原型链中: ${diagnostics.inPrototype ? '❌ 是' : '✅ 否'}`,
  );
  console.log(
    `hasOwnProperty: ${diagnostics.hasOwnProperty ? '❌ 是' : '✅ 否'}`,
  );
  console.log();

  console.log('=== 属性描述符 ===');
  console.log(
    `navigator 描述符: ${diagnostics.navigatorDescriptor ? JSON.stringify(diagnostics.navigatorDescriptor) : '✅ undefined'}`,
  );
  console.log(
    `prototype 描述符: ${diagnostics.prototypeDescriptor ? '❌ ' + JSON.stringify(diagnostics.prototypeDescriptor) : '✅ undefined'}`,
  );
  console.log();

  console.log('=== 原型链追踪 ===');
  if (diagnostics.prototypeChain.length > 0) {
    console.log('❌ 在原型链中找到 webdriver:');
    diagnostics.prototypeChain.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item}`);
    });
  } else {
    console.log('✅ 原型链中未找到 webdriver');
  }
  console.log();

  console.log('=== rebrowser 状态 ===');
  console.log(
    `rebrowser 版本: ${diagnostics.rebrowserVersion === 'not found' ? '❌ 未检测到' : '✅ ' + diagnostics.rebrowserVersion}`,
  );
  console.log(
    `Chrome runtime: ${diagnostics.hasChromeRuntime ? '✅ 存在' : '❌ 不存在'}`,
  );
  console.log();

  console.log('=== 其他自动化特征 ===');
  console.log(`插件数量: ${diagnostics.automationFeatures.plugins}`);
  console.log(`语言数量: ${diagnostics.automationFeatures.languages}`);
  console.log(
    `硬件并发: ${diagnostics.automationFeatures.hardwareConcurrency}`,
  );
  console.log(`设备内存: ${diagnostics.automationFeatures.deviceMemory || 'N/A'}`);
  console.log(`平台: ${diagnostics.automationFeatures.platform}`);
  console.log(`User-Agent: ${diagnostics.automationFeatures.userAgent}...`);
  console.log();

  console.log('=== 结论 ===');
  const isPerfect =
    !diagnostics.inNavigator &&
    !diagnostics.inPrototype &&
    diagnostics.prototypeChain.length === 0;

  if (isPerfect) {
    console.log('✅ 完美！webdriver 已完全移除，应该能通过 Level 2 检测');
  } else {
    console.log(
      '❌ 检测到问题：webdriver 仍存在于原型链中，Level 2 检测可能失败',
    );
    console.log('\n建议：');
    console.log('1. 确认使用的是 rebrowser-puppeteer 而不是普通 puppeteer');
    console.log('2. 检查是否需要切换到 Binary Patches 模式');
    console.log('3. 移除自定义的 evaluateOnNewDocument 脚本，避免干扰');
  }

  await browser.close();
}

diagnoseWebdriver().catch(console.error);
