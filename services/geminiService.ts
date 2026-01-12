
import { GoogleGenAI, Type } from "@google/genai";
import { StockLimitUpRecord, FilterState, GroundingSource } from "../types";

/**
 * 強大的 JSON 提取器：
 * 針對 Gemini 在搜尋模式下可能回傳的 Markdown 代碼塊或雜訊進行深度清理。
 */
const extractJsonFromText = (text: string) => {
  try {
    // 1. 先嘗試移除 Markdown 標籤
    let cleanText = text.replace(/```json\n?|```/g, "").trim();
    
    // 2. 尋找 JSON 陣列的邊界 [ ... ]
    const startIdx = cleanText.indexOf('[');
    const endIdx = cleanText.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = cleanText.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonStr);
    }
    
    // 3. 如果沒找到 [ ]，嘗試直接解析整個字串
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("[GeminiService] JSON 解析失敗。原始內容：", text);
    throw new Error("數據格式異常，AI 未能產生正確的 JSON 列表。");
  }
};

export const fetchLimitUpRanking = async (filters: FilterState): Promise<{
  stocks: StockLimitUpRecord[];
  sources: GroundingSource[];
  analysis: string;
}> => {
  const apiKey = process.env.API_KEY;
  
  // 嚴格檢查金鑰是否存在
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const modelName = 'gemini-3-flash-preview';
  
  // 調整 Prompt：明確要求 JSON 代碼塊，但不開啟 API 的 JSON Mode 以確保搜尋功能正常
  const prompt = `
    請分析台股資料。
    時間範圍：${filters.startDate} 到 ${filters.endDate}。
    篩選條件：股價介於 ${filters.minPrice} ~ ${filters.maxPrice} 元。
    任務：找出這段時間內「漲停」次數在 ${filters.minLimitUp} 到 ${filters.maxLimitUp} 次的股票。
    
    請直接回傳一個 JSON 程式碼區塊，格式如下：
    [{"symbol": "股票代號", "name": "名稱", "limitUpCount": 漲停次數, "sector": "產業", "market": "上市或上櫃", "lastClosePrice": 當前股價}]
    
    不要提供額外的文字解釋，僅提供 JSON 列表。
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "你是一個專業的台股數據提取器。你必須利用 Google Search 搜尋 Goodinfo 或 Yahoo 股市來獲取真實數據。請將結果整理成 JSON 陣列。",
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        // 注意：這裡不設定 responseMimeType，因為會跟 googleSearch 衝突
      },
    });

    const rawText = response.text || "";
    if (!rawText) throw new Error("AI 回傳內容為空，請稍後再試。");

    const stocks: StockLimitUpRecord[] = extractJsonFromText(rawText);
    
    // 提取搜尋來源 (Grounding Sources)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || '搜尋來源',
        uri: chunk.web.uri || '#'
      }));

    // 前端二次精確過濾
    const filteredStocks = stocks.filter(s => 
      s.limitUpCount >= filters.minLimitUp && 
      s.limitUpCount <= filters.maxLimitUp &&
      s.lastClosePrice >= filters.minPrice &&
      s.lastClosePrice <= filters.maxPrice
    );

    filteredStocks.sort((a, b) => b.limitUpCount - a.limitUpCount);
    
    return { 
      stocks: filteredStocks, 
      sources, 
      analysis: "數據獲取成功" 
    };
  } catch (error: any) {
    console.error("[GeminiService] 錯誤詳情:", error);
    
    if (error.message?.includes("API key not valid")) {
      throw new Error("金鑰錯誤：請檢查 Vercel 設定的 API_KEY 是否正確。");
    }
    
    throw error;
  }
};
