
export interface StockLimitUpRecord {
  rank: number;
  symbol: string;
  name: string;
  limitUpCount: number;
  sector: string;
  lastClosePrice: number;
  market: '上市' | '上櫃' | '興櫃';
}

export interface FilterState {
  startDate: string;
  endDate: string;
  minPrice: number;
  maxPrice: number;
  marketTypes: string[];
  minLimitUp: number; // 新增：最小漲停次數
  maxLimitUp: number; // 新增：最大漲停次數
}

export interface GroundingSource {
  title: string;
  uri: string;
}
