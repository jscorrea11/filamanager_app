import { getStore } from "@netlify/blobs";

// Netlify Functions v2 — DELETE filament by ?id=
export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json(
        { success: false, error: "Param 'id' is required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const store = getStore({ name: "filaments", consistency: "strong" });
    const existing = await store.get(id, { type: "json" });

    if (!existing) {
      return Response.json(
        { success: false, error: "Filament not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    await store.delete(id);

    return Response.json(
      { success: true, message: "Filament deleted successfully" },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("filaments-delete error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
};

export const config = { path: "/api/filaments-delete" };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}
