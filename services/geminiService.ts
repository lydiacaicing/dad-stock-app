
import { GoogleGenAI } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-pro-preview';
  
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  const todayStr = new Date().toLocaleDateString('zh-TW');

  const prompt = `
    你現在是專屬股票助理。今天是 ${todayStr}。
    請利用 Google Search 搜尋「Goodinfo 台灣股市資訊網」、「MoneyDJ」或「玩股網」的最新漲停資料。

    【查詢任務】
    1. **日期範圍**：${filters.startDate} 至 ${filters.endDate}。
    2. **篩選條件**：
       - 價格：${filters.minPrice} ~ ${filters.maxPrice} 元。
       - 市場：上市、上櫃 (絕對不要興櫃)。
       - 漲停次數：累計出現 ${filters.minLimitUp} ~ ${filters.maxLimitUp} 次。

    【執行步驟】
    - 找出這段期間內每天的漲停股票清單。
    - 統計每檔股票出現的總次數。
    - 回傳最後的收盤價與產業類別。

    【輸出格式】
    請只回傳純 JSON 陣列：
    [
      {
        "symbol": "代號",
        "name": "名稱",
        "limitUpCount": 數字,
        "sector": "產業",
        "market": "上市/上櫃",
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
        thinkingConfig: { thinkingBudget: 28000 }
      },
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經來源',
        uri: chunk.web.uri || ''
      }));

    let stocks: StockLimitUpRecord[] = [];
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (jsonMatch) {
      try {
        const rawStocks = JSON.parse(jsonMatch[0]);
        stocks = rawStocks.map((s: any, idx: number) => ({
          ...s,
          rank: idx + 1,
          lastClosePrice: Number(s.lastClosePrice),
          limitUpCount: Number(s.limitUpCount)
        }));
        
        stocks = stocks.filter(s => {
          return s.lastClosePrice >= filters.minPrice && 
                 s.lastClosePrice <= filters.maxPrice &&
                 s.limitUpCount >= filters.minLimitUp &&
                 filters.marketTypes.some(t => s.market.includes(t)) &&
                 !s.market.includes('興櫃');
        });

        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount || b.lastClosePrice - a.lastClosePrice);
      } catch (e) {
        console.error("JSON 解析失敗", e);
      }
    }

    return { stocks, sources, analysis: "完成" };
  } catch (error: any) {
    console.error("Gemini API 錯誤細節:", error);
    // 拋出更具體的錯誤訊息
    throw new Error(error.message || "連線至 Google AI 失敗，請檢查 Key 或網路。");
  }
};
