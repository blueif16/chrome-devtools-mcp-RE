# PRD: Stealth Chrome DevTools MCP for Reddit Automation

## Objective
Create an anti-detection browser automation MCP by forking Chrome DevTools MCP, replacing Puppeteer with Rebrowser-Puppeteer, integrating Ghost-Cursor for human-like interactions, with local Chromium testing and Browserless production deployment.

---

## Phase 1: Setup & Fork

### Step 1.1: Clone and Initialize

```bash
# Clone chrome-devtools-mcp
git clone https://github.com/ChromeDevTools/chrome-devtools-mcp.git
cd chrome-devtools-mcp

# Create your own branch
git checkout -b stealth-reddit-automation

# Install dependencies
npm install

# Verify it works
npm run build
npm start
```

### Step 1.2: Install Anti-Detection Dependencies

```bash
# Remove standard puppeteer, add rebrowser version
npm uninstall puppeteer puppeteer-core

# Install rebrowser versions (these are drop-in replacements)
npm install rebrowser-puppeteer rebrowser-puppeteer-core

# Install ghost-cursor
npm install ghost-cursor

# Install types if using TypeScript
npm install --save-dev @types/node
```

---

## Phase 2: Core Modifications

### Step 2.1: Update package.json

**File: `package.json`**

```json
{
  "dependencies": {
    "rebrowser-puppeteer": "^latest",
    "rebrowser-puppeteer-core": "^latest",
    "ghost-cursor": "^latest"
  },
  "resolutions": {
    "puppeteer": "npm:rebrowser-puppeteer@latest",
    "puppeteer-core": "npm:rebrowser-puppeteer-core@latest"
  }
}
```

### Step 2.2: Replace Puppeteer Imports

**Find all files importing puppeteer:**
```bash
grep -r "from 'puppeteer'" src/
grep -r "require('puppeteer')" src/
```

**Common locations:**
- `src/browser/browser-manager.ts`
- `src/tools/navigation.ts`
- `src/tools/input.ts`

**Replace in all files:**

```typescript
// OLD
import puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';

// NEW
import puppeteer from 'rebrowser-puppeteer';
import { Browser, Page } from 'rebrowser-puppeteer';
```

### Step 2.3: Create Ghost-Cursor Helper Module

**File: `src/utils/human-cursor.ts`**

```typescript
import { Page } from 'rebrowser-puppeteer';
import { createCursor, GhostCursor } from 'ghost-cursor';

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
    this.cursor = createCursor(page, {
      moveSpeed: Math.random() * 500 + 500, // Random speed 500-1000
      defaultOptions: {
        randomizeMoveDelay: true,
        waitForClick: 0,
        waitForSelector: 30000,
      }
    });
    this.options = {
      minDelay: options.minDelay || 300,
      maxDelay: options.maxDelay || 1500,
      preMovement: options.preMovement !== false,
    };
  }

  // Random delay helper
  private async randomDelay(min?: number, max?: number): Promise<void> {
    const minMs = min || this.options.minDelay!;
    const maxMs = max || this.options.maxDelay!;
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await this.page.waitForTimeout(delay);
  }

  // Random pre-movement to look natural
  private async doPreMovement(): Promise<void> {
    if (!this.options.preMovement) return;
    
    const viewport = this.page.viewport();
    if (!viewport) return;

    await this.cursor.move([
      Math.random() * viewport.width * 0.3,
      Math.random() * viewport.height * 0.3
    ]);
  }

  // Human-like click
  async click(selector: string): Promise<void> {
    await this.doPreMovement();
    await this.randomDelay();
    await this.cursor.click(selector);
    await this.randomDelay(100, 500);
  }

  // Human-like move
  async move(selector: string): Promise<void> {
    await this.doPreMovement();
    await this.randomDelay(200, 800);
    await this.cursor.moveTo(selector);
  }

  // Human-like typing
  async type(selector: string, text: string): Promise<void> {
    await this.click(selector);
    await this.randomDelay(300, 700);
    
    // Type with human-like delays
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.page.waitForTimeout(Math.random() * 150 + 50); // 50-200ms per char
    }
    
    await this.randomDelay(200, 500);
  }

  // Random mouse movement (idle behavior)
  async randomMovement(): Promise<void> {
    const viewport = this.page.viewport();
    if (!viewport) return;

    await this.cursor.move([
      Math.random() * viewport.width,
      Math.random() * viewport.height
    ]);
  }

  // Human-like scroll
  async scroll(direction: 'up' | 'down', amount: number = 300): Promise<void> {
    await this.randomDelay();
    const delta = direction === 'down' ? amount : -amount;
    
    // Smooth scroll in chunks
    const chunks = 3 + Math.floor(Math.random() * 3); // 3-5 chunks
    const chunkSize = delta / chunks;
    
    for (let i = 0; i < chunks; i++) {
      await this.page.mouse.wheel({ deltaY: chunkSize });
      await this.page.waitForTimeout(50 + Math.random() * 100);
    }
    
    await this.randomDelay(500, 1500);
  }
}

// Singleton factory for easy access
const cursorInstances = new WeakMap<Page, HumanCursor>();

export function getHumanCursor(page: Page, options?: HumanCursorOptions): HumanCursor {
  if (!cursorInstances.has(page)) {
    cursorInstances.set(page, new HumanCursor(page, options));
  }
  return cursorInstances.get(page)!;
}
```

