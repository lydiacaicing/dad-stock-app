
import { GoogleGenAI } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  // Initialize GoogleGenAI with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use gemini-3-pro-preview for tasks requiring advanced reasoning and data retrieval
  const modelName = 'gemini-3-pro-preview';
  const today = new Date().toLocaleDateString('zh-TW');

  // 精簡 Prompt，減少輸出 Token 消耗，避免額度過快用完
  const prompt = `
    角色：台股分析專家。今日：${today}。
    任務：搜尋在 ${filters.startDate} 到 ${filters.endDate} 期間漲停(9.9%+)的台股。
    條件：
    1. 價格：${filters.minPrice}~${filters.maxPrice}元
    2. 市場：${filters.marketTypes.join('/')}
    3. 漲停次數：${filters.minLimitUp}~${filters.maxLimitUp}次
    
    格式：直接輸出 JSON 陣列，不准解釋。
    [
      {"symbol":"代碼","name":"名稱","limitUpCount":數字,"sector":"產業","market":"上市/櫃","lastClosePrice":數字}
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        // Use Google Search grounding for accurate financial data
        tools: [{ googleSearch: {} }],
        temperature: 0, // 降低隨機性，節省資源
      },
    });

    // Access the .text property directly from the response
    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經來源',
        uri: chunk.web.uri || ''
      }));

    let stocks: StockLimitUpRecord[] = [];
    // Extract JSON from response text as grounding metadata might interfere with pure JSON output
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (jsonMatch) {
      stocks = JSON.parse(jsonMatch[0]);
      // 二次本地過濾確保資料正確
      stocks = stocks.filter(s => {
        const p = Number(s.lastClosePrice);
        const c = Number(s.limitUpCount);
        return p >= filters.minPrice && p <= filters.maxPrice && c >= filters.minLimitUp && c <= filters.maxLimitUp;
      });
      stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
    }

    return { stocks, sources, analysis: "OK" };
  } catch (error: any) {
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("Quota")) throw new Error("QUOTA_EXCEEDED");
    throw new Error("搜尋暫時中斷，請稍後再試");
  }
};
