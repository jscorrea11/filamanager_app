import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

// POST - Create a new filament
export const handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: "Method not allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body);

    const filament = {
      id: randomUUID(),
      barcode: body.barcode || "",
      brand: body.brand || "Desconocido",
      material: body.material || "PLA",
      color: body.color || "Natural",
      colorHex: body.colorHex || "#FFFFFF",
      weightTotal: Number(body.weightTotal) || 1000,
      weightRemaining: Number(body.weightRemaining) || 1000,
      diameter: Number(body.diameter) || 1.75,
      printTempMin: Number(body.printTempMin) || 190,
      printTempMax: Number(body.printTempMax) || 220,
      bedTempMin: Number(body.bedTempMin) || 50,
      bedTempMax: Number(body.bedTempMax) || 60,
      purchaseDate: body.purchaseDate || "",
      openedDate: body.openedDate || "",
      storageLocation: body.storageLocation || "",
      dryingRequired: Boolean(body.dryingRequired),
      price: Number(body.price) || 0,
      notes: body.notes || "",
      status: body.status || "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const store = getStore({ name: "filaments", consistency: "strong" });
    await store.setJSON(filament.id, filament);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: filament })
    };
  } catch (error) {
    console.error("Error creating filament:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