### Step 2.4: Modify Browser Launch Configuration

**File: `src/browser/browser-manager.ts`**

```typescript
import puppeteer, { Browser } from 'rebrowser-puppeteer';

export class BrowserManager {
  private browser: Browser | null = null;

  async launch(options: {
    headless?: boolean;
    browserUrl?: string;
    wsEndpoint?: string;
  }): Promise<Browser> {
    // Production: Connect to Browserless
    if (options.wsEndpoint || options.browserUrl) {
      this.browser = await puppeteer.connect({
        browserWSEndpoint: options.wsEndpoint || options.browserUrl,
        defaultViewport: null, // Critical: avoid 800x600 default
      });
      return this.browser;
    }

    // Development: Launch local Chromium
    this.browser = await puppeteer.launch({
      headless: options.headless || false, // Visible for testing
      defaultViewport: null, // Use full window size
      args: [
        '--disable-blink-features=AutomationControlled', // Critical
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Reddit-specific optimizations
        '--disable-web-security', // Only if needed
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    // Set environment variable for rebrowser patches
    process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';

    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getBrowser(): Browser | null {
    return this.browser;
  }
}
```

### Step 2.5: Integrate Human Cursor into MCP Tools

**File: `src/tools/click.ts`**

```typescript
import { Page } from 'rebrowser-puppeteer';
import { getHumanCursor } from '../utils/human-cursor.js';

export async function clickTool(page: Page, selector: string): Promise<void> {
  const humanCursor = getHumanCursor(page);
  
  // Wait for element to exist
  await page.waitForSelector(selector, { timeout: 30000 });
  
  // Human-like click
  await humanCursor.click(selector);
}
```

**File: `src/tools/fill.ts`**

```typescript
import { Page } from 'rebrowser-puppeteer';
import { getHumanCursor } from '../utils/human-cursor.js';

export async function fillTool(
  page: Page, 
  selector: string, 
  text: string
): Promise<void> {
  const humanCursor = getHumanCursor(page);
  
  // Wait for input to be available
  await page.waitForSelector(selector, { timeout: 30000 });
  
  // Clear existing text first
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  
  // Human-like typing
  await humanCursor.type(selector, text);
}
```

**File: `src/tools/navigate.ts`**

```typescript
import { Page } from 'rebrowser-puppeteer';
import { getHumanCursor } from '../utils/human-cursor.js';

export async function navigateTool(
  page: Page, 
  url: string
): Promise<void> {
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  // Simulate reading/loading behavior
  const humanCursor = getHumanCursor(page);
  
  // Wait random time (looks like user is reading)
  await page.waitForTimeout(2000 + Math.random() * 3000);
  
  // Do some random mouse movements
  await humanCursor.randomMovement();
  await page.waitForTimeout(500 + Math.random() * 1000);
  await humanCursor.randomMovement();
}
```

### Step 2.6: Add Reddit-Specific Helpers

**File: `src/utils/reddit-helpers.ts`**

