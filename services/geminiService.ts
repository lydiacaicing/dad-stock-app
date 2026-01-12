
import { GoogleGenAI, Type } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

/**
 * 智慧型 JSON 提取器：
 * 防止 AI 回傳時帶有 Markdown 標籤 (```json) 或前後廢話
 */
const extractJson = (text: string) => {
  try {
    // 嘗試尋找第一個 [ 或 { 到最後一個 ] 或 } 之間的內容
    const match = text.match(/[\{\[].*[\}\]]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON 解析失敗，原始文字：", text);
    throw new Error("JSON_PARSE_ERROR");
  }
};

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
  
  const prompt = `
    角色：台股大數據分析師。
    任務：精確統計在 ${filters.startDate} 到 ${filters.endDate} 期間，台灣股市中漲停的股票。
    
    過濾條件：
    1. 股價範圍：${filters.minPrice} 元至 ${filters.maxPrice} 元。
    2. 次數統計：累計出現「漲停」的總次數。
    3. 次數篩選：回傳漲停次數在 ${filters.minLimitUp} 到 ${filters.maxLimitUp} 之間的股票。
    
    數據來源：
    - Goodinfo!台灣股市資訊網、Yahoo 奇摩股市。
    
    重要：請直接回傳 JSON 陣列，不要有任何前言或結語。
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: `你是一個嚴格的數據機器人，只會回傳 JSON。目前的目標股價區間是 ${filters.minPrice} ~ ${filters.maxPrice} 元。`,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING, description: "股票代號" },
              name: { type: Type.STRING, description: "股票名稱" },
              limitUpCount: { type: Type.INTEGER, description: "漲停次數" },
              sector: { type: Type.STRING, description: "產業" },
              market: { type: Type.STRING, description: "上市/上櫃" },
              lastClosePrice: { type: Type.NUMBER, description: "收盤價" }
            },
            required: ["symbol", "name", "limitUpCount", "sector", "market", "lastClosePrice"]
          }
        }
      },
    });

    const rawText = response.text || "[]";
    const stocks: StockLimitUpRecord[] = extractJson(rawText);
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經數據源',
        uri: chunk.web.uri || ''
      }));

    // 二次過濾與排序，確保 UI 條件完美符合
    const filteredStocks = stocks.filter(s => 
      s.limitUpCount >= filters.minLimitUp && 
      s.limitUpCount <= filters.maxLimitUp &&
      s.lastClosePrice >= filters.minPrice &&
      s.lastClosePrice <= filters.maxPrice
    );

    filteredStocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
    return { stocks: filteredStocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("fetchLimitUpRanking Error:", error);
    if (error.message === "JSON_PARSE_ERROR") throw new Error("數據格式錯誤，請再試一次");
    if (error.message.includes("429")) throw new Error("搜尋太頻繁，請稍候");
    throw error;
  }
};
