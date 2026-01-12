
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
  // 改用 Flash 版本，免費額度較高且支援搜尋
  const modelName = 'gemini-3-flash-preview';
  
  const todayStr = new Date().toLocaleDateString('zh-TW');

  const prompt = `
    你現在是專屬股票分析師。今天是 ${todayStr}。
    請使用 Google Search 搜尋台灣股市資訊，找出在 ${filters.startDate} 到 ${filters.endDate} 期間內漲停的股票。

    【篩選標準】
    1. 價格範圍：${filters.minPrice} 到 ${filters.maxPrice} 元。
    2. 市場：${filters.marketTypes.join('、')}。
    3. 統計這段期間內，每檔股票「累計漲停」的總次數。
    4. 排除興櫃股票。

    【回傳格式】
    請嚴格只回傳 JSON 陣列，不要有其他文字：
    [
      {
        "symbol": "股票代碼",
        "name": "公司名稱",
        "limitUpCount": 累計次數數字,
        "sector": "產業別",
        "market": "上市或上櫃",
        "lastClosePrice": 最新收盤價數字
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
        title: chunk.web.title || '財經資訊來源',
        uri: chunk.web.uri || ''
      }));

    let stocks: StockLimitUpRecord[] = [];
    // 嘗試從 AI 回傳的文字中抓取 JSON
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
        
        // 再次進行本地端保險篩選
        stocks = stocks.filter(s => {
          return s.lastClosePrice >= filters.minPrice && 
                 s.lastClosePrice <= filters.maxPrice &&
                 s.limitUpCount >= filters.minLimitUp &&
                 filters.marketTypes.some(t => s.market?.includes(t));
        });

        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
      } catch (e) {
        console.error("JSON 解析失敗", e);
      }
    }

    return { stocks, sources, analysis: "完成" };
  } catch (error: any) {
    console.error("Gemini API 完整錯誤:", error);
    
    // 如果是 429 錯誤，自定義清楚的訊息
    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    
    throw new Error(error.message || "發生未知連線錯誤");
  }
};
