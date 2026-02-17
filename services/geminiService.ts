
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
  
  // Directly access text property as per guidelines
  return JSON.parse(response.text || '{}');
};

export const getLensRecommendation = async (prescription: any) => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given this prescription: ${JSON.stringify(prescription)}, suggest the best lens material (Plastic, Polycarbonate, High Index) and explain why briefly.`
    });
    // Directly access text property as per guidelines
    return response.text;
};

export type EmailType = 'WELCOME' | 'ORDER_CONFIRMATION' | 'STATUS_UPDATE' | 'PASSWORD_RESET';

export const generateEmailTemplate = async (type: EmailType, data: any) => {
  const prompts = {
    WELCOME: `Create a brief, high-end welcome email for "Lens Master" (Secure Optical Store) for ${data.name}. 
              Tone: Professional, luxurious, and security-focused.
              Include:
              1. A warm welcome to the "Lens Master Sanctuary."
              2. An eye health tip: Mention the importance of the 20-20-20 rule for digital eye strain.
              3. Security: Mention that their medical optical data is guarded by 256-bit AES encryption and GDPR-compliant protocols.
              4. A call to action to browse our latest Italian-made frames.`,
    
    ORDER_CONFIRMATION: `Create a professional order confirmation email for Lens Master. 
              Details: Order ID ${data.orderId}, Total Amount: $${data.total}.
              Include:
              1. Enthusiastic confirmation that their vision journey has begun.
              2. Note that our expert opticians are now reviewing their prescription with precision.
              3. Mention that a tracking link will be sent shortly.
              4. Emphasize that their transaction was secured via Razorpay encrypted gateways.`,
    
    STATUS_UPDATE: `Create an exciting order status update email for Lens Master. 
              Details: Order ID ${data.orderId} is now officially "${data.status}".
              Include:
              1. A customized message for the status: 
                 - If "Shipped": "Your new vision is on its way! Our premium shipping partner has secured your package."
                 - If "Delivered": "Welcome to a clearer world! Your order has been successfully delivered."
              2. Remind them that Lens Master offers a 12-month warranty on all premium lens coatings.
              3. A prompt to contact "Vision Support" if they have any questions.`,
    
    PASSWORD_RESET: `Create a high-security password reset email for Lens Master. 
              Include:
              1. A serious yet helpful tone regarding account security.
              2. Instructions to click a placeholder link [RESET_LINK] to change their password.
              3. A strong warning: "If you did not request this, please secure your email account immediately. Our security team has logged this request from IP address [IP_STUB]."
              4. Mention that reset links expire in 15 minutes for their protection.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompts[type],
    config: {
      temperature: 0.6,
      maxOutputTokens: 600,
      // When maxOutputTokens is set, thinkingBudget must also be configured to reserve output tokens
      thinkingConfig: { thinkingBudget: 100 }
    }
  });

  return {
    subject: `Lens Master | ${type.replace('_', ' ').charAt(0) + type.replace('_', ' ').slice(1).toLowerCase()}`,
    // Directly access text property as per guidelines
    body: response.text
  };
};
