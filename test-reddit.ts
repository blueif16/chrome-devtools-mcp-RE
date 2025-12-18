/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {launch} from './build/src/browser.js';
import {RedditHelper} from './build/src/utils/reddit-helpers.js';
import {getHumanCursor} from './build/src/utils/human-cursor.js';
import {config} from './build/src/config/launch-config.js';

async function testReddit() {
  console.log('🚀 Starting Reddit stealth test...');

  const browser = await launch({
    headless: config.headless,
    isolated: true,
    devtools: false,
  });

  const page = await browser.newPage();
  const reddit = new RedditHelper(page);
  const cursor = getHumanCursor(page, config.humanBehavior);

  try {
    console.log('📍 Navigating to Reddit...');
    await page.goto('https://www.reddit.com');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📜 Simulating natural scrolling...');
    await reddit.naturalScroll(3);

    console.log('🖱️  Random mouse movements...');
    await cursor.randomMovement();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await cursor.randomMovement();

    console.log('🔍 Checking bot detection...');
    const pageContent = await page.content();

    if (pageContent.includes('blocked') || pageContent.includes('captcha')) {
      console.error('❌ DETECTED! Bot detection triggered.');
    } else {
      console.log('✅ SUCCESS! No detection.');
    }

    console.log('📖 Simulating reading behavior...');
    await reddit.simulateReading(5, 10);

    console.log('✨ Test completed! Check the browser window.');

    await new Promise(resolve => setTimeout(resolve, 30000));
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testReddit();
