import 'dotenv/config'

export const Endpoint = process.env.PROMETHEUS_URL || "http://localhost:9090";
export const BaseUrl = process.env.BASE_URL || "/api/v1";
