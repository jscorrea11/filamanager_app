// Shared utilities for Netlify Functions
import { getStore } from "@netlify/blobs";

export function getFilamentsStore(context) {
  return getStore({
    name: "filaments",
    consistency: "strong",
    ...context
  });
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json"
  };
}

export function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body)
  };
}
