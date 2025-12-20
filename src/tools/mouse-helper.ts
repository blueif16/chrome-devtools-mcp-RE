/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';
import {
  installMouseHelper,
  toggleMouseHelper,
  removeMouseHelper,
  isMouseHelperInstalled,
} from '../utils/mouse-helper.js';
import {
  installScreenPositionPatch,
  isScreenPositionPatchInstalled,
} from '../utils/screen-position-patcher.js';

import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

export const installMouseHelperTool = defineTool({
  name: 'install_mouse_helper',
  description: `在页面上安装视觉鼠标助手，显示一个红色光标指示器跟随鼠标移动。用于调试和验证 Ghost Cursor 的移动轨迹。`,
  annotations: {
    category: ToolCategory.INPUT,
    readOnlyHint: false,
  },
  schema: {},
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    if (isMouseHelperInstalled(page)) {
      response.appendResponseLine('鼠标助手已经安装');
      return;
    }

    await installMouseHelper(page);
    response.appendResponseLine(
      '✓ 鼠标助手已安装 - 页面上将显示红色光标指示器',
    );
    response.appendResponseLine(
      '提示: 使用 toggle_mouse_helper 工具可以切换显示/隐藏',
    );
  },
});

export const toggleMouseHelperTool = defineTool({
  name: 'toggle_mouse_helper',
  description: `切换鼠标助手的可见性`,
  annotations: {
    category: ToolCategory.INPUT,
    readOnlyHint: false,
  },
  schema: {
    visible: zod
      .boolean()
      .describe('是否显示鼠标助手。true=显示，false=隐藏'),
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();
    const visible = request.params.visible;

    if (!isMouseHelperInstalled(page)) {
      await installMouseHelper(page);
      response.appendResponseLine('鼠标助手已自动安装');
    }

    await toggleMouseHelper(page, visible);
    response.appendResponseLine(
      visible ? '✓ 鼠标助手已显示' : '✓ 鼠标助手已隐藏',
    );
  },
});

export const removeMouseHelperTool = defineTool({
  name: 'remove_mouse_helper',
  description: `从页面移除鼠标助手`,
  annotations: {
    category: ToolCategory.INPUT,
    readOnlyHint: false,
  },
  schema: {},
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    if (!isMouseHelperInstalled(page)) {
      response.appendResponseLine('鼠标助手未安装');
      return;
    }

    await removeMouseHelper(page);
    response.appendResponseLine('✓ 鼠标助手已移除');
  },
});

export const installScreenPositionPatchTool = defineTool({
  name: 'install_screen_position_patch',
  description: `安装屏幕位置补丁，修复 mouseEvent.screenX/screenY 坐标不匹配问题。这是一个常见的自动化检测向量，补丁会确保鼠标事件坐标与真实浏览器行为一致。`,
  annotations: {
    category: ToolCategory.INPUT,
    readOnlyHint: false,
  },
  schema: {},
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    if (isScreenPositionPatchInstalled(page)) {
      response.appendResponseLine('屏幕位置补丁已经安装');
      return;
    }

    await installScreenPositionPatch(page);
    response.appendResponseLine(
      '✓ 屏幕位置补丁已安装 - 鼠标事件坐标已修复',
    );
    response.appendResponseLine(
      '说明: 此补丁修复了自动化环境中 screenX/screenY 与 clientX/clientY 不一致的问题',
    );
  },
});

