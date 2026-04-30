import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

// PUT - Update a filament by ID
export const handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "PUT") {
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

    const body = JSON.parse(event.body);

    const updated = {
      ...existing,
      barcode: body.barcode ?? existing.barcode,
      brand: body.brand ?? existing.brand,
      material: body.material ?? existing.material,
      color: body.color ?? existing.color,
      colorHex: body.colorHex ?? existing.colorHex,
      weightTotal: body.weightTotal !== undefined ? Number(body.weightTotal) : existing.weightTotal,
      weightRemaining: body.weightRemaining !== undefined ? Number(body.weightRemaining) : existing.weightRemaining,
      diameter: body.diameter !== undefined ? Number(body.diameter) : existing.diameter,
      printTempMin: body.printTempMin !== undefined ? Number(body.printTempMin) : existing.printTempMin,
      printTempMax: body.printTempMax !== undefined ? Number(body.printTempMax) : existing.printTempMax,
      bedTempMin: body.bedTempMin !== undefined ? Number(body.bedTempMin) : existing.bedTempMin,
      bedTempMax: body.bedTempMax !== undefined ? Number(body.bedTempMax) : existing.bedTempMax,
      purchaseDate: body.purchaseDate ?? existing.purchaseDate,
      openedDate: body.openedDate ?? existing.openedDate,
      storageLocation: body.storageLocation ?? existing.storageLocation,
      dryingRequired: body.dryingRequired !== undefined ? Boolean(body.dryingRequired) : existing.dryingRequired,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      notes: body.notes ?? existing.notes,
      status: body.status ?? existing.status,
      updatedAt: new Date().toISOString()
    };

    await store.setJSON(id, updated);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: updated })
    };
  } catch (error) {
    console.error("Error updating filament:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
