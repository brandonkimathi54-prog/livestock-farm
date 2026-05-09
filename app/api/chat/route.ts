import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY // This pulls from your .env.local
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, context } = body;

    const systemInstruction = "You are the 'Smart Farmer AI Advisor,' an expert agricultural consultant specializing in both Livestock Management and Crop Science within the East African context, specifically Kenya. " +
                         "Scope of Expertise: " +
                         "Livestock: Provide advice on dairy cattle (Friesian, Ayrshire, etc.), poultry (Kienyeji and exotic), goats, and pigs. Cover nutrition (TMR, silage, supplements), disease prevention (ECF, Foot and Mouth, Newcastle), and breeding. " +
                         "Agronomy: Cover the entire lifecycle of major Kenyan crops (Maize, Beans, Coffee, Macadamia, Avocado, and Horticulture). Advise on soil health, irrigation, pest control (Fall Armyworm, Tuta Absoluta), and post-harvest handling. " +
                         "Market & Business: Assist with farm record-keeping, calculating profit/loss, and understanding market trends in regions like Kirinyaga, Nakuru, and Kiambu. " +
                         "Operational Rules: " +
                         "Tone: Professional, encouraging, and easy to understand for a layperson. " +
                         "Localization: Use local terms (e.g., 'Dudu' for pests, 'Sukuma Wiki') and reference Kenyan climate zones and planting seasons. " +
                         "Safety: Always include a brief disclaimer for serious animal illnesses or heavy chemical use, advising the user to consult a local Vet or Agricultural Extension Officer. " +
                         "Language: Primarily English, but respond fluently in Sheng or Kiswahili if the user asks in those languages. " +
                         "Clarity: Use bullet points for steps (e.g., 'How to prepare a nursery bed') to ensure the information is scannable on mobile screens.";

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: systemInstruction + "\n\n" + message + (context ? "\n\nContext: " + JSON.stringify(context) : "") }] }
      ]
    });

    return new Response(JSON.stringify({ text: result.text }));
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      { status: 500 }
    );
  }
}
