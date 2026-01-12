
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

  // 使用 Flash 模型，因為 Pro 模型在免費層級可能限制為 0
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('zh-TW');

  // 強化 Prompt，確保 AI 明白現在是 2026 年
  const prompt = `
    你現在是專業的台灣股市分析助手。今天是 ${todayStr}。
    
    【任務】
    請搜尋「Goodinfo!台灣股市資訊網」或「玩股網」，找出在 ${filters.startDate} 到 ${filters.endDate} 期間內，所有漲停（漲幅 10%）的股票。
    
    【篩選條件】
    1. 價格區間：${filters.minPrice} ~ ${filters.maxPrice} 元。
    2. 市場類型：${filters.marketTypes.join('及')}。
    3. 計算這段期間內「累計漲停次數」。
    4. 排除興櫃股票。

    【輸出格式】
    請僅回傳 JSON 陣列格式，不要包含 Markdown 語法或其他解釋文字：
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
    
    // 提取 Grounding 來源
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經來源',
        uri: chunk.web.uri || ''
      }));

    let stocks: StockLimitUpRecord[] = [];
    
    // 從回傳內容中找出 JSON 部分
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
        
        // 本地端過濾確保萬無一失
        stocks = stocks.filter(s => {
          const priceOk = s.lastClosePrice >= filters.minPrice && s.lastClosePrice <= filters.maxPrice;
          const marketOk = filters.marketTypes.some(t => s.market?.includes(t));
          return priceOk && marketOk && s.limitUpCount >= filters.minLimitUp;
        });

        // 依漲停次數降序排列
        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
      } catch (e) {
        console.error("JSON 解析錯誤", e);
      }
    }

    return { stocks, sources, analysis: "完成" };
  } catch (error: any) {
    console.error("Gemini 服務錯誤:", error);
    
    const errMsg = error.message || "";
    if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("exhausted")) {
      throw new Error("QUOTA_EXCEEDED");
    } else if (errMsg.includes("403") || errMsg.includes("key")) {
      throw new Error("INVALID_API_KEY");
    }
    
    throw new Error(errMsg || "連線不穩定，請重試。");
  }
};
