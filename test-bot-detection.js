import puppeteer from 'rebrowser-puppeteer';
import {applyStealthToBrowser} from './build/src/stealth.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function test() {
  console.log('🚀 Starting bot detection test...');

  // 使用已下载的 Chrome
  const downloadedChromePath = path.join(
    os.homedir(),
    '.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  );

  if (!fs.existsSync(downloadedChromePath)) {
    console.error('❌ Chrome not found at:', downloadedChromePath);
    process.exit(1);
  }

  console.log('✅ Using Chrome:', downloadedChromePath);

  const browser = await puppeteer.launch({
    executablePath: downloadedChromePath,
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-skip-list',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  console.log('✅ Browser launched');

  // 应用隐身脚本
  await applyStealthToBrowser(browser);
  console.log('✅ Stealth mode applied');

  const page = await browser.newPage();
  console.log('✅ New page created');

  console.log('🌐 Navigating to bot.sannysoft.com...');
  await page.goto('https://bot.sannysoft.com', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('✅ Page loaded');

  // 等待几秒让页面完全加载
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 检测 navigator.webdriver
  const result = await page.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      webdriverExists: 'webdriver' in navigator,
      webdriverType: typeof navigator.webdriver,
      reflectHasTest: Reflect.has(navigator, 'webdriver'),
      userAgent: navigator.userAgent,
      hasChrome: !!window.chrome,
      hasPlugins: navigator.plugins.length > 0,
    };
  });

  console.log('\n📊 Detection Results:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n🎯 Test Summary:');
  console.log(`webdriver value: ${result.webdriver === undefined ? '✅ undefined' : '❌ ' + result.webdriver}`);
  console.log(`webdriver exists: ${result.webdriverExists ? '❌ true' : '✅ false'}`);
  console.log(`Reflect.has test: ${result.reflectHasTest ? '❌ true' : '✅ false'}`);
  console.log(`Has chrome object: ${result.hasChrome ? '✅ true' : '❌ false'}`);
  console.log(`Has plugins: ${result.hasPlugins ? '✅ true' : '❌ false'}`);

  // 截图
  await page.screenshot({path: 'bot-detection-test.png', fullPage: true});
  console.log('\n📸 Screenshot saved to bot-detection-test.png');

  console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
  console.log('\n✅ Test completed');
}

test().catch(console.error);
