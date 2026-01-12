
import { GoogleGenAI, Type } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  // 加入最低與最高股價限制
  const prompt = `
    角色：台股大數據分析師。
    任務：搜尋並統計在 ${filters.startDate} 到 ${filters.endDate} 期間，台灣股市(TWSE/TPEx)中「漲停」的股票。
    
    精準過濾條件：
    1. 股價限制：股價必須介於 ${filters.minPrice} 元至 ${filters.maxPrice} 元之間。
    2. 次數統計：統計該區間內累計漲停的總次數。
    3. 篩選範圍：只回傳漲停次數在 ${filters.minLimitUp} 到 ${filters.maxLimitUp} 之間的股票。
    
    數據來源：
    - Goodinfo!台灣股市資訊網的歷史漲停紀錄。
    - Yahoo 奇摩股市與各大財經新聞每日報表。
    
    輸出：嚴格按照 JSON Schema 返回陣列，按漲停次數由高到低排序。
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: `你專門搜尋台股中低價位的強勢股。請務必確保次數與股價數據準確。目前的篩選條件是股價介於 ${filters.minPrice} 到 ${filters.maxPrice} 元。`,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              limitUpCount: { type: Type.INTEGER },
              sector: { type: Type.STRING },
              market: { type: Type.STRING },
              lastClosePrice: { type: Type.NUMBER }
            },
            required: ["symbol", "name", "limitUpCount", "sector", "market", "lastClosePrice"]
          }
        }
      },
    });

    const text = response.text || "[]";
    const stocks: StockLimitUpRecord[] = JSON.parse(text);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '數據來源',
        uri: chunk.web.uri || ''
      }));

    // 二次過濾：確保回傳結果絕對符合界面的過濾條件
    const filteredStocks = stocks.filter(s => 
      s.limitUpCount >= filters.minLimitUp && 
      s.limitUpCount <= filters.maxLimitUp &&
      s.lastClosePrice >= filters.minPrice &&
      s.lastClosePrice <= filters.maxPrice
    );

    filteredStocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
    return { stocks: filteredStocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("AI Search Error:", error);
    if (error.message.includes("429") || error.message.includes("Quota")) throw new Error("QUOTA_EXCEEDED");
    throw new Error("SERVER_ERROR");
  }
};
