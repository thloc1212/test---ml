import { GoogleGenAI } from "@google/genai";
import { SimulationState, WeightData } from "../types";

// Initialize Gemini Client
// process.env.API_KEY is assumed to be available and valid per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLassoNetState = async (state: SimulationState): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Gemini API Key is missing. Please configure process.env.API_KEY to enable AI analysis.";
  }

  const featureSummary = state.features.map(f => 
    `Feature ${f.id}: Theta=${f.theta.toFixed(3)}, Max(|W|)=${Math.max(...f.w.map(Math.abs)).toFixed(3)}, Active=${f.isActive}`
  ).join('\n');

  const prompt = `
    You are an expert in Machine Learning and specifically the LassoNet architecture.
    Analyze the current training state of a LassoNet visualization.
    
    Context:
    - Phase: ${state.phase}
    - Current Lambda (Penalty): ${state.lambda.toFixed(3)}
    - Epoch: ${state.epoch}
    - Step Type: ${state.step}
    
    Feature Weights:
    ${featureSummary}
    
    Explain briefly (max 2 sentences) what is happening regarding feature selection. 
    Which features are being pruned (theta approaching 0)? 
    Is the hierarchy constraint ( |W| <= M*|theta| ) visible?
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to fetch analysis from Gemini at this moment.";
  }
};