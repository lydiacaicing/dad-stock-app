
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Search, Loader2, Zap, BarChart3, Download, ArrowRight, AlertCircle, RefreshCcw, Info, CheckCircle2, XCircle
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

  // 診斷金鑰狀態
  useEffect(() => {
    const key = process.env.API_KEY;
    if (key && key !== 'undefined' && key.length > 10) {
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
      setError("❌ 偵測不到 API 金鑰。請設定 Vercel 環境變數並重新 Deploy。");
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
        setError("這段時間內 AI 沒找到符合條件的漲停股，請試著拉長時間範圍。");
      }
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError("API 金鑰讀取失敗。請確認 Vercel Dashboard 的 API_KEY 是否正確。");
      } else {
        setError(err.message || "搜尋失敗。AI 伺服器目前忙碌中，請等 10 秒後再試。");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportForTrading = () => {
    if (stocks.length === 0) return;
    const content = stocks.map(s => s.symbol).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `台股強勢股名單.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
            {/* 金鑰診斷燈號 */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border ${
              keyStatus === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              keyStatus === 'missing' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
              {keyStatus === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {keyStatus === 'ok' ? '系統已就緒' : '金鑰未設定'}
            </div>
            <button onClick={() => window.location.reload()} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RefreshCcw className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-white">
          <div className="space-y-10">
            {/* 1. 日期 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">1. 搜尋區間 (越長越準)</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black text-xl outline-none focus:ring-4 ring-red-500/10 transition-all border border-slate-100" />
                <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black text-xl outline-none focus:ring-4 ring-red-500/10 transition-all border border-slate-100" />
              </div>
            </div>

            {/* 2. 次數 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">2. 漲停次數過濾</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['全部', '0-10次', '11-20次', '21-30次'] as const).map(label => (
                  <button
                    key={label}
                    onClick={() => handleRangeChange(label)}
                    className={`py-6 rounded-2xl font-black text-lg transition-all border-2 ${rangeLabel === label ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 股價區間 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">3. 設定股價搜尋區間</label>
              <div className="grid grid-cols-2 gap-6 bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100">
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最低報價</span>
                  <input type="number" value={filters.minPrice} onChange={e => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} className="w-full px-8 py-5 bg-white rounded-2xl font-black text-2xl outline-none border border-amber-200 focus:border-amber-500 transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最高報價</span>
                  <input type="number" value={filters.maxPrice} onChange={e => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} className="w-full px-8 py-5 bg-white rounded-2xl font-black text-2xl outline-none border border-amber-200 focus:border-amber-500 transition-all shadow-sm" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full py-10 bg-red-600 hover:bg-red-700 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl shadow-red-200 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-4"
            >
              {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Zap className="w-8 h-8 fill-current" />}
              {loading ? "AI 搜尋分析中..." : "開始智慧分析"}
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] flex items-start gap-5 text-red-700 animate-in slide-in-from-top-4">
            <AlertCircle className="w-10 h-10 flex-shrink-0" />
            <div>
              <p className="font-black text-xl mb-1">提示訊息</p>
              <p className="font-bold opacity-80">{error}</p>
              {error.includes("API 金鑰") && (
                <p className="mt-4 text-sm bg-white/50 p-4 rounded-xl border border-red-100">
                  請至 Vercel Settings -> Environment Variables 確認 API_KEY 是否正確，並記得執行 <b>Redeploy</b>。
                </p>
              )}
            </div>
          </div>
        )}

        {hasSearched && !loading && stocks.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-slate-400" />
                分析結果 ({stocks.length})
              </h3>
              <button onClick={exportForTrading} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl active:scale-95">
                <Download className="w-5 h-5 text-red-500" /> 匯出清單
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {stocks.map((stock, i) => (
                <div key={stock.symbol} className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 hover:shadow-2xl transition-all group flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-8">
                    <span className="text-6xl font-black text-slate-50 group-hover:text-red-50 transition-colors w-20 text-center">{i+1}</span>
                    <div>
                      <div className="flex items-baseline gap-4 mb-2">
                        <h4 className="text-4xl font-black text-slate-800 group-hover:text-red-600 transition-colors">{stock.name}</h4>
                        <span className="text-2xl font-bold text-slate-300 font-mono tracking-tighter">{stock.symbol}</span>
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
                    <div className="bg-red-600 text-white px-14 py-8 rounded-[2.8rem] text-center shadow-2xl shadow-red-200 group-hover:scale-110 transition-transform">
                      <p className="text-[11px] font-black text-red-200 uppercase mb-1">漲停統計</p>
                      <p className="text-6xl font-black leading-none">{stock.limitUpCount}<span className="text-xl ml-1 opacity-50">次</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sources.length > 0 && (
              <div className="p-10 bg-white/50 rounded-[3rem] border border-slate-200 backdrop-blur-sm mt-12">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <Info className="w-5 h-5 text-blue-400" /> 數據即時同步來源
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-red-500 hover:text-red-600 transition-all shadow-sm hover:shadow-md group">
                      <span className="font-bold text-slate-600 group-hover:text-red-600 truncate mr-4">{s.title}</span>
                      <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-red-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 py-6 px-10 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs font-bold text-slate-400">
          <p>★ 數據由 Gemini AI 全網即時掃描提供。版本：爸爸專屬 1.6</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-help">隱私宣告</span>
            <span className="hover:text-slate-600 cursor-help">數據說明</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