```typescript
import { Page } from 'rebrowser-puppeteer';
import { getHumanCursor } from './human-cursor.js';

export class RedditHelper {
  constructor(private page: Page) {}

  // Simulate natural scrolling behavior
  async naturalScroll(scrollCount: number = 3): Promise<void> {
    const cursor = getHumanCursor(this.page);
    
    for (let i = 0; i < scrollCount; i++) {
      await cursor.scroll('down', 200 + Math.random() * 300);
      
      // Sometimes scroll back up a bit (humans do this)
      if (Math.random() > 0.7) {
        await cursor.scroll('up', 100 + Math.random() * 100);
      }
      
      await this.page.waitForTimeout(1000 + Math.random() * 2000);
    }
  }

  // Simulate reading a post
  async simulateReading(minSeconds: number = 3, maxSeconds: number = 8): Promise<void> {
    const cursor = getHumanCursor(this.page);
    const readTime = (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
    const movements = Math.floor(readTime / 2000); // Move every ~2 seconds
    
    for (let i = 0; i < movements; i++) {
      await cursor.randomMovement();
      await this.page.waitForTimeout(1500 + Math.random() * 1000);
    }
  }

  // Login with human behavior
  async login(username: string, password: string): Promise<void> {
    const cursor = getHumanCursor(this.page);
    
    // Navigate to login
    await this.page.goto('https://www.reddit.com/login');
    await this.page.waitForTimeout(2000 + Math.random() * 2000);
    
    // Fill username
    await cursor.type('input[name="username"]', username);
    await this.page.waitForTimeout(500 + Math.random() * 1000);
    
    // Fill password
    await cursor.type('input[name="password"]', password);
    await this.page.waitForTimeout(1000 + Math.random() * 1500);
    
    // Click login button
    await cursor.click('button[type="submit"]');
    
    // Wait for navigation
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await this.page.waitForTimeout(2000 + Math.random() * 2000);
  }

  // Upvote with caution
  async upvote(postSelector: string): Promise<void> {
    const cursor = getHumanCursor(this.page);
    
    // Scroll to post first
    await this.page.evaluate((selector) => {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
    }, postSelector);
    
    await this.page.waitForTimeout(500 + Math.random() * 1000);
    
    // Find and click upvote button
    const upvoteButton = `${postSelector} button[aria-label*="upvote"]`;
    await cursor.click(upvoteButton);
    
    // Wait after action
    await this.page.waitForTimeout(1500 + Math.random() * 2000);
  }
}
```

---

## Phase 3: Configuration Files

### Step 3.1: Environment Configuration

**File: `.env.development`**

```bash
# Development (local Chromium)
MODE=development
HEADLESS=false
BROWSER_EXECUTABLE=/usr/bin/chromium  # Adjust to your path

# Rebrowser settings
REBROWSER_PATCHES_RUNTIME_FIX_MODE=alwaysIsolated

# Human behavior settings
MIN_DELAY=300
MAX_DELAY=1500
ENABLE_PRE_MOVEMENT=true
```

**File: `.env.production`**

```bash
# Production (Browserless)
MODE=production
BROWSERLESS_URL=wss://your-browserless-instance.com
# OR
BROWSERLESS_URL=ws://localhost:3000  # Self-hosted

# Browserless options
STEALTH_MODE=true
PROXY_ENABLED=true

# Rebrowser settings
REBROWSER_PATCHES_RUNTIME_FIX_MODE=alwaysIsolated

# Human behavior settings
MIN_DELAY=500
MAX_DELAY=2500
ENABLE_PRE_MOVEMENT=true
```

### Step 3.2: Launch Configuration

**File: `src/config/launch-config.ts`**

```typescript
import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.MODE || 'development'}` });

export const config = {
  mode: process.env.MODE || 'development',
  
  // Browser settings
  headless: process.env.HEADLESS === 'true',
  browserlessUrl: process.env.BROWSERLESS_URL,
  stealthMode: process.env.STEALTH_MODE === 'true',
  
  // Human behavior
  humanBehavior: {
    minDelay: parseInt(process.env.MIN_DELAY || '300'),
    maxDelay: parseInt(process.env.MAX_DELAY || '1500'),
    preMovement: process.env.ENABLE_PRE_MOVEMENT !== 'false',
  },
  
  // Rebrowser
  rebrowserMode: process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE || 'alwaysIsolated',
};
```

---

## Phase 4: Testing Setup

### Step 4.1: Build and Run Development

```bash
# Build the project
npm run build

# Run in development mode (local Chromium, visible)
MODE=development npm start
```

### Step 4.2: Create Test Script

**File: `test-reddit.ts`**

```typescript
import { BrowserManager } from './src/browser/browser-manager.js';
import { RedditHelper } from './src/utils/reddit-helpers.js';
import { getHumanCursor } from './src/utils/human-cursor.js';
import { config } from './src/config/launch-config.js';

async function testReddit() {
  const browserManager = new BrowserManager();
  
  // Launch browser
  const browser = await browserManager.launch({
    headless: config.headless,
    wsEndpoint: config.browserlessUrl,
  });
  
  const page = await browser.newPage();
  const reddit = new RedditHelper(page);
  const cursor = getHumanCursor(page, config.humanBehavior);
  
  console.log('🚀 Starting Reddit test...');
  
  try {
    // Test 1: Navigate to Reddit
    console.log('📍 Navigating to Reddit...');
    await page.goto('https://www.reddit.com');
    await page.waitForTimeout(3000);
    
    // Test 2: Simulate browsing
    console.log('📜 Simulating natural scrolling...');
    await reddit.naturalScroll(3);
    
    // Test 3: Random mouse movements
    console.log('🖱️  Random mouse movements...');
    await cursor.randomMovement();
    await page.waitForTimeout(1000);
    await cursor.randomMovement();
    
    // Test 4: Check for detection
    console.log('🔍 Checking bot detection...');
    const pageContent = await page.content();
    
    if (pageContent.includes('blocked') || pageContent.includes('captcha')) {
      console.error('❌ DETECTED! Bot detection triggered.');
    } else {
      console.log('✅ SUCCESS! No detection.');
    }
    
    // Test 5: Simulate reading
    console.log('📖 Simulating reading behavior...');
    await reddit.simulateReading(5, 10);
    
    console.log('✨ Test completed! Check the browser window.');
    
    // Keep browser open for inspection
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browserManager.close();
  }
}

