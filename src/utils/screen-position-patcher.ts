/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'rebrowser-puppeteer-core';

/**
 * Screen Position Patcher - 修复 mouseEvent.screenX/screenY 不匹配问题
 *
 * 问题背景:
 * 在自动化环境中，鼠标事件的 screenX/screenY 和 clientX/clientY 可能不一致，
 * 这是一个常见的自动化检测向量。
 *
 * 解决方案:
 * 通过 CDP (Chrome DevTools Protocol) 注入脚本，修复这些属性的值，
 * 使其与真实浏览器行为一致。
 *
 * 参考: puppeteer-real-browser/lib/patches/screenPosition.js
 */

const SCREEN_POSITION_PATCH_SCRIPT = `
(function() {
  // 避免重复注入
  if (window.__screenPositionPatched) {
    return;
  }
  window.__screenPositionPatched = true;

  // 保存原始的 MouseEvent 构造函数
  const OriginalMouseEvent = window.MouseEvent;

  // 创建新的 MouseEvent 构造函数
  function PatchedMouseEvent(type, eventInitDict) {
    // 如果提供了 clientX/clientY 但没有 screenX/screenY，自动计算
    if (eventInitDict &&
        (eventInitDict.clientX !== undefined || eventInitDict.clientY !== undefined) &&
        (eventInitDict.screenX === undefined || eventInitDict.screenY === undefined)) {

      // 获取窗口的屏幕位置
      const screenX = window.screenX || window.screenLeft || 0;
      const screenY = window.screenY || window.screenTop || 0;

      // 计算 screen 坐标
      eventInitDict.screenX = (eventInitDict.clientX || 0) + screenX;
      eventInitDict.screenY = (eventInitDict.clientY || 0) + screenY;
    }

    return new OriginalMouseEvent(type, eventInitDict);
  }

  // 复制原型和静态属性
  PatchedMouseEvent.prototype = OriginalMouseEvent.prototype;
  Object.setPrototypeOf(PatchedMouseEvent, OriginalMouseEvent);

  // 替换全局 MouseEvent
  try {
    Object.defineProperty(window, 'MouseEvent', {
      value: PatchedMouseEvent,
      writable: true,
      configurable: true,
    });
  } catch (e) {
    console.warn('[Screen Position Patcher] Failed to patch MouseEvent:', e);
  }

  // 修复现有事件监听器中的坐标
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type.startsWith('mouse') && typeof listener === 'function') {
      const wrappedListener = function(event) {
        // 如果 screenX/screenY 看起来不正确，尝试修复
        if (event instanceof MouseEvent) {
          const screenX = window.screenX || window.screenLeft || 0;
          const screenY = window.screenY || window.screenTop || 0;

          const expectedScreenX = event.clientX + screenX;
          const expectedScreenY = event.clientY + screenY;

          // 如果差异超过阈值，说明可能有问题
          if (Math.abs(event.screenX - expectedScreenX) > 10 ||
              Math.abs(event.screenY - expectedScreenY) > 10) {

            // 创建修复后的事件对象
            Object.defineProperty(event, 'screenX', {
              value: expectedScreenX,
              writable: false,
              configurable: true,
            });
            Object.defineProperty(event, 'screenY', {
              value: expectedScreenY,
              writable: false,
              configurable: true,
            });
          }
        }

        return listener.call(this, event);
      };

      // 保存原始监听器的引用，以便后续移除
      wrappedListener.__original = listener;

      return originalAddEventListener.call(this, type, wrappedListener, options);
    }

    return originalAddEventListener.call(this, type, listener, options);
  };

  console.log('[Screen Position Patcher] Mouse event coordinates patched');
})();
`;

const screenPositionPatchState = new WeakMap<Page, boolean>();

/**
 * 安装 screen position 补丁
 * @param page Puppeteer Page 对象
 */
export async function installScreenPositionPatch(page: Page): Promise<void> {
  try {
    // 在新文档加载时自动注入
    await page.evaluateOnNewDocument(SCREEN_POSITION_PATCH_SCRIPT);
    // 在当前页面注入
    await page.evaluate(SCREEN_POSITION_PATCH_SCRIPT);
    screenPositionPatchState.set(page, true);
  } catch (error) {
    console.error('[Screen Position Patcher] Failed to install:', error);
    throw new Error(
      `无法安装屏幕位置补丁: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 检查 screen position 补丁是否已安装
 * @param page Puppeteer Page 对象
 * @returns 是否已安装
 */
export function isScreenPositionPatchInstalled(page: Page): boolean {
  return screenPositionPatchState.get(page) ?? false;
}

/**
 * 确保 screen position 补丁已安装
 * @param page Puppeteer Page 对象
 */
export async function ensureScreenPositionPatch(page: Page): Promise<void> {
  if (!isScreenPositionPatchInstalled(page)) {
    await installScreenPositionPatch(page);
  }
}
