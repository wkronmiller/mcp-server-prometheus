# Prometheus MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Prometheus monitoring systems.

## Features

This MCP server implements all major Prometheus API operations as tools:

- **`prometheus_status`** - Get Prometheus server status and configuration
- **`prometheus_targets`** - Get targets (active, dropped, or any)
- **`prometheus_label_names`** - Get all available label names
- **`prometheus_label_values`** - Get values for a specific label
- **`prometheus_instant_query`** - Execute instant PromQL queries
- **`prometheus_range_query`** - Execute range PromQL queries
- **`prometheus_series`** - Get time series matching label selectors
- **`prometheus_alerts`** - Get active alerts

## Installation

```bash
npm install
npm run build
```

## Configuration

Set the Prometheus server URL using environment variables:

```bash
export PROMETHEUS_URL=http://localhost:9090

# Optional: Custom API base path (defaults to /api/v1)
export BASE_URL=/api/v1
```

Or create a `.env` file:

```env
PROMETHEUS_URL=http://localhost:9090
```

## Development

The project uses:
- **TypeScript** for type safety
- **Vitest** for testing
- **Zod** for input validation
- **prometheus-query** for Prometheus API interaction

## License

MIT
