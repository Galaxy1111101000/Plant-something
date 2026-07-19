import { getGeminiPlantInfo } from "../lib/gemini";

export async function getChatbotResponse(plantName: string) {
  console.log("[Chatbot prompt]", plantName);

  const reply = await getGeminiPlantInfo(plantName);

  console.log("[Chatbot reply]", reply);
  return reply;
}
