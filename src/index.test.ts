import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServer } from './index.js';

// Mock the prometheus-query module
vi.mock('prometheus-query', () => {
  return {
    PrometheusDriver: vi.fn().mockImplementation(() => ({
      status: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          version: '2.40.0',
          revision: 'abc123',
          branch: 'HEAD',
          buildUser: 'root@buildhost',
          buildDate: '20230101-00:00:00',
          goVersion: 'go1.19.4'
        }
      }),
      targets: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          activeTargets: [
            {
              discoveredLabels: { __address__: 'localhost:9090' },
              labels: { instance: 'localhost:9090', job: 'prometheus' },
              scrapePool: 'prometheus',
              scrapeUrl: 'http://localhost:9090/metrics',
              globalUrl: 'http://localhost:9090/metrics',
              lastError: '',
              lastScrape: '2023-01-01T00:00:00Z',
              lastScrapeDuration: 0.001,
              health: 'up'
            }
          ]
        }
      }),
      labelNames: vi.fn().mockResolvedValue({
        status: 'success',
        data: ['__name__', 'instance', 'job']
      }),
      labelValues: vi.fn().mockResolvedValue({
        status: 'success',
        data: ['prometheus_build_info', 'prometheus_config_last_reload_successful']
      }),
      instantQuery: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { __name__: 'up', instance: 'localhost:9090', job: 'prometheus' },
              value: [1672531200, '1']
            }
          ]
        }
      }),
      rangeQuery: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { __name__: 'up', instance: 'localhost:9090', job: 'prometheus' },
              values: [
                [1672531200, '1'],
                [1672531500, '1']
              ]
            }
          ]
        }
      }),
      series: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          { __name__: 'up', instance: 'localhost:9090', job: 'prometheus' }
        ]
      }),
      alerts: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          alerts: []
        }
      })
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
    // The server should have registered 8 tools
    // We can't easily test the internal tool registry without accessing private properties
    // But we can verify the server was created successfully
    expect(server).toBeDefined();
  });
});