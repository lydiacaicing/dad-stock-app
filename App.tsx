
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
  RefreshCw,
  Clock
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
      console.error("App 捕捉錯誤:", err);
      setError(err.message);
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
    if (mode === 'all') {
      setFilters(prev => ({ ...prev, minLimitUp: 1 }));
    } else if (mode === 'strong') {
      setFilters(prev => ({ ...prev, minLimitUp: 2 }));
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b-4 border-red-600 py-4 px-6 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">台股漲停分析助手</h1>
              <p className="text-[10px] font-bold text-slate-400">跨入 2026！最懂爸爸的選股工具</p>
            </div>
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
        {/* Filter Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-black">爸爸的查詢條件</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> 統計期間
              </label>
              <div className="grid grid-cols-1 gap-2">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} 
                  className="px-3 py-2 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 focus:border-red-500 outline-none w-full" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} 
                  className="px-3 py-2 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 focus:border-red-500 outline-none w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">股價範圍 (元)</label>
              <div className="flex items-center gap-2">
                <input type="number" name="minPrice" value={filters.minPrice} onChange={handleInputChange} 
                  className="w-full px-3 py-2 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 text-center focus:border-red-500" />
                <span className="text-slate-300">~</span>
                <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleInputChange} 
                  className="w-full px-3 py-2 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 text-center focus:border-red-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">累積漲停次數</label>
              <select value={limitUpMode} onChange={handleLimitUpModeChange} 
                className="w-full px-3 py-3 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 outline-none focus:border-red-500">
                <option value="all">全部 (只要有漲停)</option>
                <option value="strong">強勢 (2次以上)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => loadData(filters)}
                disabled={loading}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-100 active:scale-95"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                {loading ? "正在幫您找股票..." : "開始分析統計"}
              </button>
            </div>
          </div>
        </div>

        {/* Status / Results Area */}
        {!hasSearched ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-300">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-lg">調整上方條件，按下按鈕幫您找出強勢股！</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-red-100 p-10 rounded-3xl text-center shadow-xl">
            {error === "QUOTA_EXCEEDED" ? (
              <>
                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Coffee className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Google AI 目前有點忙</h3>
                <p className="text-slate-600 font-bold mb-8 leading-relaxed">
                  因為是免費版，Google 限制每分鐘的連線次數。<br/>
                  請您稍微休息 **60 秒**，再按一次按鈕試試看喔！
                </p>
                <button 
                  onClick={() => loadData(filters)}
                  className="px-10 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 flex items-center gap-2 mx-auto shadow-lg"
                >
                  <RefreshCw className="w-5 h-5" /> 現在再試一次
                </button>
              </>
            ) : error === "API_KEY_MISSING" || error === "INVALID_API_KEY" ? (
              <>
                <Key className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-red-800">API 金鑰設定錯誤</h3>
                <p className="text-slate-500 mt-2 font-bold">請檢查 Vercel 後台的 API_KEY 是否正確輸入且已重新部署。</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-red-800">連線有點狀況</h3>
                <p className="text-slate-500 mt-2">{error}</p>
                <button onClick={() => loadData(filters)} className="mt-6 px-6 py-2 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50">重試一次</button>
              </>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6 px-2">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                統計結果
                <span className="bg-red-600 text-white text-sm px-3 py-1 rounded-full shadow-md">
                  共 {stocks.length} 檔
                </span>
              </h2>
              {stocks.length > 0 && (
                <button onClick={() => {
                  const txt = stocks.map(s => `${s.symbol} ${s.name} (漲停:${s.limitUpCount}次)`).join('\n');
                  navigator.clipboard.writeText(txt);
                  alert('已複製到剪貼簿！');
                }} className="text-sm font-bold text-slate-500 hover:text-red-600 flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <Copy className="w-4 h-4" /> 複製結果
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-5 font-black text-slate-400">股票名稱</th>
                      <th className="px-6 py-5 font-black text-slate-400 text-center">最新價格</th>
                      <th className="px-6 py-4 font-black text-red-600 text-center bg-red-50/50">累計漲停</th>
                      <th className="px-6 py-5 font-black text-slate-400">產業類別</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stocks.length > 0 ? stocks.map(stock => (
                      <tr key={stock.symbol} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-black text-lg text-slate-900">{stock.name}</div>
                          <div className="text-sm font-bold text-slate-400 font-mono tracking-tighter">{stock.symbol} · {stock.market}</div>
                        </td>
                        <td className="px-6 py-5 text-center font-black font-mono text-slate-700 text-lg">${stock.lastClosePrice}</td>
                        <td className="px-6 py-5 text-center bg-red-50/20">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600 text-white text-xl font-black shadow-lg shadow-red-200">
                            {stock.limitUpCount}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-bold px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 border border-slate-200">{stock.sector}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          <Info className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-black text-xl">這段期間沒有符合條件的漲停股</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {sources.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-4 px-4 py-4 bg-white/50 rounded-2xl border border-slate-200">
                <span className="text-sm font-black text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4" /> 參考資料來源：
                </span>
                {sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:text-red-600 flex items-center gap-1 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> {s.title}
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
