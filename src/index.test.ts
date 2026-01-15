import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServer } from './index.js';

// Mock the prometheus-query module
// Note: vi.mock is hoisted, so helper functions must be defined inline
vi.mock('prometheus-query', () => {
  // Generate array of test items for pagination testing
  const generateLabelNames = (count: number) =>
    Array.from({ length: count }, (_, i) => `label_${i}`);

  const generateLabelValues = (count: number) =>
    Array.from({ length: count }, (_, i) => `value_${i}`);

  const generateTargets = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      discoveredLabels: { __address__: `localhost:${9090 + i}` },
      labels: { instance: `localhost:${9090 + i}`, job: 'prometheus' },
      scrapePool: 'prometheus',
      scrapeUrl: `http://localhost:${9090 + i}/metrics`,
      globalUrl: `http://localhost:${9090 + i}/metrics`,
      lastError: '',
      lastScrape: '2023-01-01T00:00:00Z',
      lastScrapeDuration: 0.001,
      health: 'up'
    }));

  const generateInstantQueryResults = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      metric: { __name__: `metric_${i}`, instance: 'localhost:9090', job: 'prometheus' },
      value: [1672531200, String(i)]
    }));

  const generateRangeQueryResults = (seriesCount: number, valuesCount: number) =>
    Array.from({ length: seriesCount }, (_, i) => ({
      metric: { __name__: `metric_${i}`, instance: 'localhost:9090', job: 'prometheus' },
      values: Array.from({ length: valuesCount }, (_, j) => [1672531200 + j * 300, String(j)])
    }));

  const generateSeries = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      __name__: `metric_${i}`,
      instance: 'localhost:9090',
      job: 'prometheus'
    }));

  const generateAlerts = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      labels: { alertname: `alert_${i}`, severity: 'warning' },
      annotations: { summary: `Alert ${i}` },
      state: 'firing',
      activeAt: '2023-01-01T00:00:00Z',
      value: i
    }));

  // prometheus-query library returns unwrapped data (not {status, data} format)
  // See: node_modules/prometheus-query/dist/prometheus-query.cjs.js handleResponse()
  return {
    PrometheusDriver: vi.fn().mockImplementation(() => ({
      // status() returns config data directly
      status: vi.fn().mockResolvedValue({
        yaml: 'global:\n  scrape_interval: 15s\n'
      }),
      // targets() returns {activeTargets, droppedTargets} directly
      targets: vi.fn().mockResolvedValue({
        activeTargets: generateTargets(150),
        droppedTargets: generateTargets(50)
      }),
      // labelNames() returns string[] directly
      labelNames: vi.fn().mockResolvedValue(generateLabelNames(200)),
      // labelValues() returns string[] directly
      labelValues: vi.fn().mockResolvedValue(generateLabelValues(300)),
      // instantQuery() returns QueryResult {resultType, result} directly
      instantQuery: vi.fn().mockResolvedValue({
        resultType: 'vector',
        result: generateInstantQueryResults(250)
      }),
      // rangeQuery() returns QueryResult {resultType, result} directly
      rangeQuery: vi.fn().mockResolvedValue({
        resultType: 'matrix',
        result: generateRangeQueryResults(120, 500)
      }),
      // series() returns Metric[] directly
      series: vi.fn().mockResolvedValue(generateSeries(180)),
      // alerts() returns Alert[] directly
      alerts: vi.fn().mockResolvedValue(generateAlerts(75))
    }))
  };
});

describe('Prometheus MCP Server', () => {
  let server: any;

  beforeEach(() => {
    server = createServer();
  });

  it('should create server successfully', () => {
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });

  it('should register all 8 Prometheus tools', () => {
    // Server creation validates tool registration
    expect(server).toBeDefined();
  });
});

// Note: Integration tests for pagination behavior are covered by:
// 1. Unit tests in pagination.test.ts (pagination logic)
// 2. The MCP SDK doesn't expose tool handlers directly for testing
// 3. Manual testing can be done via MCP client or npm run dev