import { z } from 'zod';
import { DefaultLimit, MaxLimit, DefaultValuesLimit } from './settings.js';

// Configuration defaults (from environment or fallback)
export const DEFAULT_LIMIT = DefaultLimit;
export const MAX_LIMIT = MaxLimit;
export const DEFAULT_VALUES_LIMIT = DefaultValuesLimit;

// Zod schema for pagination params
export const paginationSchema = {
  limit: z.number().positive().max(MAX_LIMIT).optional()
    .describe(`Maximum results to return (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})`),
  offset: z.number().nonnegative().optional()
    .describe("Number of results to skip (default: 0)")
};

// Extended schema for range queries
export const rangeQueryPaginationSchema = {
  ...paginationSchema,
  valuesLimit: z.number().positive().optional()
    .describe(`Maximum data points per series (default: ${DEFAULT_VALUES_LIMIT})`)
};

// Pagination metadata interface
export interface PaginationMeta {
  offset: number;
  limit: number;
  returned: number;
  total: number;
  hasMore: boolean;
}

// Multi-array pagination metadata
export interface MultiArrayPaginationMeta {
  [key: string]: PaginationMeta;
}

// Range query pagination metadata
export interface RangeQueryPaginationMeta extends PaginationMeta {
  valuesLimitApplied: number;
  valuesTruncatedCount: number;
}

// Paginate a simple array
export function paginateArray<T>(
  array: T[],
  offset: number = 0,
  limit: number = DEFAULT_LIMIT
): { items: T[]; pagination: PaginationMeta } {
  const total = array.length;
  const effectiveOffset = Math.min(offset, total);
  const effectiveLimit = Math.min(limit, MAX_LIMIT);

  const items = array.slice(effectiveOffset, effectiveOffset + effectiveLimit);
  const returned = items.length;
  const hasMore = effectiveOffset + returned < total;

  return {
    items,
    pagination: {
      offset: effectiveOffset,
      limit: effectiveLimit,
      returned,
      total,
      hasMore
    }
  };
}

// Get nested value from object using dot-separated path
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// Set nested value in object using dot-separated path
function setNestedValue<T extends object>(obj: T, path: string, value: unknown): T {
  const result = JSON.parse(JSON.stringify(obj)) as T;
  const parts = path.split('.');
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;

  return result;
}

// Paginate nested data structure with path specification
export function paginateNestedArray<T extends object>(
  data: T,
  path: string,
  offset: number = 0,
  limit: number = DEFAULT_LIMIT
): { data: T; pagination: PaginationMeta } {
  const nested = getNestedValue(data, path);

  if (!Array.isArray(nested)) {
    // Return as-is if target is not an array
    return {
      data,
      pagination: {
        offset: 0,
        limit,
        returned: 0,
        total: 0,
        hasMore: false
      }
    };
  }

  const { items, pagination } = paginateArray(nested, offset, limit);
  const result = setNestedValue(data, path, items);

  return { data: result, pagination };
}

// Handle multiple arrays (for prometheus_targets)
export function paginateMultipleArrays<T extends object>(
  data: T,
  paths: { [key: string]: string },
  offset: number = 0,
  limit: number = DEFAULT_LIMIT
): { data: T; pagination: MultiArrayPaginationMeta } {
  let result = JSON.parse(JSON.stringify(data)) as T;
  const pagination: MultiArrayPaginationMeta = {};

  for (const [key, path] of Object.entries(paths)) {
    const paginatedResult = paginateNestedArray(result, path, offset, limit);
    result = paginatedResult.data;
    pagination[key] = paginatedResult.pagination;
  }

  return { data: result, pagination };
}

// Paginate range query results (with values truncation)
export function paginateRangeQuery(
  data: unknown,
  offset: number = 0,
  limit: number = DEFAULT_LIMIT,
  valuesLimit: number = DEFAULT_VALUES_LIMIT
): { data: unknown; pagination: RangeQueryPaginationMeta } {
  // First paginate the result array
  const { data: paginatedData, pagination } = paginateNestedArray(
    data as object,
    'result',
    offset,
    limit
  );

  // Then truncate values within each result
  let valuesTruncatedCount = 0;
  const typedData = paginatedData as { result?: Array<{ values?: unknown[] }> };

  if (typedData?.result) {
    for (const series of typedData.result) {
      if (series.values && series.values.length > valuesLimit) {
        valuesTruncatedCount++;
        series.values = series.values.slice(0, valuesLimit);
      }
    }
  }

  return {
    data: paginatedData,
    pagination: {
      ...pagination,
      valuesLimitApplied: valuesLimit,
      valuesTruncatedCount
    }
  };
}

// Format final response with pagination metadata
export function formatPaginatedResponse<T>(
  data: T,
  pagination: PaginationMeta | MultiArrayPaginationMeta | RangeQueryPaginationMeta
): string {
  return JSON.stringify({ data, pagination }, null, 2);
}
