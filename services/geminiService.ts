
import { GoogleGenAI, Modality, type GenerateContentResponse } from "@google/genai";
import type { UploadedImage } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

const extractImage = (response: GenerateContentResponse) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return {
                base64: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
            };
        }
    }
    throw new Error("No image found in the response");
};

export async function generateScene(
  images: UploadedImage[],
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  const validImages = images.filter(img => (img.annotatedBase64 || img.base64) && img.mimeType);
  if (validImages.length === 0) {
    throw new Error("At least one image is required to generate a scene.");
  }

  const imageParts = validImages.map(img => fileToGenerativePart(img.annotatedBase64 || img.base64!, img.mimeType!));

  const textPrompt = `You are an expert digital artist specializing in hyper-realistic image composition.
  You will be provided with ${validImages.length} source images. They are labeled sequentially as Image 1, Image 2, and so on.
  Your task is to follow the user's instructions to seamlessly blend these images into a single, new, cohesive image.

  IMPORTANT: Some images may have colored drawings (lines, circles, boxes) on them. These annotations are important visual instructions from the user. Use them as a primary guide for positioning, modifying, or composing elements from the source images. For example, a circle might indicate an area of focus, or a line might show a desired path or position.

  Pay close attention to perspective, lighting, shadows, and textures to ensure the final result is photorealistic.
  Retain as much detail as possible from the original images.

  User Instructions: "${prompt}"

  Generate only the final blended image without any text explanation.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [...imageParts, { text: textPrompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return extractImage(response);
}

export async function enhanceImage(
  image: { base64: string, mimeType: string },
  enhancementPrompt: string
): Promise<{ base64: string; mimeType: string }> {
  const imagePart = fileToGenerativePart(image.base64, image.mimeType);

  const textPrompt = `You are a professional photo editor. Enhance the provided image based on the following instruction: "${enhancementPrompt}".
  The output should only be the new, enhanced image.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [imagePart, { text: textPrompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  return extractImage(response);
}