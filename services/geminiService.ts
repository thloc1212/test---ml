
import { GoogleGenAI } from "@google/genai";
import { SimulationState, WeightData } from "../types";

// Initialize Gemini Client
// process.env.API_KEY is assumed to be available and valid per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLassoNetState = async (state: SimulationState): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Vui lòng cấu hình process.env.API_KEY để sử dụng AI phân tích.";
  }

  const featureSummary = state.features.map(f => 
    `Feature ${f.id}: Theta=${f.theta.toFixed(3)}, Max(|W|)=${Math.max(...f.w.map(Math.abs)).toFixed(3)}, Active=${f.isActive}`
  ).join('\n');

  const prompt = `
    Bạn là một chuyên gia về Học máy (Machine Learning) và đặc biệt là kiến trúc LassoNet.
    Hãy phân tích trạng thái huấn luyện hiện tại của mô hình LassoNet đang được hiển thị.
    
    Bối cảnh:
    - Giai đoạn (Phase): ${state.phase}
    - Lambda hiện tại (Hệ số phạt): ${state.lambda.toFixed(3)}
    - Epoch: ${state.epoch}
    - Bước tối ưu (Step Type): ${state.step}
    
    Trọng số đặc trưng (Feature Weights):
    ${featureSummary}
    
    Hãy giải thích ngắn gọn bằng TIẾNG VIỆT (tối đa 2 câu):
    Điều gì đang xảy ra với việc lựa chọn đặc trưng? 
    Đặc trưng nào đang bị loại bỏ (theta tiến về 0)? 
    Ràng buộc phân cấp ( |W| <= M*|theta| ) có đang hoạt động không?
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Không có phân tích nào được tạo.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Không thể lấy phân tích từ Gemini lúc này.";
  }
};
