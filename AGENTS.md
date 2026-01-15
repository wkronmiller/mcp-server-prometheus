# Agent Guidelines for Prometheus MCP Server

This file provides instructions and context for coding agents working on this repository.

## 1. Build, Lint, and Test Commands

*   **Build**: `npm run build` (Compiles TypeScript to `dist/`)
*   **Development**: `npm run dev` (Runs with `tsx watch`)
*   **Lint**: `npm run lint` (Runs `tsc --noEmit` to check types)
*   **Test Suite**: `npm test` (Runs all tests with Vitest)
*   **Test Coverage**: `npm run test:coverage`
*   **Single Test File**: `npx vitest src/index.test.ts`
*   **Single Test Case**: `npx vitest -t "test name pattern"`
*   **Watch Mode**: `npm run test:watch`

**Important Note**: Always run `npm run lint` and `npm test` before declaring a task complete to ensure type safety and functionality.

## 2. Code Style & Conventions

### General
*   **Language**: TypeScript (ES2022 target, ESNext module).
*   **Strictness**: `strict: true` in `tsconfig.json`. No `any` unless absolutely necessary.
*   **Modules**: ES Modules. **Crucial**: Relative imports must end with `.js` (e.g., `import { foo } from './bar.js';`).
*   **Formatting**: 2 spaces indentation, semicolons required.
*   **Naming**:
    *   **Files**: lowercase/camelCase (e.g., `pagination.ts`, `settings.ts`).
    *   **Functions/Variables**: camelCase.
    *   **MCP Tools**: snake_case (e.g., `prometheus_status`, `prometheus_range_query`).

### Architecture & Patterns
*   **Entry Point**: `src/index.ts` contains the main server logic and tool registration.
*   **Tool Registration**: Use `server.registerTool("tool_name", { ... }, handler)`.
*   **Validation**: Use `zod` for input schemas.
*   **Drivers**: Uses `prometheus-query` for interacting with Prometheus.

### Tool Implementation Example
When adding a new tool, follow this structure:

```typescript
server.registerTool(
  "prometheus_example_tool",
  {
    title: "Example Tool",
    description: "Description of what the tool does",
    inputSchema: {
      query: z.string().describe("The query parameter"),
      ...paginationSchema // Import from ./pagination.js if paginated
    }
  },
  async ({ query, limit = DEFAULT_LIMIT, offset = 0 }) => {
    try {
      // 1. Fetch data
      const result = await prom.someMethod(query);
      
      // 2. Paginate (if applicable)
      const { data, pagination } = paginateArray(result, offset, limit);
      
      // 3. Return formatted response
      return {
        content: [
          {
            type: "text",
            text: formatPaginatedResponse(data, pagination)
          }
        ]
      };
    } catch (error) {
      // 4. Standard error handling
      return {
        content: [
          {
            type: "text", 
            text: `Error executing tool: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);
```

### Error Handling
*   Wrap tool handlers in `try...catch` blocks.
*   On error, return a content object with the error message and set `isError: true`.
*   Ensure error messages are descriptive and helpful to the LLM/user.

### Pagination
*   All list/query tools (except status/configuration) must implement pagination.
*   Use helpers from `src/pagination.ts` (`paginateArray`, `paginateRangeQuery`, etc.).
*   Standard parameters: `limit` (default 100), `offset` (default 0).
*   For range queries, also support `valuesLimit` (default 1000).

**Pagination Metadata Structure**:
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

## 3. Testing Guidelines

*   **Framework**: Vitest.
*   **Mocking**: Use `vi.mock('prometheus-query', ...)` to mock external dependencies.
*   **Location**: Co-located tests (e.g., `src/index.test.ts` for `src/index.ts`).
*   **Pattern**:
    *   Mock the driver responses (status, targets, query results).
    *   Test both success paths and error handling.
    *   Verify pagination logic.

### Test Example
```typescript
vi.mock('prometheus-query', () => ({
  PrometheusDriver: vi.fn().mockImplementation(() => ({
    instantQuery: vi.fn().mockResolvedValue({
      resultType: 'vector',
      result: []
    })
  }))
}));

it('should handle errors gracefully', async () => {
  // Setup mock to throw
  const mockDriver = new PrometheusDriver({ endpoint: '...' });
  mockDriver.instantQuery.mockRejectedValue(new Error('Network error'));
  
  // Call tool via server...
});
```

## 4. Configuration

*   Settings are loaded from environment variables via `dotenv` in `src/settings.ts`.
*   Key variables: `PROMETHEUS_URL`, `BASE_URL`.
*   Do not hardcode configuration; import from `settings.ts`.

## 5. Directory Structure

*   `src/` - Source code.
*   `dist/` - Compiled JavaScript (output).
*   `CLAUDE.md` - High-level project documentation (reference this for more details).
