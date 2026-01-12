
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
  Copy,
  Info,
  Coffee,
  RefreshCw,
  Clock,
  Zap,
  ChevronDown,
  BarChart3,
  Database,
  History
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

// 快取效期：1 小時 (3600000 毫秒)
const CACHE_EXPIRY = 3600000;

const App: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    minPrice: 10,
    maxPrice: 150,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 999
  });

  const [rangeLabel, setRangeLabel] = useState('全部');
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockLimitUpRecord[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isCachedData, setIsCachedData] = useState(false);

  useEffect(() => {
    let timer: any;
    if (retryCountdown > 0) {
      timer = setInterval(() => setRetryCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [retryCountdown]);

  // 快取關鍵字生成 (基於查詢條件)
  const getCacheKey = (f: FilterState) => `cache_${f.startDate}_${f.endDate}_${f.minPrice}_${f.maxPrice}_${f.minLimitUp}_${f.maxLimitUp}`;

  const handleSearch = async (forceRefresh = false) => {
    const cacheKey = getCacheKey(filters);
    
    // 1. 檢查快取 (除非強制刷新)
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          setStocks(data.stocks);
          setSources(data.sources);
          setIsCachedData(true);
          setHasSearched(true);
          setError(null);
          return;
        }
      }
    }

    // 2. 正常查詢
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setIsCachedData(false);

    try {
      const result = await fetchLimitUpRanking(filters);
      setStocks(result.stocks);
      setSources(result.sources);
      
      // 存入快取
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    } catch (err: any) {
      setError(err.message);
      if (err.message === "QUOTA_EXCEEDED") {
        setRetryCountdown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    setRangeLabel(label);
    let min = 1, max = 999;
    if (label === '0-10') { min = 1; max = 10; }
    else if (label === '11-20') { min = 11; max = 20; }
    else if (label === '21-30') { min = 21; max = 30; }
    else if (label === '30+') { min = 31; max = 999; }
    setFilters(prev => ({ ...prev, minLimitUp: min, maxLimitUp: max }));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      <header className="bg-white border-b-4 border-red-600 py-4 px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-100">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">台股漲停分析器</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] font-bold text-slate-400">
                  智慧分析模式已啟用
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => {localStorage.clear(); alert('快取已清除');}} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="清除所有快取">
               <RefreshCw className="w-4 h-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* 查詢面板 */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><Zap className="w-32 h-32 text-red-600" /></div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-black">爸爸的查詢設定</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
               <Database className="w-3 h-3" />
               <span className="text-[10px] font-black uppercase">智慧快取已開啟</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 日期選擇區 */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                統計日期 
                {/* Wrap Lucide icon in a span to apply title attribute as icon itself does not support it directly in types */}
                <span title="建議不超過 7 天以提高準確率">
                  <Info className="w-3 h-3 text-slate-300" />
                </span>
              </label>
              <div className="flex flex-col gap-2">
                <input type="date" value={filters.startDate} onChange={(e) => setFilters(p => ({...p, startDate: e.target.value}))} className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
                <input type="date" value={filters.endDate} onChange={(e) => setFilters(p => ({...p, endDate: e.target.value}))} className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
              </div>
            </div>

            {/* 價格區 */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">股價範圍 (元)</label>
              <div className="flex items-center gap-2 h-full py-2">
                <input type="number" value={filters.minPrice} onChange={(e) => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center focus:border-red-500 outline-none" />
                <span className="text-slate-300 font-black">~</span>
                <input type="number" value={filters.maxPrice} onChange={(e) => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center focus:border-red-500 outline-none" />
              </div>
            </div>

            {/* 次數區 */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">累積漲停次數</label>
              <div className="relative h-full py-2">
                <select value={rangeLabel} onChange={handleRangeChange} className="w-full px-4 py-3 bg-red-50 border-2 border-red-100 rounded-xl font-black text-red-600 appearance-none focus:border-red-500 outline-none cursor-pointer">
                  <option value="全部">全部次數</option>
                  <option value="0-10">0 - 10 次</option>
                  <option value="11-20">11 - 20 次</option>
                  <option value="21-30">21 - 30 次</option>
                  <option value="30+">30 次以上</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-300 pointer-events-none" />
              </div>
            </div>

            {/* 按鈕區 */}
            <div className="flex items-end h-full py-2 lg:mt-[22px]">
              <button 
                onClick={() => handleSearch(false)}
                disabled={loading || retryCountdown > 0}
                className="w-full h-12 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {retryCountdown > 0 ? `${retryCountdown}s 後重試` : loading ? "搜尋中..." : "開始統計"}
              </button>
            </div>
          </div>
          
          <p className="mt-4 text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Info className="w-3 h-3 text-red-400" /> 
            小提示：如果您剛才查過同樣的條件，系統會自動顯示先前結果，不佔用 Google 次數。
          </p>
        </div>

        {!hasSearched ? (
          <div className="text-center py-24 bg-white/40 rounded-[40px] border-2 border-dashed border-slate-200">
            <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black text-lg tracking-widest uppercase">準備好後，點擊上方按鈕開始</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-orange-100 p-12 rounded-[40px] text-center shadow-2xl max-w-2xl mx-auto">
            <Coffee className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Google AI 忙碌中</h3>
            <p className="text-slate-500 font-bold mb-8 leading-relaxed">
              爸爸，因為這個搜尋功能很強大，Google 的免費額度有時候會用完。<br/>
              請休息一會，或試著**縮短搜尋天數**（例如改查最近 2 天）。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => handleSearch(true)} disabled={retryCountdown > 0} className="px-8 py-4 bg-red-600 disabled:bg-slate-300 text-white font-black rounded-2xl flex items-center gap-2 justify-center">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /> 
                {retryCountdown > 0 ? `請稍候 ${retryCountdown} 秒` : '再試一次'}
              </button>
              <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noreferrer" className="px-8 py-4 border-2 border-slate-200 text-slate-600 font-black rounded-2xl flex items-center gap-2 hover:bg-slate-50 justify-center">
                <BarChart3 className="w-5 h-5" /> 檢查額度
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800">排行榜 <span className="text-red-600">({stocks.length})</span></h2>
                {isCachedData && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black border border-blue-200 animate-in fade-in slide-in-from-left-2">
                    <History className="w-3 h-3" /> 使用先前查詢結果 (省流量)
                  </span>
                )}
              </div>
              <button onClick={() => {
                const text = stocks.map(s => `${s.symbol} ${s.name} (漲停:${s.limitUpCount}次)`).join('\n');
                navigator.clipboard.writeText(text);
                alert('已複製名單');
              }} className="text-xs font-black text-slate-500 border border-slate-200 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 transition-all flex items-center gap-2">
                <Copy className="w-4 h-4" /> 複製
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {stocks.length > 0 ? stocks.map((stock, idx) => (
                <div key={stock.symbol} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-6 hover:shadow-md transition-shadow">
                  <div className="text-xl font-black text-slate-300 w-6 text-center">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-black text-slate-900">{stock.name}</h3>
                      <span className="text-xs font-bold text-slate-400 font-mono">{stock.symbol}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-100">{stock.market}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-400 rounded border border-blue-100">{stock.sector}</span>
                    </div>
                  </div>
                  <div className="text-right px-4">
                    <p className="text-[9px] font-black text-slate-300 uppercase">收盤價</p>
                    <p className="text-lg font-black text-slate-700">${stock.lastClosePrice}</p>
                  </div>
                  <div className="bg-red-50 px-5 py-2.5 rounded-2xl border border-red-100 text-center min-w-[90px]">
                    <p className="text-[9px] font-black text-red-400 uppercase">漲停</p>
                    <p className="text-2xl font-black text-red-600">{stock.limitUpCount}<span className="text-xs ml-0.5">次</span></p>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                  <Info className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-black text-lg">找不到符合條件的股票</p>
                  <p className="text-slate-300 text-xs font-bold mt-1">試著放寬價格範圍或調整日期</p>
                </div>
              )}
            </div>
            
            {sources.length > 0 && (
              <div className="mt-12 p-8 bg-slate-50 rounded-[40px] border-2 border-white">
                <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">AI 已核對以下財經資訊來源</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-white px-3 py-2 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-red-500 transition-colors">
                      <ExternalLink className="w-3 h-3" /> {s.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
