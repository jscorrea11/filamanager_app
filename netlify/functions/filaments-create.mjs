import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

// Netlify Functions v2 — POST create filament
export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const body = await req.json();

    const filament = {
      id: randomUUID(),
      barcode:         body.barcode         || "",
      brand:           body.brand           || "Desconocido",
      material:        body.material        || "PLA",
      color:           body.color           || "Natural",
      colorHex:        body.colorHex        || "#FFFFFF",
      weightTotal:     Number(body.weightTotal)     || 1000,
      weightRemaining: Number(body.weightRemaining) || 1000,
      diameter:        Number(body.diameter)        || 1.75,
      printTempMin:    Number(body.printTempMin)    || 190,
      printTempMax:    Number(body.printTempMax)    || 220,
      bedTempMin:      Number(body.bedTempMin)      || 50,
      bedTempMax:      Number(body.bedTempMax)      || 60,
      purchaseDate:    body.purchaseDate    || "",
      openedDate:      body.openedDate      || "",
      storageLocation: body.storageLocation || "",
      dryingRequired:  Boolean(body.dryingRequired),
      price:           Number(body.price)           || 0,
      notes:           body.notes           || "",
      status:          body.status          || "new",
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    };

    const store = getStore({ name: "filaments", consistency: "strong" });
    await store.setJSON(filament.id, filament);

    return Response.json(
      { success: true, data: filament },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("filaments-create error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
};

export const config = { path: "/api/filaments-create" };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}
