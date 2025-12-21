#!/usr/bin/env node --experimental-strip-types --no-warnings=ExperimentalWarning
/**
 * 测试脚本：验证 navigator.webdriver 是否被成功移除
 *
 * 使用方法：
 * npm run build && node --experimental-strip-types scripts/test-webdriver-fix.ts
 */

import {launch} from '../build/src/browser.js';

async function testWebdriverFix() {
  console.log('🧪 开始测试 navigator.webdriver 修复...\n');

  const browser = await launch({
    headless: false,
    isolated: true,
    devtools: false,
    channel: 'stable',
  });

  try {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // 先导航到一个空白页，确保隐身脚本生效
    await page.goto('about:blank');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 1: 检查 navigator.webdriver
    console.log('📋 测试 1: 检查 navigator.webdriver 属性');
    const webdriverValue = await page.evaluate(() => {
      return {
        value: navigator.webdriver,
        exists: 'webdriver' in navigator,
        type: typeof navigator.webdriver,
      };
    });
    console.log('  结果:', JSON.stringify(webdriverValue, null, 2));

    if (webdriverValue.value === undefined) {
      console.log('  ✅ PASS: navigator.webdriver 为 undefined\n');
    } else {
      console.log('  ❌ FAIL: navigator.webdriver 应该为 undefined\n');
    }

    // 测试 2: 检查 Chrome 对象
    console.log('📋 测试 2: 检查 window.chrome 对象');
    const chromeExists = await page.evaluate(() => {
      return {
        exists: typeof window.chrome !== 'undefined',
        hasRuntime: window.chrome && typeof window.chrome.runtime !== 'undefined',
      };
    });
    console.log('  结果:', JSON.stringify(chromeExists, null, 2));

    if (chromeExists.exists) {
      console.log('  ✅ PASS: window.chrome 对象存在\n');
    } else {
      console.log('  ❌ FAIL: window.chrome 对象应该存在\n');
    }

    // 测试 3: 检查插件
    console.log('📋 测试 3: 检查 navigator.plugins');
    const pluginsCount = await page.evaluate(() => {
      return navigator.plugins.length;
    });
    console.log('  插件数量:', pluginsCount);

    if (pluginsCount > 0) {
      console.log('  ✅ PASS: 插件列表不为空\n');
    } else {
      console.log('  ❌ FAIL: 插件列表应该不为空\n');
    }

    // 测试 4: 访问真实网站测试
    console.log('📋 测试 4: 访问 bot 检测网站');
    console.log('  正在访问 https://bot.sannysoft.com/ ...');

    await page.goto('https://bot.sannysoft.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查 webdriver 检测结果
    const detectionResult = await page.evaluate(() => {
      const webdriverRow = Array.from(document.querySelectorAll('tr')).find(
        row => row.textContent?.includes('navigator.webdriver')
      );

      if (webdriverRow) {
        const cells = webdriverRow.querySelectorAll('td');
        return {
          found: true,
          value: cells[1]?.textContent?.trim(),
          status: cells[1]?.className || '',
        };
      }

      return { found: false };
    });

    console.log('  检测结果:', JSON.stringify(detectionResult, null, 2));

    if (detectionResult.found && detectionResult.value === 'undefined') {
      console.log('  ✅ PASS: 网站检测到 navigator.webdriver 为 undefined\n');
    } else {
      console.log('  ⚠️  WARNING: 无法确认网站检测结果\n');
    }

    console.log('🎉 测试完成！浏览器将保持打开 10 秒供你检查...');
    console.log('💡 提示：你可以在浏览器控制台手动输入 navigator.webdriver 查看');

    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 浏览器已关闭');
  }
}

testWebdriverFix().catch(console.error);
