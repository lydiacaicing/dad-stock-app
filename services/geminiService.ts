
import { GoogleGenAI } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }

  // 根據 Google 規範初始化，確保使用正確的金鑰
  const ai = new GoogleGenAI({ apiKey });
  
  // 使用 Flash 模型確保速度與搜尋功能的平衡
  const modelName = 'gemini-3-flash-preview';
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('zh-TW');

  const prompt = `
    你現在是專業的台灣股市數據分析師。今天是 ${todayStr}。
    請搜尋最近期的台灣股市數據（優先參考 Goodinfo、玩股網、Yahoo 股市）。
    
    【任務】
    找出在 ${filters.startDate} 到 ${filters.endDate} 期間內，漲幅曾達到 9.9% 以上（漲停）的台股。
    
    【篩選條件】
    1. 價格：${filters.minPrice} ~ ${filters.maxPrice} 元。
    2. 市場：${filters.marketTypes.join('及')}。
    3. 漲停次數：累計次數需在 ${filters.minLimitUp} 次到 ${filters.maxLimitUp} 次之間。
    4. 排除：興櫃、權證。

    【重要：僅回傳 JSON 陣列】
    不要有任何前言或結語，直接回傳 JSON：
    [
      {
        "symbol": "代碼",
        "name": "簡稱",
        "limitUpCount": 數字,
        "sector": "產業",
        "market": "上市或上櫃",
        "lastClosePrice": 數字
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經資料來源',
        uri: chunk.web.uri || ''
      }));

    let stocks: StockLimitUpRecord[] = [];
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (jsonMatch) {
      try {
        stocks = JSON.parse(jsonMatch[0]);
        // 二次過濾
        stocks = stocks.filter(s => {
          const p = Number(s.lastClosePrice);
          const c = Number(s.limitUpCount);
          return p >= filters.minPrice && p <= filters.maxPrice && c >= filters.minLimitUp && c <= filters.maxLimitUp;
        });
        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
      } catch (e) {
        console.error("JSON 解析出錯", e);
      }
    }

    return { stocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("API Error:", error);
    const status = error.status || (error.message && error.message.includes("429") ? 429 : 500);
    
    if (status === 429 || error.message?.includes("Quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    if (error.message?.includes("API key not valid")) {
      throw new Error("API_KEY_INVALID");
    }
    throw new Error(error.message || "系統繁忙中");
  }
};
