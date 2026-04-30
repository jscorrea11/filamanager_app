import { getStore } from "@netlify/blobs";

// Netlify Functions v2 — GET all filaments
export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const store = getStore({ name: "filaments", consistency: "strong" });
    const { blobs } = await store.list();

    const filaments = await Promise.all(
      blobs.map((blob) => store.get(blob.key, { type: "json" }))
    );

    // Filter nulls and sort by createdAt desc
    const sorted = filaments
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json({ success: true, data: sorted }, { headers: corsHeaders() });
  } catch (error) {
    console.error("filaments-get error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
};

export const config = { path: "/api/filaments-get" };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}
