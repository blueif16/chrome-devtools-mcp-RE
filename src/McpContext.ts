/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {type AggregatedIssue} from '../node_modules/chrome-devtools-frontend/mcp/mcp.js';

import {extractUrlLikeFromDevToolsTitle, urlsEqual} from './DevtoolsUtils.js';
import type {ListenerMap} from './PageCollector.js';
import {NetworkCollector, ConsoleCollector} from './PageCollector.js';
import {Locator} from './third_party/index.js';
import type {
  Browser,
  ConsoleMessage,
  Debugger,
  Dialog,
  ElementHandle,
  HTTPRequest,
  Page,
  SerializedAXNode,
  PredefinedNetworkConditions,
} from './third_party/index.js';
import {listPages} from './tools/pages.js';
import {takeSnapshot} from './tools/snapshot.js';
import {CLOSE_PAGE_ERROR} from './tools/ToolDefinition.js';
import type {Context, DevToolsData} from './tools/ToolDefinition.js';
import type {TraceResult} from './trace-processing/parse.js';
import {WaitForHelper} from './WaitForHelper.js';

export interface TextSnapshotNode extends SerializedAXNode {
  id: string;
  backendNodeId?: number;
  children: TextSnapshotNode[];
}

export interface GeolocationOptions {
  latitude: number;
  longitude: number;
}

export interface TextSnapshot {
  root: TextSnapshotNode;
  idToNode: Map<string, TextSnapshotNode>;
  snapshotId: string;
  selectedElementUid?: string;
  // It might happen that there is a selected element, but it is not part of the
  // snapshot. This flag indicates if there is any selected element.
  hasSelectedElement: boolean;
  verbose: boolean;
}

interface McpContextOptions {
  // Whether the DevTools windows are exposed as pages for debugging of DevTools.
  experimentalDevToolsDebugging: boolean;
  // Whether all page-like targets are exposed as pages.
  experimentalIncludeAllPages?: boolean;
  // Whether to auto-install mouse helper in isolated mode
  autoInstallMouseHelper?: boolean;
  // Whether to auto-install screen position patch
  autoInstallScreenPositionPatch?: boolean;
}

const DEFAULT_TIMEOUT = 5_000;
const NAVIGATION_TIMEOUT = 10_000;

function getNetworkMultiplierFromString(condition: string | null): number {
  const puppeteerCondition =
    condition as keyof typeof PredefinedNetworkConditions;

  switch (puppeteerCondition) {
    case 'Fast 4G':
      return 1;
    case 'Slow 4G':
      return 2.5;
    case 'Fast 3G':
      return 5;
    case 'Slow 3G':
      return 10;
  }
  return 1;
}

function getExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpeg';
    case 'image/webp':
      return 'webp';
  }
  throw new Error(`No mapping for Mime type ${mimeType}.`);
}

export class McpContext implements Context {
  browser: Browser;
  logger: Debugger;

  // The most recent page state.
  #pages: Page[] = [];
  #pageToDevToolsPage = new Map<Page, Page>();
  #selectedPage?: Page;
  // The most recent snapshot.
  #textSnapshot: TextSnapshot | null = null;
  #networkCollector: NetworkCollector;
  #consoleCollector: ConsoleCollector;

  #isRunningTrace = false;
  #networkConditionsMap = new WeakMap<Page, string>();
  #cpuThrottlingRateMap = new WeakMap<Page, number>();
  #geolocationMap = new WeakMap<Page, GeolocationOptions>();
  #dialog?: Dialog;

  #nextSnapshotId = 1;
  #traceResults: TraceResult[] = [];

  #locatorClass: typeof Locator;
  #options: McpContextOptions;

