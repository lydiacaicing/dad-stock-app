
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

  const ai = new GoogleGenAI({ apiKey });
  
  // 使用系統規定的最強 Flash 模型，具備搜尋能力
  const modelName = 'gemini-3-flash-preview';
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('zh-TW');

  // 根據次數區間動態描述
  const countDesc = filters.maxLimitUp >= 999 
    ? `至少達到 ${filters.minLimitUp} 次` 
    : `在 ${filters.minLimitUp} 次到 ${filters.maxLimitUp} 次之間`;

  const prompt = `
    你現在是專業的台灣股市數據分析師。今天是 ${todayStr}。
    請搜尋「Goodinfo!台灣股市資訊網」、「玩股網」或「MoneyDJ」。
    
    【任務】
    找出在 ${filters.startDate} 到 ${filters.endDate} 期間內，曾有過漲停板（漲幅達 9.9% 或以上）的台灣股票。
    
    【篩選條件】
    1. 價格區間：${filters.minPrice} ~ ${filters.maxPrice} 元。
    2. 市場類型：${filters.marketTypes.join('及')}。
    3. 漲停頻率：計算統計期間內的「累計漲停總次數」，並篩選次數為【${countDesc}】的股票。
    4. 排除興櫃股票。

    【輸出格式】
    請僅回傳 JSON 陣列，嚴禁任何解釋文字或 Markdown：
    [
      {
        "symbol": "代碼",
        "name": "公司簡稱",
        "limitUpCount": 次數數字,
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
          lastClosePrice: Number(s.lastClosePrice || 0),
          limitUpCount: Number(s.limitUpCount || 0)
        }));
        
        // 前端二次精準過濾
        stocks = stocks.filter(s => {
          const p = s.lastClosePrice;
          const priceOk = p >= filters.minPrice && p <= filters.maxPrice;
          const countOk = s.limitUpCount >= filters.minLimitUp && s.limitUpCount <= filters.maxLimitUp;
          return priceOk && countOk;
        });

        // 依漲停次數降冪排列
        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
      } catch (e) {
        console.error("JSON 解析失敗", e);
      }
    }

    return { stocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("API 錯誤詳情:", error);
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("Quota")) throw new Error("QUOTA_EXCEEDED");
    throw new Error(msg || "連線不穩定");
  }
};
