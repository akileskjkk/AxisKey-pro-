
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Detects common mobile game HUD elements from a base64 encoded image.
 * Uses Gemini 3 Flash for efficient image analysis and structured JSON output.
 */
export const detectGameHUD = async (imageBase64: string) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this mobile game HUD screenshot. Identify exactly where the key controls are located. 
  Categories:
  - FIRE: Shoot button
  - WASD: Movement joystick
  - AIM: Scope/Aim button
  - JUMP: Jump button
  - RELOAD: Reload button
  
  Return coordinates (x, y) as percentages (0-100) based on the image dimensions.
  Output ONLY a valid JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64.split(',')[1]
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "One of: FIRE, WASD, AIM, JUMP, RELOAD" },
              x: { type: Type.NUMBER, description: "X coordinate percentage (0-100)" },
              y: { type: Type.NUMBER, description: "Y coordinate percentage (0-100)" },
              label: { type: Type.STRING }
            },
            required: ["type", "x", "y"],
            propertyOrdering: ["type", "x", "y", "label"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    // Enhanced sanitization for various potential markdown outputs
    const jsonMatch = text.match(/\[.*\]/s);
    const sanitizedText = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, "").trim();
    
    return JSON.parse(sanitizedText);
  } catch (error) {
    console.error("Gemini Detection Error:", error);
    return null;
  }
};
