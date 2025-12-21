/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'rebrowser-puppeteer';
import {getHumanCursor} from './human-cursor.js';

export class RedditHelper {
  constructor(private page: Page) {}

  async naturalScroll(scrollCount: number = 3): Promise<void> {
    const cursor = getHumanCursor(this.page);

    for (let i = 0; i < scrollCount; i++) {
      await cursor.scroll('down', 200 + Math.random() * 300);

      if (Math.random() > 0.7) {
        await cursor.scroll('up', 100 + Math.random() * 100);
      }

      await new Promise(resolve =>
        setTimeout(resolve, 1000 + Math.random() * 2000),
      );
    }
  }

  async simulateReading(
    minSeconds: number = 3,
    maxSeconds: number = 8,
  ): Promise<void> {
    const cursor = getHumanCursor(this.page);
    const readTime =
      (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
    const movements = Math.floor(readTime / 2000);

    for (let i = 0; i < movements; i++) {
      await cursor.randomMovement();
      await new Promise(resolve =>
        setTimeout(resolve, 1500 + Math.random() * 1000),
      );
    }
  }

  async login(username: string, password: string): Promise<void> {
    const cursor = getHumanCursor(this.page);

    await this.page.goto('https://www.reddit.com/login');
    await new Promise(resolve =>
      setTimeout(resolve, 2000 + Math.random() * 2000),
    );

    await cursor.type('input[name="username"]', username);
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000),
    );

    await cursor.type('input[name="password"]', password);
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 1500),
    );

    await cursor.click('button[type="submit"]');

    await this.page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(resolve =>
      setTimeout(resolve, 2000 + Math.random() * 2000),
    );
  }

  async upvote(postSelector: string): Promise<void> {
    const cursor = getHumanCursor(this.page);

    await this.page.evaluate(selector => {
      document.querySelector(selector)?.scrollIntoView({behavior: 'smooth'});
    }, postSelector);

    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000),
    );

    const upvoteButton = `${postSelector} button[aria-label*="upvote"]`;
    await cursor.click(upvoteButton);

    await new Promise(resolve =>
      setTimeout(resolve, 1500 + Math.random() * 2000),
    );
  }
}
