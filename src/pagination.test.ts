import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_VALUES_LIMIT,
  paginateArray,
  paginateNestedArray,
  paginateMultipleArrays,
  paginateRangeQuery,
  formatPaginatedResponse
} from './pagination.js';

describe('paginateArray', () => {
  it('should paginate a simple array with default values', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { items: result, pagination } = paginateArray(items);

    expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(pagination.offset).toBe(0);
    expect(pagination.limit).toBe(DEFAULT_LIMIT);
    expect(pagination.returned).toBe(5);
    expect(pagination.total).toBe(5);
    expect(pagination.hasMore).toBe(false);
  });

  it('should respect limit parameter', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { items: result, pagination } = paginateArray(items, 0, 2);

    expect(result).toEqual(['a', 'b']);
    expect(pagination.offset).toBe(0);
    expect(pagination.limit).toBe(2);
    expect(pagination.returned).toBe(2);
    expect(pagination.total).toBe(5);
    expect(pagination.hasMore).toBe(true);
  });

  it('should respect offset parameter', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { items: result, pagination } = paginateArray(items, 2, 2);

    expect(result).toEqual(['c', 'd']);
    expect(pagination.offset).toBe(2);
    expect(pagination.limit).toBe(2);
    expect(pagination.returned).toBe(2);
    expect(pagination.total).toBe(5);
    expect(pagination.hasMore).toBe(true);
  });

  it('should handle offset at end of array', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { items: result, pagination } = paginateArray(items, 4, 2);

    expect(result).toEqual(['e']);
    expect(pagination.offset).toBe(4);
    expect(pagination.returned).toBe(1);
    expect(pagination.hasMore).toBe(false);
  });

  it('should handle offset beyond array length', () => {
    const items = ['a', 'b', 'c'];
    const { items: result, pagination } = paginateArray(items, 10, 2);

    expect(result).toEqual([]);
    expect(pagination.offset).toBe(3); // Capped to array length
    expect(pagination.returned).toBe(0);
    expect(pagination.hasMore).toBe(false);
  });

  it('should handle empty array', () => {
    const items: string[] = [];
    const { items: result, pagination } = paginateArray(items);

    expect(result).toEqual([]);
    expect(pagination.total).toBe(0);
    expect(pagination.returned).toBe(0);
    expect(pagination.hasMore).toBe(false);
  });

  it('should cap limit at MAX_LIMIT', () => {
    const items = Array.from({ length: 2000 }, (_, i) => i);
    const { pagination } = paginateArray(items, 0, 5000);

    expect(pagination.limit).toBe(MAX_LIMIT);
    expect(pagination.returned).toBe(MAX_LIMIT);
  });
});

describe('paginateNestedArray', () => {
  it('should paginate nested array at simple path', () => {
    const data = {
      status: 'success',
      data: ['a', 'b', 'c', 'd', 'e']
    };
    const { data: result, pagination } = paginateNestedArray(data, 'data', 0, 2);

    expect(result.data).toEqual(['a', 'b']);
    expect(pagination.total).toBe(5);
    expect(pagination.returned).toBe(2);
    expect(pagination.hasMore).toBe(true);
  });

  it('should paginate nested array at deep path', () => {
    const data = {
      status: 'success',
      data: {
        result: [1, 2, 3, 4, 5]
      }
    };
    const { data: result, pagination } = paginateNestedArray(data, 'data.result', 1, 2);

    expect(result.data.result).toEqual([2, 3]);
    expect(pagination.offset).toBe(1);
    expect(pagination.total).toBe(5);
    expect(pagination.hasMore).toBe(true);
  });

  it('should return original data if path does not lead to array', () => {
    const data = {
      status: 'success',
      data: 'not an array'
    };
    const { data: result, pagination } = paginateNestedArray(data, 'data', 0, 10);

    expect(result).toEqual(data);
    expect(pagination.total).toBe(0);
    expect(pagination.returned).toBe(0);
  });

  it('should return original data if path does not exist', () => {
    const data = { status: 'success' };
    const { data: result, pagination } = paginateNestedArray(data, 'nonexistent.path', 0, 10);

    expect(result).toEqual(data);
    expect(pagination.total).toBe(0);
  });
});

