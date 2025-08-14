import 'dotenv/config'

export const Endpoint = process.env.PROXY_ENDPOINT || "http://localhost:3000";
export const BaseUrl = process.env.BASE_URL || "/api/v1";
