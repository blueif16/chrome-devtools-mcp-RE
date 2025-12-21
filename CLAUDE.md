# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`chrome-devtools-mcp` is a Model Context Protocol (MCP) server that enables AI coding assistants to control and inspect a live Chrome browser. It provides access to Chrome DevTools capabilities for browser automation, debugging, performance analysis, and network inspection.

**Key Technologies:**
- TypeScript with ES modules
- Puppeteer for browser automation
- Chrome DevTools Frontend integration for performance insights
- MCP SDK for protocol implementation
- Node.js native test runner

## Development Commands

### Build and Development
```bash
npm ci                    # Install dependencies (use ci, not install)
npm run build            # Compile TypeScript to build/
npm run typecheck        # Type check without emitting files
npm run clean            # Remove build directory
npm run bundle           # Clean, build, and create rollup bundle
```

### Testing
```bash
npm test                          # Build and run all tests
npm run test:only                 # Run tests marked with .only
npm run test:only:no-build        # Run .only tests without rebuilding
npm run test:update-snapshots     # Update test snapshots
```

### Code Quality
```bash
npm run format           # Auto-fix linting and formatting issues
npm run check-format     # Check linting and formatting (CI)
```

### Documentation
```bash
npm run docs             # Generate tool reference docs from code
```

### Running the Server
```bash
npm start                                    # Build and start server
npm run start-debug                          # Start with debug logging
npx @modelcontextprotocol/inspector node build/src/index.js    # Test with MCP inspector
```

For local development testing, configure your MCP client to use:
```json
{
  "command": "node",
  "args": ["/absolute/path/to/build/src/index.js"]
}
```

## Architecture

### Entry Point Flow
1. **src/index.ts** - Node version check and imports main.js
2. **src/main.ts** - Server initialization, tool registration, and MCP connection
   - Parses CLI arguments via `cli.ts`
   - Creates MCP server instance
   - Registers all tools with mutex-protected handlers
   - Connects via stdio transport

### Core Components

**McpContext (src/McpContext.ts)**
- Central state manager for browser, pages, and DevTools data
- Manages page selection, network/console collectors, and snapshots
- Provides helper methods for element interaction and waiting
- Handles geolocation, network conditions, and CPU throttling

**McpResponse (src/McpResponse.ts)**
- Response builder for tool handlers
- Aggregates text, images, snapshots, network requests, and console messages
- Handles pagination and formatting of collected data
- Converts internal data to MCP content format

**Browser Management (src/browser.ts)**
- Launches Chrome with Puppeteer or connects to existing instance
- Supports multiple channels (stable, canary, beta, dev)
- Manages user data directories and isolated profiles
- Handles WebSocket connections with custom headers

**Tool System (src/tools/)**
- Each tool file exports tool definitions using `defineTool()`
- Tools are categorized: Input, Navigation, Emulation, Performance, Network, Debugging
- Tool handlers receive Request, Response, and Context objects
- All tool calls are mutex-protected to prevent concurrent execution

**Data Collectors (src/PageCollector.ts)**
- NetworkCollector: Tracks HTTP requests with pagination support
- ConsoleCollector: Captures console messages with filtering
- Both support "preserved" items that persist across navigations

**Formatters (src/formatters/)**
- consoleFormatter: Formats console messages for AI consumption
- networkFormatter: Formats network requests with headers/bodies
- snapshotFormatter: Formats accessibility tree snapshots

### Tool Registration Pattern

Tools follow this structure:
```typescript
export const toolName = defineTool({
  name: 'tool_name',
  description: 'What the tool does',
  annotations: {
    category: ToolCategory.CATEGORY_NAME,
    readOnlyHint: true/false,
  },
  schema: {
    param1: zod.string().describe('Parameter description'),
    // ... more params
  },
  handler: async (request, response, context) => {
    // Implementation
    response.appendResponseLine('Result text');
    response.includeSnapshot();
  },
});
```

### Design Principles (from docs/design-principles.md)

- **Agent-Agnostic API**: Use MCP standards, don't lock into one LLM
- **Token-Optimized**: Return semantic summaries, not raw JSON dumps
- **Small, Deterministic Blocks**: Composable tools, not magic buttons
- **Self-Healing Errors**: Actionable errors with context and fixes
- **Human-Agent Collaboration**: Output readable by both machines and humans

## Key Patterns

### Mutex Protection
All tool handlers are wrapped with a mutex to ensure sequential execution:
```typescript
const guard = await toolMutex.acquire();
try {
  // Tool execution
} finally {
  guard.dispose();
}
```

### Lazy Browser Initialization
The browser is only launched when the first tool requiring it is called. Use `getContext()` to ensure browser is ready.

### Response Building
Tools build responses incrementally:
- `response.appendResponseLine()` for text output
- `response.includeSnapshot()` to include page accessibility tree
- `response.setIncludeNetworkRequests()` for network data
- `response.setIncludeConsoleData()` for console messages
- `response.attachImage()` for screenshots

### DevTools Integration
The project embeds Chrome DevTools Frontend code for:
- Performance trace parsing and insights
- Issue detection and aggregation
- Network request formatting
- Located in `node_modules/chrome-devtools-frontend/`

## Testing

Tests use Node.js native test runner with:
- Snapshot testing for formatted output
- Sinon for mocking
- Test server for network request testing
- Setup file: `tests/setup.ts`

Test files mirror source structure in `tests/` directory.

## Important Notes

- **Conventional Commits**: Follow conventional commit format for PRs
- **Auto-generated Docs**: Run `npm run docs` after changing tool names/descriptions
- **License Headers**: All source files must have Apache 2.0 license header
- **Version Management**: Version in `src/main.ts` is managed by release-please
- **Node Version**: Requires Node 20.19+, 22.12+, or 23+
- **User Data Dir**: Default is `$HOME/.cache/chrome-devtools-mcp/chrome-profile-$CHANNEL`

## CRITICAL: MCP Development Workflow

**Every time you modify source code, you MUST:**

1. Rebuild the project:
   ```bash
   npm run build
   ```

2. Remove the old MCP server:
   ```bash
   claude mcp remove chrome-devtools
   ```

3. Re-add the MCP server with the new build:
   ```bash
   claude mcp add chrome-devtools node /Users/tk/Desktop/chrome-devtools-mcp-RE/build/src/index.js
   ```

**Why this matters:**
- Building the code does NOT automatically update the running MCP server
- The MCP server continues running the old code until you remove and re-add it
- Testing without this workflow will show no changes, wasting time and effort

**When testing with MCP tools:**
- Always use MCP functions (navigate_page, evaluate_script, etc.) for testing
- Never run standalone test scripts when you need to verify MCP behavior
- The MCP tools reflect the actual runtime behavior that users will experience

## Configuration Options

The server accepts CLI arguments for:
- Browser connection (`--browserUrl`, `--wsEndpoint`)
- Browser launch (`--headless`, `--executablePath`, `--channel`)
- User data (`--userDataDir`, `--isolated`)
- Network (`--proxyServer`, `--acceptInsecureCerts`)
- Debugging (`--logFile` with `DEBUG=*` env var)
- Tool categories (`--categoryEmulation`, `--categoryPerformance`, `--categoryNetwork`)

See README.md for full configuration reference.
