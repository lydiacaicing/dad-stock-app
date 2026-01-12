
export interface StockLimitUpRecord {
  symbol: string;
  name: string;
  limitUpCount: number;
  sector: string;
  lastClosePrice: number;
  market: '上市' | '上櫃' | '未知';
}

export interface FilterState {
  startDate: string;
  endDate: string;
  minPrice: number;
  maxPrice: number;
  marketTypes: string[];
  minLimitUp: number;
  maxLimitUp: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
