
import { GoogleGenAI, Type } from "@google/genai";
import { SkinVisionResult, SensitivityLevel } from "../types";

const SYSTEM_INSTRUCTION = `
You are an Elite AI Vision + Dermatological Analysis Engine (Skin Vision AI).
Your task is to perform an deep-level analysis of real facial images. 

🔹 ANALYSIS PROTOCOL:
1. VALIDATION: Detect clear facial selfie.
2. SENSITIVITY MODERATION: Adhere to the user's requested sensitivity level (Gentle, Balanced, or Intensive). 
3. ROUTINE: Exactly 2 steps for Morning, 2 for Night. Category-based only.
4. ZERO-WASTE DIY: Exactly 2 remedies. 
   - CRITICAL: Use a maximum of 3 ingredients per recipe.
   - INGREDIENTS: Use only common household staples (Honey, Yogurt, Oatmeal, Turmeric, Coffee, Aloe, etc.).
   - FOCUS: Practicality and zero-waste. Avoid complex or expensive ingredients that might be discarded.
5. SCORING: Provide a Skin Score (0-100).

🔹 OUTPUT FORMAT:
Return ONLY a JSON object matching the requested schema.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_valid_face: { type: Type.BOOLEAN },
    validation_error: { type: Type.STRING },
    skin_analysis: {
      type: Type.OBJECT,
      properties: {
        skin_type: { type: Type.STRING },
        skin_score: { type: Type.NUMBER },
        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING },
        texture: { type: Type.STRING },
        pores: { type: Type.STRING },
        acne: { type: Type.STRING },
        pigmentation: { type: Type.STRING },
        oiliness: { type: Type.STRING },
        redness: { type: Type.STRING }
      },
      required: ["skin_type", "skin_score", "concerns", "summary"]
    },
    product_routine: {
      type: Type.OBJECT,
      properties: {
        morning: { 
          type: Type.ARRAY, 
          items: { type: Type.OBJECT, properties: { step: { type: Type.STRING }, type: { type: Type.STRING }, how_to_use: { type: Type.STRING } } }
        },
        night: { 
          type: Type.ARRAY, 
          items: { type: Type.OBJECT, properties: { step: { type: Type.STRING }, type: { type: Type.STRING }, how_to_use: { type: Type.STRING } } }
        }
      }
    },
    homemade_skincare: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          purpose: { type: Type.STRING },
          recipe_name: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          how_to_make: { type: Type.ARRAY, items: { type: Type.STRING } },
          how_to_apply: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    safety_notice: { type: Type.STRING },
    comparison_note: { type: Type.STRING }
  },
  required: ["is_valid_face"]
};

export async function analyzeSkin(
  imageDataBase64: string, 
  previousScore?: number,
  sensitivity: SensitivityLevel = 'Balanced'
): Promise<SkinVisionResult & { is_valid_face: boolean; validation_error?: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Perform ultra-fast bio-mapping. 
  SENSITIVITY LEVEL: ${sensitivity}. 
  ${previousScore ? `PREVIOUS SCORE: ${previousScore}.` : ''} 
  Provide exactly 2 routine steps per time and 2 minimalist DIY remedies (max 3 ingredients each). Return JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageDataBase64 } }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (e: any) {
    console.error("Analysis Error:", e);
    throw e;
  }
}
