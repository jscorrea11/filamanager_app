import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

// GET all filaments
export const handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const store = getStore({ name: "filaments", consistency: "strong" });
    const { blobs } = await store.list();

    const filaments = await Promise.all(
      blobs.map(async (blob) => {
        const data = await store.get(blob.key, { type: "json" });
        return data;
      })
    );

    // Sort by createdAt descending
    filaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: filaments })
    };
  } catch (error) {
    console.error("Error fetching filaments:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
