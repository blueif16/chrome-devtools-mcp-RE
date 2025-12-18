/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'rebrowser-puppeteer-core';
import {createCursor, type GhostCursor} from 'ghost-cursor';

interface HumanCursorOptions {
  minDelay?: number;
  maxDelay?: number;
  preMovement?: boolean;
}

export class HumanCursor {
  private cursor: GhostCursor;
  private page: Page;
  private options: HumanCursorOptions;

  constructor(page: Page, options: HumanCursorOptions = {}) {
    this.page = page;
    this.cursor = createCursor(page as any);
    this.options = {
      minDelay: options.minDelay || 300,
      maxDelay: options.maxDelay || 1500,
      preMovement: options.preMovement !== false,
    };
  }

  private async randomDelay(min?: number, max?: number): Promise<void> {
    const minMs = min || this.options.minDelay!;
    const maxMs = max || this.options.maxDelay!;
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async doPreMovement(): Promise<void> {
    if (!this.options.preMovement) return;

    const viewport = this.page.viewport();
    if (!viewport) return;

    await this.cursor.move([
      Math.random() * viewport.width * 0.3,
      Math.random() * viewport.height * 0.3,
    ]);
  }

  async click(selector: string): Promise<void> {
    await this.doPreMovement();
    await this.randomDelay();
    await this.cursor.click(selector);
    await this.randomDelay(100, 500);
  }

  async move(selector: string): Promise<void> {
    await this.doPreMovement();
    await this.randomDelay(200, 800);
    const element = await this.page.$(selector);
    if (element) {
      await this.cursor.move(element as any);
    }
  }

  async type(selector: string, text: string): Promise<void> {
    await this.click(selector);
    await this.randomDelay(300, 700);

    for (const char of text) {
      await this.page.keyboard.type(char);
      await new Promise(resolve =>
        setTimeout(resolve, Math.random() * 150 + 50),
      );
    }

    await this.randomDelay(200, 500);
  }

  async randomMovement(): Promise<void> {
    const viewport = this.page.viewport();
    if (!viewport) return;

    await this.cursor.move([
      Math.random() * viewport.width,
      Math.random() * viewport.height,
    ]);
  }

  async scroll(
    direction: 'up' | 'down',
    amount: number = 300,
  ): Promise<void> {
    await this.randomDelay();
    const delta = direction === 'down' ? amount : -amount;

    const chunks = 3 + Math.floor(Math.random() * 3);
    const chunkSize = delta / chunks;

    for (let i = 0; i < chunks; i++) {
      await this.page.mouse.wheel({deltaY: chunkSize});
      await new Promise(resolve =>
        setTimeout(resolve, 50 + Math.random() * 100),
      );
    }

    await this.randomDelay(500, 1500);
  }
}

const cursorInstances = new WeakMap<Page, HumanCursor>();

export function getHumanCursor(
  page: Page,
  options?: HumanCursorOptions,
): HumanCursor {
  if (!cursorInstances.has(page)) {
    cursorInstances.set(page, new HumanCursor(page, options));
  }
  return cursorInstances.get(page)!;
}
