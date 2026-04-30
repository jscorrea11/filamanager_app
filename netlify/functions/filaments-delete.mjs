import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

// DELETE - Remove a filament by ID
export const handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: "Method not allowed" })
    };
  }

  try {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: "ID is required" })
      };
    }

    const store = getStore({ name: "filaments", consistency: "strong" });
    const existing = await store.get(id, { type: "json" });

    if (!existing) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: "Filament not found" })
      };
    }

    await store.delete(id);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: "Filament deleted successfully" })
    };
  } catch (error) {
    console.error("Error deleting filament:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
