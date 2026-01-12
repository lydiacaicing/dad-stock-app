
import React, { useState, useCallback } from 'react';
import { 
  TrendingUp, 
  AlertCircle,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
  Copy,
  Key,
  Info,
  Coffee,
  RefreshCw
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState<FilterState>({
    startDate: defaultStartDate,
    endDate: today,
    minPrice: 10,
    maxPrice: 80,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 999
  });

  const [limitUpMode, setLimitUpMode] = useState<string>('all');
  const [stocks, setStocks] = useState<StockLimitUpRecord[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (currentFilters: FilterState) => {
    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const result = await fetchLimitUpRanking(currentFilters);
      setStocks(result.stocks);
      setSources(result.sources);
    } catch (err: any) {
      console.error("捕捉錯誤:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: (name.includes('Price') || name.includes('LimitUp')) 
        ? (value === '' ? 0 : Number(value)) 
        : value
    }));
  };

  const handleLimitUpModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value;
    setLimitUpMode(mode);
    if (mode !== 'custom') {
      const [min, max] = mode.split('-').map(Number);
      setFilters(prev => ({ ...prev, minLimitUp: min || 1, maxLimitUp: max || 999 }));
    }
  };

  const toggleMarketType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      marketTypes: prev.marketTypes.includes(type)
        ? prev.marketTypes.filter(t => t !== type)
        : [...prev.marketTypes, type]
    }));
  };

  const copyToClipboard = () => {
    const header = "代號\t名稱\t收盤價\t漲停次數\t產業\n";
    const body = stocks.map(s => `${s.symbol}\t${s.name}\t${s.lastClosePrice}\t${s.limitUpCount}\t${s.sector}`).join('\n');
    navigator.clipboard.writeText(header + body);
    alert("表格已複製！");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      <header className="bg-white border-b-4 border-red-600 py-4 px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-800">台股漲停助手</h1>
          </div>
          <div className="flex gap-2">
            {['上市', '上櫃'].map(m => (
              <button
                key={m}
                onClick={() => toggleMarketType(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                  filters.marketTypes.includes(m) 
                  ? 'bg-slate-800 text-white border-slate-800' 
                  : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> 統計區間
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} 
                  className="px-2 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-red-500 outline-none w-full" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} 
                  className="px-2 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-red-500 outline-none w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">價格 (元)</label>
              <div className="flex items-center gap-2">
                <input type="number" name="minPrice" value={filters.minPrice} onChange={handleInputChange} 
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold text-center focus:border-red-500" />
                <span className="text-slate-300">~</span>
                <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleInputChange} 
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold text-center focus:border-red-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">漲停次數</label>
              <select value={limitUpMode} onChange={handleLimitUpModeChange} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-red-500">
                <option value="all">全部 (1次以上)</option>
                <option value="2-999">強勢 (2次以上)</option>
                <option value="3-999">極強 (3次以上)</option>
                <option value="custom">自定義次數</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => loadData(filters)}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? "AI 分析中..." : "開始分析"}
              </button>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <TrendingUp className="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">請輸入條件，AI 會幫您到 Goodinfo 找資料！</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-red-100 p-8 rounded-3xl text-center shadow-sm">
            {error === "QUOTA_EXCEEDED" ? (
              <>
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Coffee className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">AI 累了，請稍候再試</h3>
                <p className="text-slate-600 font-bold mb-6">
                  因為是免費版，Google 限制每分鐘的搜尋次數。<br/>
                  請休息一分鐘（喝杯茶）再按一次按鈕喔！
                </p>
                <button 
                  onClick={() => loadData(filters)}
                  className="px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-5 h-5" /> 點我重試
                </button>
              </>
            ) : error === "API_KEY_MISSING" ? (
              <>
                <Key className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-red-800">未設定 API 金鑰</h3>
                <p className="text-slate-500 mt-2">請在 Vercel 後台設定 API_KEY 環境變數。</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-red-800">搜尋出錯了</h3>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left text-xs font-mono text-slate-500 break-all border border-slate-200">
                  {error}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                分析結果 
                <span className="text-sm font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                  {stocks.length} 檔
                </span>
              </h2>
              {stocks.length > 0 && (
                <button onClick={copyToClipboard} className="text-sm font-bold text-slate-500 hover:text-red-600 flex items-center gap-1">
                  <Copy className="w-4 h-4" /> 複製表格
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-500">股票名稱</th>
                      <th className="px-6 py-4 font-black text-slate-500 text-center">價格</th>
                      <th className="px-6 py-4 font-black text-red-600 text-center bg-red-50/50">漲停次數</th>
                      <th className="px-6 py-4 font-black text-slate-500">產業</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stocks.length > 0 ? stocks.map(stock => (
                      <tr key={stock.symbol} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{stock.name}</div>
                          <div className="text-xs font-bold text-slate-400 font-mono">{stock.symbol} · {stock.market}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono text-slate-600">${stock.lastClosePrice}</td>
                        <td className="px-6 py-4 text-center bg-red-50/20">
                          <span className="inline-block w-10 h-10 leading-10 rounded-full bg-red-600 text-white font-black shadow-md">
                            {stock.limitUpCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-600">{stock.sector}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold">沒有找到符合條件的股票</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 px-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 資料來源：
                </span>
                {sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
