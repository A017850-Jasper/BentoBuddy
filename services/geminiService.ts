
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedMenu } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseMenuImage = async (base64Image: string): Promise<ParsedMenu> => {
  try {
    // Strip the data url prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", // Assuming PNG/JPEG, API is flexible
              data: base64Data,
            },
          },
          {
            text: "Analyze this menu image. Extract the restaurant/shop name. Extract the address and phone number if visible. If the shop name is not visible, suggest a generic name based on the food. Extract all menu items and their prices. If a price is a range, take the lowest. Ignore non-food text. Return JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shopName: { type: Type.STRING, description: "Name of the restaurant" },
            address: { type: Type.STRING, description: "Address of the restaurant (optional)" },
            phone: { type: Type.STRING, description: "Phone number of the restaurant (optional)" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the dish" },
                  price: { type: Type.NUMBER, description: "Price of the dish" },
                },
                required: ["name", "price"],
              },
            },
          },
          required: ["shopName", "items"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedMenu;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Error parsing menu with Gemini:", error);
    throw error;
  }
};
