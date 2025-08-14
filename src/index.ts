#!/usr/bin/env node

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrometheusDriver } from 'prometheus-query';
import { Endpoint, BaseUrl } from './settings.js';

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
        state: z.string().optional().describe("Target state: 'active', 'dropped', or 'any'")
      }
    },
    async ({ state = 'active' }) => {
      try {
        const targets = await prom.targets(state as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(targets, null, 2)
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
      inputSchema: {}
    },
    async () => {
      try {
        const names = await prom.labelNames();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(names, null, 2)
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
        labelName: z.string().describe("The label name to get values for (e.g., '__name__' for all metrics)")
      }
    },
    async ({ labelName }) => {
      try {
        const values = await prom.labelValues(labelName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(values, null, 2)
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
        time: z.number().optional().describe("Unix timestamp for query evaluation (optional, defaults to now)")
      }
    },
    async ({ query, time }) => {
      try {
        const result = time !== undefined 
          ? await prom.instantQuery(query, time)
          : await prom.instantQuery(query);
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
        step: z.string().describe("Query resolution step width (e.g., '5m', '1h')")
      }
    },
    async ({ query, start, end, step }) => {
      try {
        const result = await prom.rangeQuery(query, start, end, step);
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
        end: z.number().optional().describe("End time as Unix timestamp (optional)")
      }
    },
    async ({ match, start, end }) => {
      try {
        const series = await prom.series(
          match, 
          start || Date.now() - 3600000, 
          end || Date.now()
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(series, null, 2)
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
      inputSchema: {}
    },
    async () => {
      try {
        const alerts = await prom.alerts();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(alerts, null, 2)
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

