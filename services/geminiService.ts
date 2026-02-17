
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePrescriptionImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: 'Extract the prescription details from this image. Output JSON with fields: rightEye(sph, cyl, axis), leftEye(sph, cyl, axis), pd.' }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rightEye: {
            type: Type.OBJECT,
            properties: {
              sph: { type: Type.STRING },
              cyl: { type: Type.STRING },
              axis: { type: Type.STRING }
            }
          },
          leftEye: {
            type: Type.OBJECT,
            properties: {
              sph: { type: Type.STRING },
              cyl: { type: Type.STRING },
              axis: { type: Type.STRING }
            }
          },
          pd: { type: Type.STRING }
        }
      }
    }
  });
  
  return JSON.parse(response.text || '{}');
};

export const getLensRecommendation = async (prescription: any) => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given this prescription: ${JSON.stringify(prescription)}, suggest the best lens material (Plastic, Polycarbonate, High Index) and explain why briefly. Keep it under 50 words.`,
        config: {
          maxOutputTokens: 150,
          temperature: 0.4 // Lower temperature for faster, more consistent output
        }
    });
    return response.text;
};

export type EmailType = 'WELCOME' | 'ORDER_CONFIRMATION' | 'STATUS_UPDATE' | 'PASSWORD_RESET';

export const generateEmailTemplate = async (type: EmailType, data: any) => {
  const prompts = {
    WELCOME: `Brief high-end welcome email for Lens Master for ${data.name}. Tip: 20-20-20 rule. Mention 256-bit AES encryption.`,
    ORDER_CONFIRMATION: `Professional order confirmation for Order ID ${data.orderId}, Total: $${data.total}. Mention secure payment via Razorpay.`,
    STATUS_UPDATE: `Order update for ID ${data.orderId}: Status is "${data.status}". Keep it encouraging.`,
    PASSWORD_RESET: `Security reset email. Include [RESET_LINK]. Tone: Urgent and secure.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompts[type],
    config: {
      temperature: 0.5,
      maxOutputTokens: 300 // Reduced for faster generation
      // thinkingConfig removed as it is not needed for short templated emails and adds latency
    }
  });

  return {
    subject: `Lens Master | ${type.replace('_', ' ').charAt(0) + type.replace('_', ' ').slice(1).toLowerCase()}`,
    body: response.text
  };
};
