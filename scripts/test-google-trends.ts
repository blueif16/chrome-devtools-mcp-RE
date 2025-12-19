/**
 * 测试脚本：使用ghost cursor访问Google趋势
 * 用于验证人类化光标移动功能
 */

import {launch} from '../src/browser.js';
import {McpContext} from '../src/McpContext.js';
import {getHumanCursor} from '../src/utils/human-cursor.js';

async function testGoogleTrends() {
  console.log('启动浏览器（带UI模式）...');

  const browser = await launch({
    headless: false,
    isolated: true,
    devtools: false,
  });

  try {
    console.log('创建MCP上下文...');
    const context = await McpContext.from(browser, console.log);
    const page = context.getSelectedPage();

    console.log('访问Google首页...');
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle2',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('初始化Ghost Cursor...');
    const cursor = getHumanCursor(page, {
      minDelay: 500,
      maxDelay: 1500,
      preMovement: true,
    });

    console.log('执行随机移动（预热）...');
    await cursor.randomMovement();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('在搜索框中输入"今日热搜"...');
    const searchBox = await page.$('textarea[name="q"]') || await page.$('input[name="q"]');

    if (searchBox) {
      const selector = 'textarea[name="q"], input[name="q"]';
      await cursor.click(selector);
      await cursor.type(selector, '今日热搜');

      console.log('等待搜索建议...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('按下回车键...');
      await page.keyboard.press('Enter');

      console.log('等待搜索结果加载...');
      await page.waitForNavigation({waitUntil: 'networkidle2'});

      console.log('滚动页面查看结果...');
      await cursor.scroll('down', 500);
      await new Promise(resolve => setTimeout(resolve, 2000));

      await cursor.scroll('down', 500);
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✓ 测试完成！浏览器将保持打开状态30秒供查看...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      console.error('未找到搜索框');
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    console.log('关闭浏览器...');
    await browser.close();
  }
}

testGoogleTrends().catch(console.error);
