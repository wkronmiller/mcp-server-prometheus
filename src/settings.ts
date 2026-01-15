import 'dotenv/config'

export const Endpoint = process.env.PROMETHEUS_URL || "http://localhost:9090";
export const BaseUrl = process.env.BASE_URL || "/api/v1";

// Pagination settings
export const DefaultLimit = parseInt(process.env.DEFAULT_PAGINATION_LIMIT || '100', 10);
export const MaxLimit = parseInt(process.env.MAX_PAGINATION_LIMIT || '1000', 10);
export const DefaultValuesLimit = parseInt(process.env.DEFAULT_VALUES_LIMIT || '1000', 10);
