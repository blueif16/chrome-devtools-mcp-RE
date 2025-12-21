/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'rebrowser-puppeteer';

/**
 * 视觉鼠标助手 - 在页面上显示一个可见的光标指示器
 * 用于调试和验证 Ghost Cursor 的移动轨迹
 *
 * 灵感来自 puppeteer-real-browser 的 mouseHelper 实现
 */

const MOUSE_HELPER_SCRIPT = `
(function() {
  // 避免重复注入
  if (window.__mouseHelperInstalled) {
    return;
  }
  window.__mouseHelperInstalled = true;

  const box = document.createElement('div');
  box.id = 'mouse-helper';
  box.style.cssText = \`
    position: fixed;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
    pointer-events: none;
    z-index: 2147483647;
    transition: transform 0.05s ease-out;
    transform: translate(-50%, -50%);
    display: none;
  \`;
  document.body.appendChild(box);

  // 创建点击效果元素
  const clickEffect = document.createElement('div');
  clickEffect.id = 'mouse-helper-click';
  clickEffect.style.cssText = \`
    position: fixed;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(255, 0, 0, 0.8);
    pointer-events: none;
    z-index: 2147483646;
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    opacity: 0;
  \`;
  document.body.appendChild(clickEffect);

  // 监听鼠标移动
  document.addEventListener('mousemove', (event) => {
    box.style.display = 'block';
    box.style.left = event.pageX + 'px';
    box.style.top = event.pageY + 'px';
  }, true);

  // 监听鼠标点击
  document.addEventListener('mousedown', (event) => {
    clickEffect.style.left = event.pageX + 'px';
    clickEffect.style.top = event.pageY + 'px';
    clickEffect.style.opacity = '1';
    clickEffect.style.transform = 'translate(-50%, -50%) scale(1)';

    setTimeout(() => {
      clickEffect.style.opacity = '0';
      clickEffect.style.transform = 'translate(-50%, -50%) scale(0)';
    }, 300);
  }, true);

  // 提供全局控制函数
  window.__toggleMouseHelper = function(visible) {
    box.style.display = visible ? 'block' : 'none';
  };

  window.__removeMouseHelper = function() {
    box.remove();
    clickEffect.remove();
    window.__mouseHelperInstalled = false;
  };

  console.log('[Mouse Helper] Visual cursor debugging enabled');
})();
`;

const mouseHelperState = new WeakMap<Page, boolean>();

/**
 * 在页面上安装视觉鼠标助手
 * @param page Puppeteer Page 对象
 * @returns Promise<void>
 */
export async function installMouseHelper(page: Page): Promise<void> {
  try {
    await page.evaluateOnNewDocument(MOUSE_HELPER_SCRIPT);
    await page.evaluate(MOUSE_HELPER_SCRIPT);
    mouseHelperState.set(page, true);
  } catch (error) {
    console.error('[Mouse Helper] Failed to install:', error);
    throw new Error(`无法安装鼠标助手: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 切换鼠标助手的可见性
 * @param page Puppeteer Page 对象
 * @param visible 是否可见
 */
export async function toggleMouseHelper(
  page: Page,
  visible: boolean,
): Promise<void> {
  try {
    await page.evaluate((vis: boolean) => {
      if (typeof (window as any).__toggleMouseHelper === 'function') {
        (window as any).__toggleMouseHelper(vis);
      }
    }, visible);
    mouseHelperState.set(page, visible);
  } catch (error) {
    console.error('[Mouse Helper] Failed to toggle:', error);
  }
}

/**
 * 移除鼠标助手
 * @param page Puppeteer Page 对象
 */
export async function removeMouseHelper(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      if (typeof (window as any).__removeMouseHelper === 'function') {
        (window as any).__removeMouseHelper();
      }
    });
    mouseHelperState.delete(page);
  } catch (error) {
    console.error('[Mouse Helper] Failed to remove:', error);
  }
}

/**
 * 检查鼠标助手是否已安装
 * @param page Puppeteer Page 对象
 * @returns 是否已安装
 */
export function isMouseHelperInstalled(page: Page): boolean {
  return mouseHelperState.get(page) ?? false;
}

/**
 * 确保鼠标助手已安装（如果未安装则安装）
 * @param page Puppeteer Page 对象
 */
export async function ensureMouseHelper(page: Page): Promise<void> {
  if (!isMouseHelperInstalled(page)) {
    await installMouseHelper(page);
  }
}
