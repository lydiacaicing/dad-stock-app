
import { GoogleGenAI } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  // 優先檢查 API Key
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  /** 
   * 使用 'gemini-flash-latest'。
   * 根據測試，這是在免費額度下最穩定支援 Google Search 的型號。
   */
  const modelName = 'gemini-flash-latest';
  
  const todayStr = new Date().toLocaleDateString('zh-TW');

  const prompt = `
    你現在是專業的台灣股市分析助手。今天是 ${todayStr}。
    請使用 Google Search 搜尋最新的「Goodinfo!台灣股市資訊網」或「玩股網」資料。
    
    【任務】
    找出在 ${filters.startDate} 到 ${filters.endDate} 期間內，所有漲停（漲幅達 9.9% 以上）的台灣股票。
    
    【篩選條件】
    1. 價格區間：${filters.minPrice} 到 ${filters.maxPrice} 元。
    2. 市場類型：${filters.marketTypes.join('及')}。
    3. 統計這段期間內的「累計漲停總次數」。
    4. 排除興櫃股票。

    【輸出格式】
    請僅回傳 JSON 陣列，不要有 Markdown 語法或解釋：
    [
      {
        "symbol": "代碼",
        "name": "公司名稱",
        "limitUpCount": 次數數字,
        "sector": "產業別",
        "market": "上市或上櫃",
        "lastClosePrice": 價格數字
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
    
    // 提取參考來源
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經資訊',
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
        
        // 保險過濾
        stocks = stocks.filter(s => {
          const p = s.lastClosePrice;
          return p >= filters.minPrice && p <= filters.maxPrice && s.limitUpCount >= filters.minLimitUp;
        });

        stocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
      } catch (e) {
        console.error("解析失敗", e);
      }
    }

    return { stocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("API 完整錯誤內容:", error);
    
    // 判斷錯誤類型
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("Quota")) {
      throw new Error("QUOTA_EXCEEDED");
    } else if (msg.includes("403")) {
      throw new Error("API_KEY_INVALID");
    } else if (msg.includes("not found")) {
      throw new Error("MODEL_NOT_FOUND");
    }
    
    // 如果是其他錯誤，就把原始錯誤訊息丟出去以便偵錯
    throw new Error(`連線失敗: ${msg}`);
  }
};
