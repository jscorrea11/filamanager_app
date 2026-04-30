import { getStore } from "@netlify/blobs";

// Netlify Functions v2 — PUT update filament by ?id=
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

    const body = await req.json();

    const updated = {
      ...existing,
      barcode:         body.barcode         ?? existing.barcode,
      brand:           body.brand           ?? existing.brand,
      material:        body.material        ?? existing.material,
      color:           body.color           ?? existing.color,
      colorHex:        body.colorHex        ?? existing.colorHex,
      weightTotal:     body.weightTotal     !== undefined ? Number(body.weightTotal)     : existing.weightTotal,
      weightRemaining: body.weightRemaining !== undefined ? Number(body.weightRemaining) : existing.weightRemaining,
      diameter:        body.diameter        !== undefined ? Number(body.diameter)        : existing.diameter,
      printTempMin:    body.printTempMin    !== undefined ? Number(body.printTempMin)    : existing.printTempMin,
      printTempMax:    body.printTempMax    !== undefined ? Number(body.printTempMax)    : existing.printTempMax,
      bedTempMin:      body.bedTempMin      !== undefined ? Number(body.bedTempMin)      : existing.bedTempMin,
      bedTempMax:      body.bedTempMax      !== undefined ? Number(body.bedTempMax)      : existing.bedTempMax,
      purchaseDate:    body.purchaseDate    ?? existing.purchaseDate,
      openedDate:      body.openedDate      ?? existing.openedDate,
      storageLocation: body.storageLocation ?? existing.storageLocation,
      dryingRequired:  body.dryingRequired  !== undefined ? Boolean(body.dryingRequired) : existing.dryingRequired,
      price:           body.price           !== undefined ? Number(body.price)           : existing.price,
      notes:           body.notes           ?? existing.notes,
      status:          body.status          ?? existing.status,
      updatedAt:       new Date().toISOString(),
    };

    await store.setJSON(id, updated);

    return Response.json(
      { success: true, data: updated },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("filaments-update error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
};

export const config = { path: "/api/filaments-update" };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}
