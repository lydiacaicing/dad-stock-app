
import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  AlertCircle,
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
  ShieldCheck,
  Zap,
  ChevronDown,
  Key,
  BarChart3
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const isKeyConfigured = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '';

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

  // 處理倒數計時邏輯
  useEffect(() => {
    let timer: any;
    if (retryCountdown > 0) {
      timer = setInterval(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleSearch = async () => {
    if (!isKeyConfigured) {
      setError("API_KEY_MISSING");
      return;
    }
    if (retryCountdown > 0) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const result = await fetchLimitUpRanking(filters);
      setStocks(result.stocks);
      setSources(result.sources);
    } catch (err: any) {
      setError(err.message);
      if (err.message === "QUOTA_EXCEEDED") {
        setRetryCountdown(60); // 觸發 60 秒冷卻
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
                <span className={`w-2 h-2 rounded-full ${isKeyConfigured ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></span>
                <p className={`text-[10px] font-bold ${isKeyConfigured ? 'text-slate-400' : 'text-orange-500'}`}>
                  {isKeyConfigured ? 'Google AI 連線正常' : 'API 金鑰尚未偵測到'}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex gap-4">
             <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">
              <BarChart3 className="w-3 h-3" /> 檢查額度
            </a>
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 flex items-center gap-1">
              <ShieldCheck className={`w-3 h-3 ${isKeyConfigured ? 'text-green-500' : 'text-slate-300'}`} /> 伺服器正常
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><Zap className="w-32 h-32 text-red-600" /></div>
          <div className="flex items-center gap-2 mb-6 text-slate-700">
            <Filter className="w-5 h-5 text-red-600" /><h2 className="text-lg font-black">爸爸的查詢設定</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">統計日期</label>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input type="date" name="startDate" value={filters.startDate} onChange={(e) => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
                <div className="relative">
                  <input type="date" name="endDate" value={filters.endDate} onChange={(e) => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">股價範圍 (元)</label>
              <div className="flex items-center gap-2 h-[92px]">
                <input type="number" value={filters.minPrice} onChange={(e) => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center text-slate-700 focus:border-red-500 outline-none" />
                <span className="text-slate-300 font-black">~</span>
                <input type="number" value={filters.maxPrice} onChange={(e) => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center text-slate-700 focus:border-red-500 outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">累積漲停次數</label>
              <div className="relative h-[92px] flex items-center">
                <select value={rangeLabel} onChange={handleRangeChange} className="w-full px-4 py-4 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-xl text-red-600 appearance-none focus:border-red-500 outline-none cursor-pointer">
                  <option value="全部">全部次數</option>
                  <option value="0-10">0 - 10 次</option>
                  <option value="11-20">11 - 20 次</option>
                  <option value="21-30">21 - 30 次</option>
                  <option value="30+">30 次以上</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-300 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end h-[92px] lg:mt-[22px]">
              <button 
                onClick={handleSearch}
                disabled={loading || retryCountdown > 0}
                className="w-full h-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-100 active:scale-95 text-lg"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                {retryCountdown > 0 ? `冷卻中 (${retryCountdown}s)` : loading ? "分析中..." : "開始統計"}
              </button>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <div className="text-center py-20 bg-white/40 rounded-[40px] border-2 border-dashed border-slate-200">
            <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-black text-lg">設定好條件後，按「開始統計」幫您抓強勢股</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-orange-100 p-10 rounded-[40px] text-center shadow-2xl">
            {error === "QUOTA_EXCEEDED" ? (
              <>
                <Coffee className="w-16 h-16 text-red-600 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-slate-800 mb-2">Google AI 需要喘口氣</h3>
                <p className="text-slate-500 font-bold mb-8">因為目前免費版 API 查詢人數較多，請等候倒數結束再試！</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={handleSearch} disabled={retryCountdown > 0} className="px-10 py-4 bg-red-600 disabled:bg-slate-300 text-white font-black rounded-2xl flex items-center gap-2">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /> 
                    {retryCountdown > 0 ? `再等 ${retryCountdown} 秒` : '立即重試'}
                  </button>
                  <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noreferrer" className="px-10 py-4 border-2 border-slate-200 text-slate-600 font-black rounded-2xl flex items-center gap-2 hover:bg-slate-50">
                    <BarChart3 className="w-5 h-5" /> 檢查我的剩餘次數
                  </a>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-red-800">分析發生錯誤</h3>
                <p className="text-slate-500 mt-2 bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-100 break-all">{error}</p>
                <button onClick={handleSearch} className="mt-6 px-8 py-2 bg-slate-800 text-white rounded-xl font-bold">重試一次</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">漲停排行榜 <span className="text-red-600 font-black">({stocks.length})</span></h2>
                <p className="text-xs font-bold text-slate-400">次數區間：{rangeLabel}</p>
              </div>
              <button onClick={() => {
                const text = stocks.map(s => `${s.symbol} ${s.name} (漲停:${s.limitUpCount}次)`).join('\n');
                navigator.clipboard.writeText(text);
                alert('已複製到剪貼簿！');
              }} className="text-xs font-black text-slate-500 border-2 border-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 bg-white hover:bg-slate-50 transition-all shadow-sm"><Copy className="w-4 h-4" /> 複製名單</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {stocks.length > 0 ? stocks.map((stock, idx) => (
                <div key={stock.symbol} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-6 hover:border-red-200 transition-all group hover:shadow-lg">
                  <div className="text-2xl font-black text-slate-200 w-8 text-center group-hover:text-red-100">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-red-600">{stock.name}</h3>
                      <span className="text-sm font-bold text-slate-400 font-mono tracking-tighter">{stock.symbol}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200 uppercase">{stock.market}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-500 rounded-lg border border-blue-100">{stock.sector}</span>
                    </div>
                  </div>
                  <div className="text-right px-4 hidden sm:block">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">最新收盤</p>
                    <p className="text-xl font-black text-slate-700 font-mono">${stock.lastClosePrice}</p>
                  </div>
                  <div className="bg-red-50 px-6 py-3 rounded-[24px] border border-red-100 text-center min-w-[110px] shadow-inner">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">累計漲停</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">{stock.limitUpCount}<span className="text-sm ml-0.5 font-bold">次</span></p>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                  <Info className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-black text-xl">目前區間內沒有符合的股票</p>
                  <p className="text-slate-300 text-sm font-bold mt-2">可能是搜尋日期太接近（資料尚未更新）或符合條件的股票較少</p>
                </div>
              )}
            </div>
            
            {sources.length > 0 && (
              <div className="mt-10 p-8 bg-slate-50 rounded-[40px] border-2 border-white shadow-inner">
                <p className="text-xs font-black text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">AI 分析數據來源</p>
                <div className="flex flex-wrap gap-3">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-black text-blue-600 flex items-center gap-2 hover:border-red-200 hover:text-red-600 transition-all shadow-sm">
                      <ExternalLink className="w-4 h-4" /> {s.title}
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
