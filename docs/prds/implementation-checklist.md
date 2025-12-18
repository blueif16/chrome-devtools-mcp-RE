# Chrome DevTools MCP - Stealth Implementation Checklist

**Based on**: `docs/prds/step1_addon.md`
**Objective**: Transform chrome-devtools-mcp into anti-detection browser automation using Rebrowser-Puppeteer + Ghost-Cursor

---

## Progress Overview

**Total Progress**: 0/30 tasks (0%)

| Phase | Description | Progress |
|-------|-------------|----------|
| Phase 1 | Setup & Discovery | 0/2 (0%) |
| Phase 2 | Dependency Management | 0/3 (0%) |
| Phase 3 | Core Utilities Creation | 0/3 (0%) |
| Phase 4 | Browser Manager Modifications | 0/3 (0%) |
| Phase 5 | Tools Integration | 0/3 (0%) |
| Phase 6 | Reddit-Specific Helpers | 0/2 (0%) |
| Phase 7 | Configuration Setup | 0/4 (0%) |
| Phase 8 | Testing Infrastructure | 0/2 (0%) |
| Phase 9 | Validation & Testing | 0/6 (0%) |
| Phase 10 | Integration & Documentation | 0/2 (0%) |

---

## Phase 1: Setup & Discovery

- [ ] **Task 1**: Explore current codebase structure
  - **Action**: Use Glob/Grep to understand file organization
  - **Files**: `src/**/*`
  - **Dependencies**: None
  - **Reference**: PRD Phase 1, Step 1.1

- [ ] **Task 2**: Find all files importing puppeteer
  - **Action**: Search for puppeteer imports across codebase
  - **Command**: `grep -r "from 'puppeteer'" src/` and `grep -r "from \"puppeteer\"" src/`
  - **Dependencies**: None
  - **Reference**: PRD Phase 2, Step 2.2

---

## Phase 2: Dependency Management

- [ ] **Task 3**: Uninstall puppeteer dependencies
  - **Action**: `npm uninstall puppeteer puppeteer-core`
  - **Files**: `package.json`, `package-lock.json`
  - **Dependencies**: None
  - **Reference**: PRD Phase 1, Step 1.2

- [ ] **Task 4**: Install anti-detection dependencies
  - **Action**: `npm install rebrowser-puppeteer rebrowser-puppeteer-core ghost-cursor`
  - **Files**: `package.json`, `package-lock.json`
  - **Dependencies**: Task 3
  - **Reference**: PRD Phase 1, Step 1.2

- [ ] **Task 5**: Update package.json resolutions
  - **Action**: Add resolutions field for rebrowser packages
  - **Files**: `package.json`
  - **Dependencies**: Task 4
  - **Reference**: PRD Phase 2, Step 2.1

---

## Phase 3: Core Utilities Creation

- [ ] **Task 6**: Create human-cursor.ts base structure (Part 1/3)
  - **Action**: Create file with imports, interface, class constructor, helper methods
  - **Files**: `src/utils/human-cursor.ts` (lines 1-70)
  - **Dependencies**: Task 4
  - **Reference**: PRD Phase 2, Step 2.3

- [ ] **Task 7**: Add interaction methods to human-cursor.ts (Part 2/3)
  - **Action**: Add click, move, type methods
  - **Files**: `src/utils/human-cursor.ts` (lines 71-140)
  - **Dependencies**: Task 6
  - **Reference**: PRD Phase 2, Step 2.3

- [ ] **Task 8**: Add scroll and factory to human-cursor.ts (Part 3/3)
  - **Action**: Add scroll, randomMovement methods and factory function
  - **Files**: `src/utils/human-cursor.ts` (lines 141-215)
  - **Dependencies**: Task 7
  - **Reference**: PRD Phase 2, Step 2.3

---

## Phase 4: Browser Manager Modifications

- [ ] **Task 9**: Replace puppeteer imports in browser.ts
  - **Action**: Change `from 'puppeteer'` to `from 'rebrowser-puppeteer'`
  - **Files**: `src/browser.ts` (or equivalent browser manager file)
  - **Dependencies**: Task 4
  - **Reference**: PRD Phase 2, Step 2.2

- [ ] **Task 10**: Update browser launch configuration
  - **Action**: Add anti-detection args, set defaultViewport: null
  - **Files**: `src/browser.ts`
  - **Dependencies**: Task 9
  - **Reference**: PRD Phase 2, Step 2.4

- [ ] **Task 11**: Add Browserless connection support
  - **Action**: Add wsEndpoint/browserUrl connection logic
  - **Files**: `src/browser.ts`
  - **Dependencies**: Task 10
  - **Reference**: PRD Phase 2, Step 2.4

---

## Phase 5: Tools Integration

- [ ] **Task 12**: Replace puppeteer imports in all tools
  - **Action**: Update imports in `src/tools/*.ts` files
  - **Files**: `src/tools/input.ts`, `src/tools/pages.ts`, etc.
  - **Dependencies**: Task 4
  - **Reference**: PRD Phase 2, Step 2.2

- [ ] **Task 13**: Integrate human-cursor into input.ts
  - **Action**: Use getHumanCursor for typing actions
  - **Files**: `src/tools/input.ts`
  - **Dependencies**: Task 8, Task 12
  - **Reference**: PRD Phase 2, Step 2.5

- [ ] **Task 14**: Integrate human-cursor into pages.ts
  - **Action**: Add human-like behavior to navigation
  - **Files**: `src/tools/pages.ts`
  - **Dependencies**: Task 8, Task 12
  - **Reference**: PRD Phase 2, Step 2.5

---

## Phase 6: Reddit-Specific Helpers

