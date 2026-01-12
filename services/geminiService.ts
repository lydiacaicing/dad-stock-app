
import { GoogleGenAI, Type } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

/**
 * 智慧型 JSON 提取器：
 * 針對 Gemini 結合搜尋時可能回傳的 Markdown 標籤進行深度清理
 */
const extractJson = (text: string) => {
  try {
    // 移除可能存在的 Markdown 代碼塊標籤
    const cleanText = text.replace(/```json\n?|```/g, "").trim();
    // 尋找 JSON 陣列的起始與結束
    const startIdx = cleanText.indexOf('[');
    const endIdx = cleanText.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = cleanText.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON 解析失敗。原始文字內容：", text);
    throw new Error("數據解析失敗，請再試一次");
  }
};

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  // 檢查 API KEY 是否存在
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const modelName = 'gemini-3-flash-preview';
  
  const prompt = `
    請作為專業台股數據官，搜尋並統計 ${filters.startDate} 到 ${filters.endDate} 期間，台灣股市(TWSE/TPEx)中「漲停」的股票。
    
    篩選標準：
    1. 股價區間：${filters.minPrice} 到 ${filters.maxPrice} 元。
    2. 統計目標：這段時間內「漲停次數」至少一次的股票。
    3. 輸出限制：請只列出漲停次數在 ${filters.minLimitUp} 到 ${filters.maxLimitUp} 之間的股票。
    
    請直接以 JSON 格式回傳，結構必須符合以下定義：
    [{ "symbol": "代號", "name": "名稱", "limitUpCount": 次數, "sector": "產業", "market": "上市或上櫃", "lastClosePrice": 價格 }]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "你是一個資料庫介面，嚴格禁言，只准回傳正確的 JSON 數據。若搜尋不到則回傳空陣列 []。",
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "[]";
    const stocks: StockLimitUpRecord[] = extractJson(rawText);
    
    // 提取搜尋來源網址
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '財經來源',
        uri: chunk.web.uri || ''
      }));

    // 前端二次過濾，確保萬無一失
    const filteredStocks = stocks.filter(s => 
      s.limitUpCount >= filters.minLimitUp && 
      s.limitUpCount <= filters.maxLimitUp &&
      s.lastClosePrice >= filters.minPrice &&
      s.lastClosePrice <= filters.maxPrice
    );

    filteredStocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
    return { stocks: filteredStocks, sources, analysis: "OK" };
  } catch (error: any) {
    console.error("Gemini API 呼叫異常:", error);
    
    if (error.message?.includes("API key not valid")) {
      throw new Error("金鑰無效，請檢查 Vercel 設定");
    }
    
    throw error;
  }
};
