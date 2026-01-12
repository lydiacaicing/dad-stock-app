
import { GoogleGenAI } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const modelName = 'gemini-3-pro-preview';
  
  const marketFilterDesc = filters.marketTypes.length > 0 
    ? `市場範圍：嚴格限定只包含 ${filters.marketTypes.join(' 與 ')}，其他的(如興櫃)請排除` 
    : "包含上市、上櫃";

  // 計算天數差異
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  
  const prompt = `
    你現在是爸爸的專屬股票助理，他習慣看「Goodinfo 台灣股市資訊網」的漲停股資料。
    請利用 Google Search 幫他整理資料，免去他每天切換日期的麻煩。

    【使用者的嚴格篩選條件】
    1. **日期範圍**：${filters.startDate} 至 ${filters.endDate} (共 ${diffDays} 天)。
    2. **價格範圍**：${filters.minPrice} 元 至 ${filters.maxPrice} 元。
       (爸爸只看中低價股，超過 ${filters.maxPrice} 元的請直接剔除，低於 ${filters.minPrice} 元的也剔除)。
    3. **市場別**：${marketFilterDesc}。
       (注意：Goodinfo 的預設漲停列表通常不含興櫃，若使用者沒選興櫃，請確保不要列入)。
    4. **漲停次數**：這段期間內累計 ${filters.minLimitUp} ~ ${filters.maxLimitUp} 次。

    【執行策略：模擬查詢 Goodinfo】
    1. **搜尋技巧**：請使用 Google Search 搜尋類似 "Goodinfo 漲停股 ${filters.startDate}"、"Goodinfo 漲停股 ${filters.endDate}" 或 "MoneyDJ 漲停板" 等關鍵字。
       - 我們不直接爬取網站，而是讀取搜尋引擎索引到的 Goodinfo 頁面摘要或類似權威財經網站(MoneyDJ, PChome, Yahoo)的表格。
    2. **跨日統計**：
       - 搜尋這段期間內「每一天」的強勢股/漲停股清單。
       - 將同一個股票代號出現的次數累加。
    3. **完整性**：請盡量列出所有符合價格區間的股票，不要只列前十名。

    【輸出格式】
    請回傳純 JSON 格式，不要有 Markdown 標記，結構如下：
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
        // 增加思考預算，確保它有足夠的時間去「閱讀」搜尋到的表格並進行過濾
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
        
        // JavaScript 端二次過濾 (Double Check)
        // 確保 AI 搜尋進來的資料真的符合爸爸設定的 200 元以下與市場別
        stocks = stocks.filter(s => {
          const priceCondition = s.lastClosePrice >= filters.minPrice && s.lastClosePrice <= filters.maxPrice;
          const limitUpCondition = s.limitUpCount >= filters.minLimitUp && s.limitUpCount <= filters.maxLimitUp;
          
          let marketCondition = false;
          // 寬鬆比對市場名稱
          if (filters.marketTypes.some(t => s.market.includes(t))) {
            marketCondition = true;
          }
          // 特殊處理：如果使用者只要上市上櫃，排除興櫃
          if (!filters.marketTypes.includes('興櫃') && s.market.includes('興櫃')) {
            marketCondition = false;
          }

          return priceCondition && limitUpCondition && marketCondition;
        });

        // 排序：漲停次數由多到少 -> 價格由高到低
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

    const analysis = `搜尋完成！依照 Goodinfo 與各大財經網資料，在 ${filters.startDate} 到 ${filters.endDate} 期間，${filters.maxPrice}元以下的股票中，共找到 ${stocks.length} 檔強勢股。`;

    return { stocks, sources, analysis };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
