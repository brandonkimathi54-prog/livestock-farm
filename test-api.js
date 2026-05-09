import { GoogleGenAI } from "@google/genai"; //

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY 
});

async function askAdvisor(userQuestion) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // The stable 2026 Flash model
      systemInstruction: "You are a professional Kenyan Agricultural Officer...", 
      contents: [{ role: "user", parts: [{ text: userQuestion }] }]
    });

    console.log("Advisor says:", response.text);
  } catch (error) {
    console.error("❌ Connection Error:", error.message);
  }
}

askAdvisor("What are the symptoms of East Coast Fever?");