testReddit();
```

### Step 4.3: Run Test

```bash
# Install ts-node if not already
npm install -g ts-node

# Run test with local Chromium
MODE=development ts-node test-reddit.ts
```

**What to watch for:**
- Browser opens visibly ✅
- Mouse movements look natural ✅
- No "blocked" or CAPTCHA pages ✅
- Delays feel human-like ✅
- Scrolling is smooth ✅

---

## Phase 5: Production Deployment

### Step 5.1: Setup Browserless (Docker)

```bash
# Pull and run Browserless
docker run -p 3000:3000 ghcr.io/browserless/chromium

# Or with stealth options
docker run -p 3000:3000 \
  -e "DEFAULT_STEALTH=true" \
  -e "DEFAULT_BLOCK_ADS=true" \
  ghcr.io/browserless/chromium
```

### Step 5.2: Update Production Config

**File: `.env.production`**

```bash
MODE=production
BROWSERLESS_URL=ws://localhost:3000  # Or your cloud instance
HEADLESS=true
STEALTH_MODE=true
```

### Step 5.3: Production MCP Configuration

**File: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`**

Or wherever your AI agent's MCP config is:

```json
{
  "mcpServers": {
    "stealth-chrome": {
      "command": "node",
      "args": [
        "/path/to/your/chrome-devtools-mcp/dist/index.js",
        "--browser-url=ws://localhost:3000"
      ],
      "env": {
        "MODE": "production",
        "REBROWSER_PATCHES_RUNTIME_FIX_MODE": "alwaysIsolated"
      }
    }
  }
}
```

### Step 5.4: Production Test

```bash
# Build for production
npm run build

# Run with Browserless
MODE=production npm start -- --browser-url=ws://localhost:3000
```

---

## Phase 6: Usage in AI Agent

### Example Prompts for Claude/Cursor

```
# Development testing
"Using stealth-chrome MCP, navigate to reddit.com and scroll through the front page naturally"

# Login test
"Log into Reddit with username 'testuser' and password 'testpass' using natural human behavior"

# Upvote test
"Find the top post on r/programming and upvote it with human-like movements"

# Comment test
"Navigate to the first post, read it for 5 seconds, then scroll to comments and upvote the top comment"
```

---

## Validation Checklist

### Pre-Flight Checks

```bash
# ✅ Rebrowser installed
npm list | grep rebrowser

# ✅ Ghost-cursor installed
npm list | grep ghost-cursor

# ✅ Build successful
npm run build

# ✅ Environment variables set
echo $REBROWSER_PATCHES_RUNTIME_FIX_MODE
```

### Runtime Validation

Visit these test sites in your automation:

1. **https://bot-detector.rebrowser.net/** - Should pass all tests
2. **https://nowsecure.nl** - Should show green checkmarks
3. **https://reddit.com** - Should load without blocks
4. **https://browserscan.net** - Check fingerprint consistency

---

## Troubleshooting

### Issue: Still getting detected

```typescript
// Add more aggressive settings in browser-manager.ts
args: [
  '--disable-blink-features=AutomationControlled',
  '--exclude-switches=enable-automation',
  '--disable-dev-shm-usage',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-site-isolation-trials',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
]
```

### Issue: Mouse movements too fast

```typescript
// Adjust in human-cursor.ts constructor
moveSpeed: Math.random() * 1000 + 1000, // Slower: 1000-2000
```

### Issue: Not enough randomness

```typescript
// Increase delays in .env
MIN_DELAY=800
MAX_DELAY=3000
```

---

## Success Metrics

- ✅ Passes rebrowser-bot-detector
- ✅ Can browse Reddit without detection
- ✅ Can login without CAPTCHA
- ✅ Can perform actions (upvote/comment) without blocks
- ✅ Smooth transition from dev to production
- ✅ AI agent can control naturally via prompts

---

**Next Steps**: Test with your actual Reddit tasks, monitor for any detection, adjust timing parameters as needed. Start conservative with delays, can optimize later once stable.