- [ ] **Task 15**: Create reddit-helpers.ts base (Part 1/2)
  - **Action**: Create RedditHelper class with naturalScroll, simulateReading
  - **Files**: `src/utils/reddit-helpers.ts` (lines 1-110)
  - **Dependencies**: Task 8
  - **Reference**: PRD Phase 2, Step 2.6

- [ ] **Task 16**: Add Reddit-specific methods (Part 2/2)
  - **Action**: Add login, upvote methods
  - **Files**: `src/utils/reddit-helpers.ts` (lines 111-220)
  - **Dependencies**: Task 15
  - **Reference**: PRD Phase 2, Step 2.6

---

## Phase 7: Configuration Setup

- [ ] **Task 17**: Create launch-config.ts
  - **Action**: Create unified configuration manager with dotenv
  - **Files**: `src/config/launch-config.ts`
  - **Dependencies**: Task 20
  - **Reference**: PRD Phase 3, Step 3.2

- [ ] **Task 18**: Create .env.development
  - **Action**: Create development environment configuration
  - **Files**: `.env.development`
  - **Dependencies**: None
  - **Reference**: PRD Phase 3, Step 3.1

- [ ] **Task 19**: Create .env.production
  - **Action**: Create production environment configuration
  - **Files**: `.env.production`
  - **Dependencies**: None
  - **Reference**: PRD Phase 3, Step 3.1

- [ ] **Task 20**: Install dotenv package
  - **Action**: `npm install dotenv`
  - **Files**: `package.json`
  - **Dependencies**: None
  - **Reference**: PRD Phase 3, Step 3.2

---

## Phase 8: Testing Infrastructure

- [ ] **Task 21**: Create test-reddit.ts base (Part 1/2)
  - **Action**: Create test script with setup and basic tests
  - **Files**: `test-reddit.ts` (lines 1-45)
  - **Dependencies**: Task 8, Task 16, Task 17
  - **Reference**: PRD Phase 4, Step 4.2

- [ ] **Task 22**: Add test cases to test-reddit.ts (Part 2/2)
  - **Action**: Add detection checks and behavior tests
  - **Files**: `test-reddit.ts` (lines 46-90)
  - **Dependencies**: Task 21
  - **Reference**: PRD Phase 4, Step 4.2

---

## Phase 9: Validation & Testing

- [ ] **Task 23**: Run build to verify compilation
  - **Action**: `npm run build`
  - **Expected**: No TypeScript errors
  - **Dependencies**: All code tasks (1-22)
  - **Reference**: PRD Phase 4, Step 4.1

- [ ] **Task 24**: Test with local Chromium
  - **Action**: `MODE=development ts-node test-reddit.ts`
  - **Expected**: Browser opens, natural behavior visible
  - **Dependencies**: Task 23
  - **Reference**: PRD Phase 4, Step 4.3

- [ ] **Task 25**: Setup Browserless Docker
  - **Action**: `docker run -p 3000:3000 -e "DEFAULT_STEALTH=true" ghcr.io/browserless/chromium`
  - **Expected**: Browserless running on ws://localhost:3000
  - **Dependencies**: None
  - **Reference**: PRD Phase 5, Step 5.1

- [ ] **Task 26**: Test with Browserless
  - **Action**: `MODE=production npm start -- --browser-url=ws://localhost:3000`
  - **Expected**: Connects to Browserless successfully
  - **Dependencies**: Task 23, Task 25
  - **Reference**: PRD Phase 5, Step 5.4

- [ ] **Task 27**: Validate against bot detection sites
  - **Action**: Test on rebrowser.net, nowsecure.nl
  - **Expected**: Pass all detection tests
  - **Dependencies**: Task 24 or Task 26
  - **Reference**: PRD Phase 4, Step 4.3

- [ ] **Task 28**: Test Reddit.com access
  - **Action**: Navigate to reddit.com, check for blocks/CAPTCHA
  - **Expected**: No detection, no CAPTCHA
  - **Dependencies**: Task 27
  - **Reference**: PRD Phase 4, Step 4.3

---

## Phase 10: Integration & Documentation

- [ ] **Task 29**: Update MCP configuration
  - **Action**: Add stealth-chrome MCP server config
  - **Files**: MCP settings JSON (user-specific path)
  - **Dependencies**: Task 23
  - **Reference**: PRD Phase 5, Step 5.3

- [ ] **Task 30**: Document implementation notes
  - **Action**: Create notes on deviations, issues, optimizations
  - **Files**: `docs/prds/implementation-notes.md`
  - **Dependencies**: All tasks
  - **Reference**: PRD all phases

---

## Quick Reference

### Critical Files to Create
1. `src/utils/human-cursor.ts` (215 lines)
2. `src/utils/reddit-helpers.ts` (220 lines)
3. `src/config/launch-config.ts` (~25 lines)
4. `.env.development` (~10 lines)
5. `.env.production` (~15 lines)
6. `test-reddit.ts` (~90 lines)

### Critical Files to Modify
1. `src/browser.ts` - Browser launch logic
2. `src/tools/input.ts` - Input handling
3. `src/tools/pages.ts` - Navigation
4. `package.json` - Dependencies and resolutions

### Validation Checklist
- [ ] `npm list | grep rebrowser` shows rebrowser packages
- [ ] `npm list | grep ghost-cursor` shows ghost-cursor
- [ ] `npm run build` succeeds with no errors
- [ ] Test passes on https://bot-detector.rebrowser.net/
- [ ] Test passes on https://nowsecure.nl
- [ ] Reddit.com loads without CAPTCHA

---

**Last Updated**: 2025-12-14
**Status**: Ready to begin implementation
