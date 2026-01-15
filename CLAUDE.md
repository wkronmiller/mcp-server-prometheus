# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start server with tsx watch (hot reload)
npm run build        # Compile TypeScript and make dist/index.js executable
npm run lint         # Type check with TypeScript (no emit)
npm test             # Run tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Architecture

This is an MCP (Model Context Protocol) server that exposes Prometheus monitoring operations as tools. It uses stdio transport for communication.

**Key files:**
- `src/index.ts` - Main server with 8 registered tools using `@modelcontextprotocol/sdk`
- `src/settings.ts` - Configuration via environment variables (PROMETHEUS_URL, BASE_URL)
- `src/pagination.ts` - Pagination utilities for automatic result truncation

**Tool registration pattern:**
```typescript
server.registerTool(
  "tool_id",           // snake_case identifier
  {
    title: "...",
    description: "...",
    inputSchema: { param: z.string().describe("...") }  // Zod schemas
  },
  async ({ param }) => {
    // Return { content: [{ type: "text", text: "..." }] }
    // On error: add isError: true
  }
);
```

**8 registered tools:** `prometheus_status`, `prometheus_targets`, `prometheus_label_names`, `prometheus_label_values`, `prometheus_instant_query`, `prometheus_range_query`, `prometheus_series`, `prometheus_alerts`

## Testing

Tests use Vitest with `vi.mock()` to mock the `prometheus-query` module. See `src/index.test.ts` for the mocking pattern.

## Configuration

Environment variables (loaded via dotenv):
- `PROMETHEUS_URL` (required) - Prometheus server endpoint
- `BASE_URL` (optional) - API base path, defaults to `/api/v1`
- `DEFAULT_PAGINATION_LIMIT` (optional) - Default result limit, defaults to `100`
- `MAX_PAGINATION_LIMIT` (optional) - Maximum allowed limit, defaults to `1000`
- `DEFAULT_VALUES_LIMIT` (optional) - Default data points per series in range queries, defaults to `1000`

## Pagination

All query tools (except `prometheus_status`) support automatic pagination to prevent oversized responses.

**Pagination parameters:**
- `limit` (optional) - Maximum results to return (default: 100, max: 1000)
- `offset` (optional) - Number of results to skip (default: 0)
- `valuesLimit` (optional, range_query only) - Maximum data points per series (default: 1000)

**Response format:**
All paginated tools return a wrapper with pagination metadata:
```json
{
  "data": { "status": "success", "data": [...] },
  "pagination": {
    "offset": 0,
    "limit": 100,
    "returned": 50,
    "total": 50,
    "hasMore": false
  }
}
```

For `prometheus_targets`, pagination metadata is per-array:
```json
{
  "pagination": {
    "activeTargets": { "offset": 0, "limit": 100, ... },
    "droppedTargets": { "offset": 0, "limit": 100, ... }
  }
}
```

For `prometheus_range_query`, includes additional fields:
```json
{
  "pagination": {
    "valuesLimitApplied": 1000,
    "valuesTruncatedCount": 3
  }
}
```

## Publishing

Package published to npm as `@wkronmiller/prometheus-mcp-server`. GitHub releases trigger automatic npm publishing via GitHub Actions.
