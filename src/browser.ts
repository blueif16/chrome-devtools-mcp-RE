/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {logger} from './logger.js';
import {applyStealthToBrowser} from './stealth.js';
import type {
  Browser,
  ChromeReleaseChannel,
  LaunchOptions,
  Target,
} from './third_party/index.js';
import {puppeteer} from './third_party/index.js';

let browser: Browser | undefined;

function makeTargetFilter() {
  const ignoredPrefixes = new Set([
    'chrome://',
    'chrome-extension://',
    'chrome-untrusted://',
  ]);

  return function targetFilter(target: Target): boolean {
    if (target.url() === 'chrome://newtab/') {
      return true;
    }
    // Could be the only page opened in the browser.
    if (target.url().startsWith('chrome://inspect')) {
      return true;
    }
    for (const prefix of ignoredPrefixes) {
      if (target.url().startsWith(prefix)) {
        return false;
      }
    }
    return true;
  };
}

export async function ensureBrowserConnected(options: {
  browserURL?: string;
  wsEndpoint?: string;
  wsHeaders?: Record<string, string>;
  devtools: boolean;
}) {
  if (browser?.connected) {
    return browser;
  }

  // ⚠️ 警告：连接到外部 Chrome 会导致 rebrowser Binary Patches 失效
  // navigator.webdriver 属性将无法被移除，Level 1 检测会失败
  // 建议：使用 launch 模式让 rebrowser-puppeteer 自己启动 Chrome
  logger('⚠️  WARNING: Connecting to external Chrome. rebrowser Binary Patches will NOT work!');
  logger('⚠️  navigator.webdriver will still be present. Consider using launch mode instead.');

  const connectOptions: Parameters<typeof puppeteer.connect>[0] = {
    targetFilter: makeTargetFilter(),
    defaultViewport: null,
    // @ts-expect-error rebrowser-puppeteer may not have this option
    handleDevToolsAsPage: true,
  };

  if (options.wsEndpoint) {
    connectOptions.browserWSEndpoint = options.wsEndpoint;
    if (options.wsHeaders) {
      connectOptions.headers = options.wsHeaders;
    }
  } else if (options.browserURL) {
    connectOptions.browserURL = options.browserURL;
  } else {
    throw new Error('Either browserURL or wsEndpoint must be provided');
  }

  logger('Connecting Puppeteer to ', JSON.stringify(connectOptions));
  browser = await puppeteer.connect(connectOptions);
  logger('Connected Puppeteer');

  // 为连接的浏览器应用隐身脚本（但这只是 JavaScript 层面的修复，无法完全移除 webdriver）
  await applyStealthToBrowser(browser);

  return browser;
}

interface McpLaunchOptions {
  acceptInsecureCerts?: boolean;
  executablePath?: string;
  channel?: Channel;
  userDataDir?: string;
  headless: boolean;
  isolated: boolean;
  logFile?: fs.WriteStream;
  viewport?: {
    width: number;
    height: number;
  };
  args?: string[];
  devtools: boolean;
}

export async function launch(options: McpLaunchOptions): Promise<Browser> {
  const {channel, headless, isolated} = options;
  let {executablePath} = options;
  const profileDirName =
    channel && channel !== 'stable'
      ? `chrome-profile-${channel}`
      : 'chrome-profile';

  let userDataDir = options.userDataDir;
  if (!isolated && !userDataDir) {
    userDataDir = path.join(
      os.homedir(),
      '.cache',
      'chrome-devtools-mcp',
      profileDirName,
    );
    await fs.promises.mkdir(userDataDir, {
      recursive: true,
    });
  }

  const args: LaunchOptions['args'] = [
    ...(options.args ?? []),
    '--hide-crash-restore-bubble',
  ];
  if (headless) {
    args.push('--screen-info={3840x2160}');
  }
  let puppeteerChannel: ChromeReleaseChannel | undefined;
  if (options.devtools) {
    args.push('--auto-open-devtools-for-tabs');
  }
  if (!executablePath) {
    // 尝试使用已下载的 Chrome
    const downloadedChromePath = path.join(
      os.homedir(),
      '.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    );

    if (fs.existsSync(downloadedChromePath)) {
      executablePath = downloadedChromePath;
      logger('Using downloaded Chrome:', executablePath);
    } else if (channel) {
      // 只有在用户明确指定 channel 时才使用系统 Chrome
      puppeteerChannel =
        channel !== 'stable'
          ? (`chrome-${channel}` as ChromeReleaseChannel)
          : 'chrome';
    }
    // 如果都没有，puppeteer 会报错，提示用户需要指定 executablePath 或 channel
  }

  // 移除 Runtime Patches 环境变量，让 rebrowser-puppeteer 使用 Binary Patches
  // Binary Patches 会下载预编译的修改版 Chrome，从源头移除 navigator.webdriver
  // 参考: docs/self_improve/fail_records/prd_webdriver_detection_20251220.md
  // process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';

  const stealthArgs = [
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
  ];

  try {
    const browser = await puppeteer.launch({
      channel: puppeteerChannel,
      targetFilter: makeTargetFilter(),
      executablePath,
      defaultViewport: null,
      userDataDir,
      pipe: true,
      headless,
      args: [...args, ...stealthArgs],
      acceptInsecureCerts: options.acceptInsecureCerts,
      // @ts-expect-error rebrowser-puppeteer may not have this option
      handleDevToolsAsPage: true,
      ignoreDefaultArgs: ['--enable-automation'],
    });
    if (options.logFile) {
      // FIXME: we are probably subscribing too late to catch startup logs. We
      // should expose the process earlier or expose the getRecentLogs() getter.
      browser.process()?.stderr?.pipe(options.logFile);
      browser.process()?.stdout?.pipe(options.logFile);
    }
    if (options.viewport) {
      const [page] = await browser.pages();
      // @ts-expect-error internal API for now.
      await page?.resize({
        contentWidth: options.viewport.width,
        contentHeight: options.viewport.height,
      });
    }

    // 为启动的浏览器应用隐身脚本（关键步骤）
    await applyStealthToBrowser(browser);

    return browser;
  } catch (error) {
    if (
      userDataDir &&
      (error as Error).message.includes('The browser is already running')
    ) {
      throw new Error(
        `The browser is already running for ${userDataDir}. Use --isolated to run multiple browser instances.`,
        {
          cause: error,
        },
      );
    }
    throw error;
  }
}

export async function ensureBrowserLaunched(
  options: McpLaunchOptions,
): Promise<Browser> {
  if (browser?.connected) {
    return browser;
  }
  browser = await launch(options);
  return browser;
}

export type Channel = 'stable' | 'canary' | 'beta' | 'dev';
