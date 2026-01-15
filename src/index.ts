#!/usr/bin/env node

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrometheusDriver } from 'prometheus-query';
import { Endpoint, BaseUrl } from './settings.js';
import {
  DEFAULT_LIMIT,
  DEFAULT_VALUES_LIMIT,
  paginationSchema,
  rangeQueryPaginationSchema,
  paginateArray,
  paginateNestedArray,
  paginateMultipleArrays,
  paginateRangeQuery,
  formatPaginatedResponse
} from './pagination.js';

export function createServer() {
  const server = new McpServer({ 
    name: "prometheus-mcp-server", 
    version: "0.0.1" 
  });

  const prom = new PrometheusDriver({
    endpoint: Endpoint,
    baseURL: BaseUrl,
  });

  // Register Prometheus Status Tool
  server.registerTool(
    "prometheus_status",
    {
      title: "Prometheus Status",
      description: "Get Prometheus server status and configuration",
      inputSchema: {}
    },
    async () => {
      try {
        const status = await prom.status();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text", 
              text: `Error getting Prometheus status: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Prometheus Targets Tool
  server.registerTool(
    "prometheus_targets",
    {
      title: "Prometheus Targets",
      description: "Get Prometheus targets (active, dropped, or any)",
      inputSchema: {
        state: z.string().optional().describe("Target state: 'active', 'dropped', or 'any'"),
        ...paginationSchema
      }
    },
    async ({ state = 'active', limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const targets = await prom.targets(state as 'active' | 'dropped' | 'any');
        const { data, pagination } = paginateMultipleArrays(
          targets as object,
          {
            activeTargets: 'activeTargets',
            droppedTargets: 'droppedTargets'
          },
          offset,
          limit
        );
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(data, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting Prometheus targets: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Label Names Tool
  server.registerTool(
    "prometheus_label_names",
    {
      title: "Prometheus Label Names",
      description: "Get all available label names",
      inputSchema: {
        ...paginationSchema
      }
    },
    async ({ limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const names = await prom.labelNames();
        const { items, pagination } = paginateArray(names as string[], offset, limit);
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(items, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting label names: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Label Values Tool
  server.registerTool(
    "prometheus_label_values",
    {
      title: "Prometheus Label Values",
      description: "Get all values for a specific label name",
      inputSchema: {
        labelName: z.string().describe("The label name to get values for (e.g., '__name__' for all metrics)"),
        ...paginationSchema
      }
    },
    async ({ labelName, limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const values = await prom.labelValues(labelName);
        const { items, pagination } = paginateArray(values as string[], offset, limit);
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(items, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting label values: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Instant Query Tool
  server.registerTool(
    "prometheus_instant_query",
    {
      title: "Prometheus Instant Query",
      description: "Execute an instant PromQL query",
      inputSchema: {
        query: z.string().describe("PromQL query string"),
        time: z.number().optional().describe("Unix timestamp for query evaluation (optional, defaults to now)"),
        ...paginationSchema
      }
    },
    async ({ query, time, limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const result = time !== undefined
          ? await prom.instantQuery(query, time)
          : await prom.instantQuery(query);

        // Only paginate vector/matrix results - scalar/string results are tuples, not arrays
        // Matrix can occur if user runs a range selector like 'up[5m]' in an instant query
        const typedResult = result as { resultType: string; result: unknown };
        if (typedResult.resultType === 'vector' || typedResult.resultType === 'matrix') {
          const { data, pagination } = paginateNestedArray(result as object, 'result', offset, limit);
          return {
            content: [
              {
                type: "text",
                text: formatPaginatedResponse(data, pagination)
              }
            ]
          };
        }

        // For scalar/string results, return as-is without pagination
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing instant query: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Range Query Tool
  server.registerTool(
    "prometheus_range_query",
    {
      title: "Prometheus Range Query",
      description: "Execute a range PromQL query",
      inputSchema: {
        query: z.string().describe("PromQL query string"),
        start: z.number().describe("Start time as Unix timestamp"),
        end: z.number().describe("End time as Unix timestamp"),
        step: z.string().describe("Query resolution step width (e.g., '5m', '1h')"),
        ...rangeQueryPaginationSchema
      }
    },
    async ({ query, start, end, step, limit = DEFAULT_LIMIT, offset = 0, valuesLimit = DEFAULT_VALUES_LIMIT }) => {
      try {
        const result = await prom.rangeQuery(query, start, end, step);
        const { data, pagination } = paginateRangeQuery(result, offset, limit, valuesLimit);
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(data, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing range query: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Series Tool
  server.registerTool(
    "prometheus_series",
    {
      title: "Prometheus Series",
      description: "Get time series that match a label matcher",
      inputSchema: {
        match: z.string().describe("Series selector (e.g., 'up', '{job=\"prometheus\"}')"),
        start: z.number().optional().describe("Start time as Unix timestamp (optional)"),
        end: z.number().optional().describe("End time as Unix timestamp (optional)"),
        ...paginationSchema
      }
    },
    async ({ match, start, end, limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const series = await prom.series(
          match,
          start || Date.now() - 3600000,
          end || Date.now()
        );
        const { items, pagination } = paginateArray(series as unknown[], offset, limit);
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(items, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting series: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // Register Alerts Tool
  server.registerTool(
    "prometheus_alerts",
    {
      title: "Prometheus Alerts",
      description: "Get active alerts from Prometheus",
      inputSchema: {
        ...paginationSchema
      }
    },
    async ({ limit = DEFAULT_LIMIT, offset = 0 }) => {
      try {
        const alerts = await prom.alerts();
        const { items, pagination } = paginateArray(alerts as unknown[], offset, limit);
        return {
          content: [
            {
              type: "text",
              text: formatPaginatedResponse(items, pagination)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting alerts: ${error}`
            }
          ],
          isError: true
        };
      }
    }
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);