describe('paginateMultipleArrays', () => {
  it('should paginate multiple arrays independently', () => {
    const data = {
      status: 'success',
      data: {
        activeTargets: ['a1', 'a2', 'a3', 'a4', 'a5'],
        droppedTargets: ['d1', 'd2', 'd3']
      }
    };

    const { data: result, pagination } = paginateMultipleArrays(
      data,
      {
        activeTargets: 'data.activeTargets',
        droppedTargets: 'data.droppedTargets'
      },
      0,
      2
    );

    expect(result.data.activeTargets).toEqual(['a1', 'a2']);
    expect(result.data.droppedTargets).toEqual(['d1', 'd2']);
    expect(pagination.activeTargets.total).toBe(5);
    expect(pagination.activeTargets.hasMore).toBe(true);
    expect(pagination.droppedTargets.total).toBe(3);
    expect(pagination.droppedTargets.hasMore).toBe(true);
  });

  it('should handle offset across multiple arrays', () => {
    const data = {
      status: 'success',
      data: {
        activeTargets: ['a1', 'a2', 'a3'],
        droppedTargets: ['d1']
      }
    };

    const { data: result, pagination } = paginateMultipleArrays(
      data,
      {
        activeTargets: 'data.activeTargets',
        droppedTargets: 'data.droppedTargets'
      },
      2,
      10
    );

    expect(result.data.activeTargets).toEqual(['a3']);
    expect(result.data.droppedTargets).toEqual([]);
    expect(pagination.activeTargets.returned).toBe(1);
    expect(pagination.droppedTargets.returned).toBe(0);
  });
});

describe('paginateRangeQuery', () => {
  it('should paginate result array and truncate values', () => {
    // prometheus-query returns {resultType, result} directly
    const data = {
      resultType: 'matrix',
      result: [
        { metric: { name: 'a' }, values: [[1, '1'], [2, '2'], [3, '3']] },
        { metric: { name: 'b' }, values: [[1, '1'], [2, '2']] }
      ]
    };

    const { data: result, pagination } = paginateRangeQuery(data, 0, 10, 2);

    expect((result as any).result[0].values).toEqual([[1, '1'], [2, '2']]);
    expect((result as any).result[1].values).toEqual([[1, '1'], [2, '2']]);
    expect(pagination.valuesLimitApplied).toBe(2);
    expect(pagination.valuesTruncatedCount).toBe(1); // Only first series was truncated
  });

  it('should paginate result array with limit', () => {
    const data = {
      resultType: 'matrix',
      result: [
        { metric: { name: 'a' }, values: [[1, '1']] },
        { metric: { name: 'b' }, values: [[1, '1']] },
        { metric: { name: 'c' }, values: [[1, '1']] }
      ]
    };

    const { data: result, pagination } = paginateRangeQuery(data, 0, 2, 1000);

    expect((result as any).result.length).toBe(2);
    expect(pagination.returned).toBe(2);
    expect(pagination.total).toBe(3);
    expect(pagination.hasMore).toBe(true);
  });

  it('should handle empty result', () => {
    const data = {
      resultType: 'matrix',
      result: []
    };

    const { pagination } = paginateRangeQuery(data, 0, 10, 1000);

    expect(pagination.total).toBe(0);
    expect(pagination.valuesTruncatedCount).toBe(0);
  });
});

describe('formatPaginatedResponse', () => {
  it('should format response with data and pagination', () => {
    const data = { status: 'success', items: [1, 2, 3] };
    const pagination = {
      offset: 0,
      limit: 10,
      returned: 3,
      total: 3,
      hasMore: false
    };

    const result = formatPaginatedResponse(data, pagination);
    const parsed = JSON.parse(result);

    expect(parsed.data).toEqual(data);
    expect(parsed.pagination).toEqual(pagination);
  });
});

describe('constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_LIMIT).toBe(100);
    expect(MAX_LIMIT).toBe(1000);
    expect(DEFAULT_VALUES_LIMIT).toBe(1000);
  });
});
