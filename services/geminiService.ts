
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
  
  const prompt = `
    你現在是爸爸的專屬股票助理。請利用 Google Search 搜尋「Goodinfo 台灣股市資訊網」或「MoneyDJ」的漲停股資料。

    【使用者篩選條件】
    1. **日期範圍**：${filters.startDate} 至 ${filters.endDate} (共 ${diffDays} 天)。
    2. **價格範圍**：${filters.minPrice} 元 至 ${filters.maxPrice} 元。
    3. **市場別**：只包含上市與上櫃 (嚴格排除興櫃)。
    4. **漲停次數**：累計 ${filters.minLimitUp} ~ ${filters.maxLimitUp} 次。

    【執行策略】
    1. **搜尋**：搜尋這段期間每一天的漲停股清單。
    2. **統計**：將同一個股票代號出現的次數累加。
    3. **排除**：排除興櫃股票、排除價格不符的股票。

    【輸出格式】
    請回傳純 JSON 格式，結構如下：
    [
      {
        "symbol": "股票代號",
        "name": "股票名稱",
        "limitUpCount": 累積漲停次數 (數字),
        "sector": "產業別",
        "market": "上市/上櫃",
        "lastClosePrice": 最近收盤價 (數字)
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
        title: chunk.web.title || '財經資料來源',
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
        
        // JavaScript 端二次過濾
        stocks = stocks.filter(s => {
          const priceCondition = s.lastClosePrice >= filters.minPrice && s.lastClosePrice <= filters.maxPrice;
          const limitUpCondition = s.limitUpCount >= filters.minLimitUp && s.limitUpCount <= filters.maxLimitUp;
          
          let marketCondition = false;
          if (filters.marketTypes.some(t => s.market.includes(t))) {
            marketCondition = true;
          }
          if (s.market.includes('興櫃')) {
            marketCondition = false;
          }

          return priceCondition && limitUpCondition && marketCondition;
        });

        // 排序：次數多 -> 價格高
        stocks.sort((a, b) => {
          if (b.limitUpCount !== a.limitUpCount) {
            return b.limitUpCount - a.limitUpCount;
          }
          return b.lastClosePrice - a.lastClosePrice;
        });

      } catch (e) {
        console.error("資料解析失敗", e);
      }
    }

    const analysis = `搜尋完成！共找到 ${stocks.length} 檔股票。`;
    return { stocks, sources, analysis };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};