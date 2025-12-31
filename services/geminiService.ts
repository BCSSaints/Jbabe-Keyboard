
import { GoogleGenAI, Type } from "@google/genai";
import { SynthSettings } from "../types";

// Safety: Only initialize if key exists, otherwise provide a fallback function
const apiKey = process.env.API_KEY;

export async function generatePresetFromMood(mood: string): Promise<SynthSettings> {
  if (!apiKey) {
    throw new Error("API key is not configured for AI presets.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Suggest synthesizer parameters for a mood described as: "${mood}". Use specific numerical values.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          oscType: { type: Type.STRING, description: "sine, square, sawtooth, or triangle" },
          attack: { type: Type.NUMBER, description: "0.01 to 2.0" },
          decay: { type: Type.NUMBER, description: "0.01 to 2.0" },
          sustain: { type: Type.NUMBER, description: "0.0 to 1.0" },
          release: { type: Type.NUMBER, description: "0.01 to 3.0" },
          cutoff: { type: Type.NUMBER, description: "50 to 10000" },
          resonance: { type: Type.NUMBER, description: "0 to 20" },
          detune: { type: Type.NUMBER, description: "-50 to 50" },
          reverb: { type: Type.NUMBER, description: "0 to 1" }
        },
        required: ["oscType", "attack", "decay", "sustain", "release", "cutoff", "resonance", "detune", "reverb"]
      }
    }
  });

  try {
    const settings = JSON.parse(response.text || '{}');
    return settings as SynthSettings;
  } catch (e) {
    console.error("Failed to parse AI preset", e);
    throw new Error("Invalid AI response");
  }
}