  private constructor(
    browser: Browser,
    logger: Debugger,
    options: McpContextOptions,
    locatorClass: typeof Locator,
  ) {
    this.browser = browser;
    this.logger = logger;
    this.#locatorClass = locatorClass;
    this.#options = options;

    this.#networkCollector = new NetworkCollector(this.browser);

    this.#consoleCollector = new ConsoleCollector(this.browser, collect => {
      return {
        console: event => {
          collect(event);
        },
        pageerror: event => {
          if (event instanceof Error) {
            collect(event);
          } else {
            const error = new Error(`${event}`);
            error.stack = undefined;
            collect(error);
          }
        },
        issue: event => {
          collect(event);
        },
      } as ListenerMap;
    });
  }

  async #init() {
    const pages = await this.createPagesSnapshot();
    await this.#networkCollector.init(pages);
    await this.#consoleCollector.init(pages);
    // 注释掉自定义反检测脚本，依赖 rebrowser-puppeteer 的原生补丁
    // 参考: docs/self_improve/fail_records/prd_webdriver_detection_20251220.md
    // for (const page of pages) {
    //   await this.#injectAntiDetectionScript(page);
    // }

    // 添加 Rebrowser CDP 命令监控（仅在 Rebrowser Cloud 环境下有效）
    // 参考：https://rebrowser.net/blog/how-to-fix-runtime-enable-cdp-detection
    await this.#setupRebrowserMonitoring(pages);
  }

  /**
   * 设置 Rebrowser 监控，检测敏感 CDP 命令和泄漏
   * 仅在 Rebrowser Cloud 环境下有效
   */
  async #setupRebrowserMonitoring(pages: Page[]): Promise<void> {
    for (const page of pages) {
      try {
        // @ts-expect-error _client() is internal API
        const client = page._client();
        if (!client || typeof client.on !== 'function') {
          continue;
        }

        // 监听 Rebrowser 警告（敏感 CDP 命令）
        client.on('Rebrowser.warning', (params: any) => {
          this.logger('🚨 REBROWSER WARNING:', JSON.stringify(params, null, 2));
          this.logger('⚠️  This CDP command may increase detection risk!');
        });

        // 监听 Runtime.consoleAPICalled 泄漏检测
        // 如果没有显式调用 console.log 却收到此事件，说明有 CDP 泄漏
        client.on('Runtime.consoleAPICalled', (message: any) => {
          this.logger('⚠️  CDP LEAK DETECTED: Runtime.consoleAPICalled event received');
          this.logger('   This may indicate Runtime.enable detection vulnerability');
        });

        this.logger('✅ Rebrowser monitoring enabled for page:', page.url());
      } catch (error) {
        // 如果不是 Rebrowser Cloud 环境，这些事件不存在，这是正常的
        this.logger('Rebrowser monitoring not available (not using Rebrowser Cloud)');
      }
    }
  }

  async #injectAntiDetectionScript(page: Page) {
    await page.evaluateOnNewDocument(() => {
      // 方法 1: 使用 Proxy 完全隐藏 webdriver 属性
      const originalNavigator = window.navigator;
      const navigatorProxy = new Proxy(originalNavigator, {
        get: (target, prop) => {
          if (prop === 'webdriver') {
            return undefined;
          }
          return target[prop as keyof Navigator];
        },
        has: (target, prop) => {
          if (prop === 'webdriver') {
            return false;
          }
          return prop in target;
        },
      });

      // 替换 window.navigator
      try {
        Object.defineProperty(window, 'navigator', {
          get: () => navigatorProxy,
          configurable: true,
        });
      } catch (e) {
        // 如果无法替换，尝试删除原型链上的属性
        try {
          delete Object.getPrototypeOf(navigator).webdriver;
        } catch (e2) {
          // 忽略错误
        }
      }

      // 确保 window.chrome 对象存在
      if (typeof window.chrome === 'undefined') {
        Object.defineProperty(window, 'chrome', {
          value: {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {},
          },
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      // 确保 navigator.plugins 有内容
      if (!navigator.plugins || navigator.plugins.length === 0) {
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format'},
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
              name: 'Chrome PDF Plugin',
            },
            {
              0: {type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format'},
              description: 'Portable Document Format',
              filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
              length: 1,
              name: 'Chrome PDF Viewer',
            },
            {
              0: {type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable'},
              description: 'Native Client Executable',
              filename: 'internal-nacl-plugin',
              length: 2,
              name: 'Native Client',
            },
          ],
        });
      }

      // 确保 navigator.permissions 存在
      if (typeof navigator.permissions === 'undefined') {
        Object.defineProperty(navigator, 'permissions', {
          value: {
            query: () => Promise.resolve({ state: 'granted' }),
          },
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    });
  }

  dispose() {
    this.#networkCollector.dispose();
    this.#consoleCollector.dispose();
  }

  /**
   * 在关闭浏览器前调用此方法（仅用于 Rebrowser Cloud）
   * 本地运行时不需要调用
   * 参考：https://rebrowser.net/blog/how-to-fix-runtime-enable-cdp-detection
   */
  async finishRebrowserRun(): Promise<void> {
    try {
      const pages = await this.browser.pages();
      if (pages.length > 0) {
        const page = pages[0];
        // @ts-expect-error _client() is internal API
        const client = page._client();
        if (client && typeof client.send === 'function') {
          await client.send('Rebrowser.finishRun');
          this.logger('✅ Rebrowser.finishRun called successfully');
        }
      }
    } catch (error) {
      // 如果不是 Rebrowser Cloud 环境，这个命令会失败，这是正常的
      this.logger('Rebrowser.finishRun not available (not using Rebrowser Cloud)');
    }
  }

  static async from(
    browser: Browser,
    logger: Debugger,
    opts: McpContextOptions,
    /* Let tests use unbundled Locator class to avoid overly strict checks within puppeteer that fail when mixing bundled and unbundled class instances */
    locatorClass: typeof Locator = Locator,
  ) {
    const context = new McpContext(browser, logger, opts, locatorClass);
    await context.#init();
    return context;
  }

  resolveCdpRequestId(cdpRequestId: string): number | undefined {
    const selectedPage = this.getSelectedPage();
    if (!cdpRequestId) {
      this.logger('no network request');
      return;
    }
    const request = this.#networkCollector.find(selectedPage, request => {
      // @ts-expect-error id is internal.
      return request.id === cdpRequestId;
    });
    if (!request) {
      this.logger('no network request for ' + cdpRequestId);
      return;
    }
    return this.#networkCollector.getIdForResource(request);
  }

  resolveCdpElementId(cdpBackendNodeId: number): string | undefined {
    if (!cdpBackendNodeId) {
      this.logger('no cdpBackendNodeId');
      return;
    }
    if (this.#textSnapshot === null) {
      this.logger('no text snapshot');
      return;
    }
    // TODO: index by backendNodeId instead.
    const queue = [this.#textSnapshot.root];
    while (queue.length) {
      const current = queue.pop()!;
      if (current.backendNodeId === cdpBackendNodeId) {
        return current.id;
      }
      for (const child of current.children) {
        queue.push(child);
      }
    }
    return;
  }

  getNetworkRequests(includePreservedRequests?: boolean): HTTPRequest[] {
    const page = this.getSelectedPage();
    return this.#networkCollector.getData(page, includePreservedRequests);
  }

  getConsoleData(
    includePreservedMessages?: boolean,
  ): Array<ConsoleMessage | Error | AggregatedIssue> {
    const page = this.getSelectedPage();
    return this.#consoleCollector.getData(page, includePreservedMessages);
  }

  getConsoleMessageStableId(
    message: ConsoleMessage | Error | AggregatedIssue,
  ): number {
    return this.#consoleCollector.getIdForResource(message);
  }

  getConsoleMessageById(id: number): ConsoleMessage | Error | AggregatedIssue {
    return this.#consoleCollector.getById(this.getSelectedPage(), id);
  }

  async newPage(): Promise<Page> {
    // Rebrowser 最佳实践：优先复用已存在的页面而不是创建新页面
    // 复用页面可以节省 500-700ms（newPage: 700-900ms vs 复用: 200-250ms）
    // 参考：https://rebrowser.net/blog/how-to-fix-runtime-enable-cdp-detection
    const existingPages = await this.browser.pages();
    const blankPage = existingPages.find(p =>
      p.url() === 'about:blank' || p.url() === 'chrome://newtab/'
    );

    let page: Page;
    if (blankPage) {
      this.logger('Reusing existing blank page for better performance');
      page = blankPage;
    } else {
      this.logger('Creating new page (no blank page available)');
      page = await this.browser.newPage();
      // 为新创建的页面添加 Rebrowser 监控
      await this.#setupRebrowserMonitoring([page]);
    }

    // 注释掉自定义反检测脚本，依赖 rebrowser-puppeteer 的原生补丁
    // await this.#injectAntiDetectionScript(page);
    await this.createPagesSnapshot();
    this.selectPage(page);
    this.#networkCollector.addPage(page);
    this.#consoleCollector.addPage(page);
    return page;
  }
  async closePage(pageIdx: number): Promise<void> {
    if (this.#pages.length === 1) {
      throw new Error(CLOSE_PAGE_ERROR);
    }
    const page = this.getPageByIdx(pageIdx);
    await page.close({runBeforeUnload: false});
  }

  getNetworkRequestById(reqid: number): HTTPRequest {
    return this.#networkCollector.getById(this.getSelectedPage(), reqid);
  }

  setNetworkConditions(conditions: string | null): void {
    const page = this.getSelectedPage();
    if (conditions === null) {
      this.#networkConditionsMap.delete(page);
    } else {
      this.#networkConditionsMap.set(page, conditions);
    }
    this.#updateSelectedPageTimeouts();
  }

  getNetworkConditions(): string | null {
    const page = this.getSelectedPage();
    return this.#networkConditionsMap.get(page) ?? null;
  }

  setCpuThrottlingRate(rate: number): void {
    const page = this.getSelectedPage();
    this.#cpuThrottlingRateMap.set(page, rate);
    this.#updateSelectedPageTimeouts();
  }

  getCpuThrottlingRate(): number {
    const page = this.getSelectedPage();
    return this.#cpuThrottlingRateMap.get(page) ?? 1;
  }

  setGeolocation(geolocation: GeolocationOptions | null): void {
    const page = this.getSelectedPage();
    if (geolocation === null) {
      this.#geolocationMap.delete(page);
    } else {
      this.#geolocationMap.set(page, geolocation);
    }
  }

  getGeolocation(): GeolocationOptions | null {
    const page = this.getSelectedPage();
    return this.#geolocationMap.get(page) ?? null;
  }

  shouldAutoInstallMouseHelper(): boolean {
    return this.#options.autoInstallMouseHelper ?? false;
  }

  shouldAutoInstallScreenPositionPatch(): boolean {
    return this.#options.autoInstallScreenPositionPatch ?? false;
  }

  setIsRunningPerformanceTrace(x: boolean): void {
    this.#isRunningTrace = x;
  }

  isRunningPerformanceTrace(): boolean {
    return this.#isRunningTrace;
  }

  getDialog(): Dialog | undefined {
    return this.#dialog;
  }

  clearDialog(): void {
    this.#dialog = undefined;
  }

  getSelectedPage(): Page {
    const page = this.#selectedPage;
    if (!page) {
      throw new Error('No page selected');
    }
    if (page.isClosed()) {
      throw new Error(
        `The selected page has been closed. Call ${listPages.name} to see open pages.`,
      );
    }
    return page;
  }

  getPageByIdx(idx: number): Page {
    const pages = this.#pages;
    const page = pages[idx];
    if (!page) {
      throw new Error('No page found');
    }
    return page;
  }

  #dialogHandler = (dialog: Dialog): void => {
    this.#dialog = dialog;
  };

  isPageSelected(page: Page): boolean {
    return this.#selectedPage === page;
  }

  selectPage(newPage: Page): void {
    const oldPage = this.#selectedPage;
    if (oldPage) {
      oldPage.off('dialog', this.#dialogHandler);
    }
    this.#selectedPage = newPage;
    newPage.on('dialog', this.#dialogHandler);
    this.#updateSelectedPageTimeouts();
  }

  #updateSelectedPageTimeouts() {
    const page = this.getSelectedPage();
    // For waiters 5sec timeout should be sufficient.
    // Increased in case we throttle the CPU
    const cpuMultiplier = this.getCpuThrottlingRate();
    page.setDefaultTimeout(DEFAULT_TIMEOUT * cpuMultiplier);
    // 10sec should be enough for the load event to be emitted during
    // navigations.
    // Increased in case we throttle the network requests
    const networkMultiplier = getNetworkMultiplierFromString(
      this.getNetworkConditions(),
    );
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT * networkMultiplier);
  }

  getNavigationTimeout() {
    const page = this.getSelectedPage();
    return page.getDefaultNavigationTimeout();
  }

  getAXNodeByUid(uid: string) {
    return this.#textSnapshot?.idToNode.get(uid);
  }

  async getElementByUid(uid: string): Promise<ElementHandle<Element>> {
    if (!this.#textSnapshot?.idToNode.size) {
      throw new Error(
        `No snapshot found. Use ${takeSnapshot.name} to capture one.`,
      );
    }
    const [snapshotId] = uid.split('_');

    if (this.#textSnapshot.snapshotId !== snapshotId) {
      throw new Error(
        'This uid is coming from a stale snapshot. Call take_snapshot to get a fresh snapshot.',
      );
    }

    const node = this.#textSnapshot?.idToNode.get(uid);
    if (!node) {
      throw new Error('No such element found in the snapshot');
    }
    const handle = await node.elementHandle();
    if (!handle) {
      throw new Error('No such element found in the snapshot');
    }
    return handle;
  }

  /**
   * Creates a snapshot of the pages.
   */
  async createPagesSnapshot(): Promise<Page[]> {
    const allPages = await this.browser.pages(
      // @ts-expect-error rebrowser-puppeteer pages() signature changed
      this.#options.experimentalIncludeAllPages,
    );

    this.#pages = allPages.filter(page => {
      // If we allow debugging DevTools windows, return all pages.
      // If we are in regular mode, the user should only see non-DevTools page.
      return (
        this.#options.experimentalDevToolsDebugging ||
        !page.url().startsWith('devtools://')
      );
    });

    if (
      (!this.#selectedPage || this.#pages.indexOf(this.#selectedPage) === -1) &&
      this.#pages[0]
    ) {
      this.selectPage(this.#pages[0]);
    }

    await this.detectOpenDevToolsWindows();

    return this.#pages;
  }

  async detectOpenDevToolsWindows() {
    this.logger('Detecting open DevTools windows');
    const pages = await this.browser.pages(
      // @ts-expect-error rebrowser-puppeteer pages() signature changed
      this.#options.experimentalIncludeAllPages,
    );
    this.#pageToDevToolsPage = new Map<Page, Page>();
    for (const devToolsPage of pages) {
      if (devToolsPage.url().startsWith('devtools://')) {
        try {
          this.logger('Calling getTargetInfo for ' + devToolsPage.url());
          const data = await devToolsPage
            // @ts-expect-error no types for _client().
            ._client()
            .send('Target.getTargetInfo');
          const devtoolsPageTitle = data.targetInfo.title;
          const urlLike = extractUrlLikeFromDevToolsTitle(devtoolsPageTitle);
          if (!urlLike) {
            continue;
          }
          // TODO: lookup without a loop.
          for (const page of this.#pages) {
            if (urlsEqual(page.url(), urlLike)) {
              this.#pageToDevToolsPage.set(page, devToolsPage);
            }
          }
        } catch (error) {
          this.logger('Issue occurred while trying to find DevTools', error);
        }
      }
    }
  }

  getPages(): Page[] {
    return this.#pages;
  }

  getDevToolsPage(page: Page): Page | undefined {
    return this.#pageToDevToolsPage.get(page);
  }

  async getDevToolsData(): Promise<DevToolsData> {
    try {
      this.logger('Getting DevTools UI data');
      const selectedPage = this.getSelectedPage();
      const devtoolsPage = this.getDevToolsPage(selectedPage);
      if (!devtoolsPage) {
        this.logger('No DevTools page detected');
        return {};
      }
      const {cdpRequestId, cdpBackendNodeId} = await devtoolsPage.evaluate(
        async () => {
          // @ts-expect-error no types
          const UI = await import('/bundled/ui/legacy/legacy.js');
          // @ts-expect-error no types
          const SDK = await import('/bundled/core/sdk/sdk.js');
          const request = UI.Context.Context.instance().flavor(
            SDK.NetworkRequest.NetworkRequest,
          );
          const node = UI.Context.Context.instance().flavor(
            SDK.DOMModel.DOMNode,
          );
          return {
            cdpRequestId: request?.requestId(),
            cdpBackendNodeId: node?.backendNodeId(),
          };
        },
      );
      return {cdpBackendNodeId, cdpRequestId};
    } catch (err) {
      this.logger('error getting devtools data', err);
    }
    return {};
  }

  /**
   * Creates a text snapshot of a page.
   */
  async createTextSnapshot(
    verbose = false,
    devtoolsData: DevToolsData | undefined = undefined,
  ): Promise<void> {
    const page = this.getSelectedPage();
    const rootNode = await page.accessibility.snapshot({
      includeIframes: true,
      interestingOnly: !verbose,
    });
    if (!rootNode) {
      return;
    }

    const snapshotId = this.#nextSnapshotId++;
    // Iterate through the whole accessibility node tree and assign node ids that
    // will be used for the tree serialization and mapping ids back to nodes.
    let idCounter = 0;
    const idToNode = new Map<string, TextSnapshotNode>();
    const assignIds = (node: SerializedAXNode): TextSnapshotNode => {
      const nodeWithId: TextSnapshotNode = {
        ...node,
        id: `${snapshotId}_${idCounter++}`,
        children: node.children
          ? node.children.map(child => assignIds(child))
          : [],
      };

      // The AXNode for an option doesn't contain its `value`.
      // Therefore, set text content of the option as value.
      if (node.role === 'option') {
        const optionText = node.name;
        if (optionText) {
          nodeWithId.value = optionText.toString();
        }
      }

      idToNode.set(nodeWithId.id, nodeWithId);
      return nodeWithId;
    };

    const rootNodeWithId = assignIds(rootNode);
    this.#textSnapshot = {
      root: rootNodeWithId,
      snapshotId: String(snapshotId),
      idToNode,
      hasSelectedElement: false,
      verbose,
    };
    const data = devtoolsData ?? (await this.getDevToolsData());
    if (data?.cdpBackendNodeId) {
      this.#textSnapshot.hasSelectedElement = true;
      this.#textSnapshot.selectedElementUid = this.resolveCdpElementId(
        data?.cdpBackendNodeId,
      );
    }
  }

  getTextSnapshot(): TextSnapshot | null {
    return this.#textSnapshot;
  }

  async saveTemporaryFile(
    data: Uint8Array<ArrayBufferLike>,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  ): Promise<{filename: string}> {
    try {
      const dir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'chrome-devtools-mcp-'),
      );

      const filename = path.join(
        dir,
        `screenshot.${getExtensionFromMimeType(mimeType)}`,
      );
      await fs.writeFile(filename, data);
      return {filename};
    } catch (err) {
      this.logger(err);
      throw new Error('Could not save a screenshot to a file', {cause: err});
    }
  }
  async saveFile(
    data: Uint8Array<ArrayBufferLike>,
    filename: string,
  ): Promise<{filename: string}> {
    try {
      const filePath = path.resolve(filename);
      await fs.writeFile(filePath, data);
      return {filename};
    } catch (err) {
      this.logger(err);
      throw new Error('Could not save a screenshot to a file', {cause: err});
    }
  }

  storeTraceRecording(result: TraceResult): void {
    this.#traceResults.push(result);
  }

  recordedTraces(): TraceResult[] {
    return this.#traceResults;
  }

  getWaitForHelper(
    page: Page,
    cpuMultiplier: number,
    networkMultiplier: number,
  ) {
    return new WaitForHelper(page, cpuMultiplier, networkMultiplier);
  }

  waitForEventsAfterAction(action: () => Promise<unknown>): Promise<void> {
    const page = this.getSelectedPage();
    const cpuMultiplier = this.getCpuThrottlingRate();
    const networkMultiplier = getNetworkMultiplierFromString(
      this.getNetworkConditions(),
    );
    const waitForHelper = this.getWaitForHelper(
      page,
      cpuMultiplier,
      networkMultiplier,
    );
    return waitForHelper.waitForEventsAfterAction(action);
  }

  getNetworkRequestStableId(request: HTTPRequest): number {
    return this.#networkCollector.getIdForResource(request);
  }

  waitForTextOnPage(text: string, timeout?: number): Promise<Element> {
    const page = this.getSelectedPage();
    const frames = page.frames();

    let locator = this.#locatorClass.race(
      frames.flatMap(frame => [
        frame.locator(`aria/${text}`),
        frame.locator(`text/${text}`),
      ]),
    );

    if (timeout) {
      locator = locator.setTimeout(timeout);
    }

    return locator.wait();
  }

  /**
   * We need to ignore favicon request as they make our test flaky
   */
  async setUpNetworkCollectorForTesting() {
    this.#networkCollector = new NetworkCollector(this.browser, collect => {
      return {
        request: req => {
          if (req.url().includes('favicon.ico')) {
            return;
          }
          collect(req);
        },
      } as ListenerMap;
    });
    await this.#networkCollector.init(await this.browser.pages());
  }
}
