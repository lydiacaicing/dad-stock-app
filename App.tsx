
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Search, Loader2, Zap, BarChart3, Download, ArrowRight, AlertCircle, RefreshCcw, Info, CheckCircle2, XCircle, Rocket
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const [rangeLabel, setRangeLabel] = useState<'全部' | '0-10次' | '11-20次' | '21-30次'>('全部');
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockLimitUpRecord[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'ok' | 'missing'>('checking');

  // 檢查 API 金鑰是否真的有傳進來
  useEffect(() => {
    const key = process.env.API_KEY;
    if (key && key !== 'undefined' && key !== 'null' && key.length > 10) {
      setKeyStatus('ok');
    } else {
      setKeyStatus('missing');
    }
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    minPrice: 0,
    maxPrice: 150,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 99
  });

  const handleRangeChange = (label: typeof rangeLabel) => {
    setRangeLabel(label);
    let min = 1, max = 99;
    if (label === '0-10次') { min = 1; max = 10; }
    else if (label === '11-20次') { min = 11; max = 20; }
    else if (label === '21-30次') { min = 21; max = 30; }
    setFilters(p => ({ ...p, minLimitUp: min, maxLimitUp: max }));
  };

  const handleSearch = async () => {
    if (keyStatus === 'missing') {
      setError("偵測到 API 金鑰缺失或無效。請確認 Vercel 設定並執行一次 Redeploy。");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setStocks([]);
    
    try {
      const result = await fetchLimitUpRanking(filters);
      setStocks(result.stocks);
      setSources(result.sources);
      if (result.stocks.length === 0) {
        setError("這段時間內沒找到符合條件的漲停股。建議拉長日期區間，或稍微調整股價區間再試。");
      }
    } catch (err: any) {
      console.error("App Search Error:", err);
      if (err.message === "API_KEY_MISSING") {
        setError("❌ 系統讀取不到 API 金鑰。請在 Vercel 設定 API_KEY 後重新部署 (Redeploy)。");
      } else {
        setError(err.message || "搜尋過程發生錯誤，可能是 API 暫時繁忙。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-100">
              <TrendingUp className="text-white w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-800">台股強勢分析 <span className="text-red-600">爸爸版</span></h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 診斷面板 */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border ${
              keyStatus === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {keyStatus === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {keyStatus === 'ok' ? '金鑰狀態：已就緒' : '金鑰狀態：未偵測到'}
            </div>
            <button onClick={() => window.location.reload()} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RefreshCcw className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* 輸入區塊 */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-white">
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">1. 搜尋日期區間</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black text-xl border border-slate-100 outline-none focus:ring-4 ring-red-500/10 transition-all" />
                <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black text-xl border border-slate-100 outline-none focus:ring-4 ring-red-500/10 transition-all" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">2. 股價搜尋區間</label>
              <div className="grid grid-cols-2 gap-6 bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100">
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最低 ($)</span>
                  <input type="number" value={filters.minPrice} onChange={e => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} className="w-full px-8 py-5 bg-white rounded-2xl font-black text-2xl border border-amber-200 outline-none focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最高 ($)</span>
                  <input type="number" value={filters.maxPrice} onChange={e => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} className="w-full px-8 py-5 bg-white rounded-2xl font-black text-2xl border border-amber-200 outline-none focus:border-amber-500" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full py-10 bg-red-600 hover:bg-red-700 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl shadow-red-200 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-4"
            >
              {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Zap className="w-8 h-8 fill-current" />}
              {loading ? "AI 全網掃描數據中..." : "開始智慧分析"}
            </button>
          </div>
        </section>

        {/* 錯誤顯示區 */}
        {error && (
          <div className="bg-white border border-red-100 p-8 rounded-[2.5rem] shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-start gap-5">
              <div className="bg-red-100 p-3 rounded-2xl"><AlertCircle className="w-8 h-8 text-red-600" /></div>
              <div className="space-y-4 flex-1">
                <p className="font-black text-xl text-red-600">搜尋遇到阻礙</p>
                <p className="font-bold text-slate-600 leading-relaxed">{error}</p>
                
                {keyStatus === 'missing' && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-black">
                      <Rocket className="w-5 h-5 text-blue-500" /> 
                      爸爸檢查步驟：
                    </div>
                    <ol className="list-decimal list-inside text-sm font-bold text-slate-500 space-y-2">
                      <li>確認 Vercel 設定裡的 API_KEY 字串沒有貼錯。</li>
                      <li>在 Vercel 點選 <b className="text-red-600">Redeploy</b> (重新部署)。</li>
                      <li>等部署綠燈後，再重新整理本網頁。</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 搜尋結果 */}
        {hasSearched && !loading && stocks.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-2xl font-black text-slate-800 px-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-slate-400" />
              強勢股名單 ({stocks.length})
            </h3>
            
            <div className="grid grid-cols-1 gap-5">
              {stocks.map((stock, i) => (
                <div key={stock.symbol} className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row items-center justify-between">
                  <div className="flex items-center gap-8">
                    <span className="text-6xl font-black text-slate-50 group-hover:text-red-50 transition-colors w-20 text-center">{i+1}</span>
                    <div>
                      <div className="flex items-baseline gap-4 mb-2">
                        <h4 className="text-4xl font-black text-slate-800">{stock.name}</h4>
                        <span className="text-2xl font-bold text-slate-300 font-mono">{stock.symbol}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-black bg-slate-100 px-4 py-1.5 rounded-full text-slate-400 uppercase tracking-widest">{stock.sector}</span>
                        <span className="text-[10px] font-black bg-red-50 px-4 py-1.5 rounded-full text-red-500 uppercase tracking-widest">{stock.market}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12 mt-10 md:mt-0 w-full md:w-auto pt-8 md:pt-0 border-t md:border-t-0 border-slate-50">
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">收盤報價</p>
                      <p className="text-4xl font-black text-slate-700">${stock.lastClosePrice}</p>
                    </div>
                    <div className="bg-red-600 text-white px-14 py-8 rounded-[2.8rem] text-center shadow-xl shadow-red-200 group-hover:scale-110 transition-transform">
                      <p className="text-[11px] font-black text-red-200 uppercase mb-1">漲停次數</p>
                      <p className="text-6xl font-black leading-none">{stock.limitUpCount}<span className="text-xl ml-1 opacity-50">次</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 參考網址 */}
            {sources.length > 0 && (
              <div className="p-10 bg-slate-100/50 rounded-[3rem] mt-12">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                  <Info className="w-5 h-5" /> 數據即時驗證來源
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-white p-6 rounded-2xl flex items-center justify-between hover:text-red-600 transition-all shadow-sm border border-slate-200">
                      <span className="font-bold truncate mr-4">{s.title}</span>
                      <ArrowRight className="w-5 h-5 opacity-20" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 py-6 px-10 z-40 text-xs font-bold text-slate-400 flex justify-between">
        <p>★ 數據由 AI 實時抓取整理，僅供參考。版本：1.7 穩定版</p>
      </footer>
    </div>
  );
};

export default App;
