import { GoogleGenAI } from "@google/genai";
import * as z from "zod";

const plantJSONschema = {
  type: "object",
  properties: {
    plant_name: { type: "string", description: "Name of Plant" },
    scientific_name: { type: "string", description: "Scientific name of Plant" },
    basicInformation: {
      type: "array",
      items: { type: "string" },
      description: "Basic information about the plant."
    },
    IsNative: { type: "boolean", description: "Is the plant native to the region?" },
    ConservationStatus: { type: "string", description: "Conservation status of the plant." },
    Habitat: { type: "string", description: "Habitat of the plant." },
    Uses: { type: "array", items: { type: "string" }, description: "Uses of the plant." },
    GrowthRate: { type: "string", description: "Growth rate of the plant." },
    ThreeFunFacts: {
      type: "array",
      items: { type: "string" },
      description: "Three fun facts about the plant."
    }
  },
  required: [
    "plant_name",
    "scientific_name",
    "basicInformation",
    "IsNative",
    "ConservationStatus",
    "Habitat",
    "Uses",
    "GrowthRate",
    "ThreeFunFacts"
  ]
};

const plantSchema = z.fromJSONSchema(plantJSONschema);

export async function getGeminiPlantInfo(plantName) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY in your Expo environment.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Give me information about ${plantName}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: plantJSONschema,
    },
  });

  const responseText = interaction.text || "{}";
  const plant = plantSchema.parse(JSON.parse(responseText));
  return plant;
}