
import React, { useState } from 'react';
import { 
  TrendingUp, Search, Loader2, Zap, BarChart3, Download, Filter, Calendar, ArrowRight, AlertCircle, RefreshCcw, Info, CircleDollarSign
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  // 記錄當前選中的次數區間標籤
  const [rangeLabel, setRangeLabel] = useState<'全部' | '0-10次' | '11-20次' | '21-30次'>('全部');

  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    minPrice: 0,
    maxPrice: 150, // 預設爸爸最想看的 150 元
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 99
  });

  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockLimitUpRecord[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 切換次數區間的邏輯
  const handleRangeChange = (label: typeof rangeLabel) => {
    setRangeLabel(label);
    let min = 1, max = 99;
    if (label === '0-10次') { min = 1; max = 10; }
    else if (label === '11-20次') { min = 11; max = 20; }
    else if (label === '21-30次') { min = 21; max = 30; }
    
    setFilters(p => ({ ...p, minLimitUp: min, maxLimitUp: max }));
  };

  const setQuickDate = (type: 'lastMonth' | 'lastYear') => {
    const end = new Date();
    let start = new Date();
    if (type === 'lastMonth') start.setMonth(end.getMonth() - 1);
    if (type === 'lastYear') {
      start = new Date(end.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(end.getFullYear() - 1, 11, 31);
      setFilters(p => ({ ...p, startDate: start.toISOString().split('T')[0], endDate: lastYearEnd.toISOString().split('T')[0] }));
      return;
    }
    setFilters(p => ({ ...p, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }));
  };

  const handleSearch = async () => {
    // 檢查數值合法性
    if (filters.minPrice < 0 || filters.maxPrice <= filters.minPrice) {
      setError("股價範圍設定錯誤（最高價必須大於最低價）");
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
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") setError("請設定 API 金鑰。");
      else setError("搜尋暫時失敗，可能是網路不穩或次數超限。");
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
    link.download = `台股自選股_${filters.startDate}_至_${filters.endDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-24 font-sans selection:bg-red-100">
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-50 px-6 py-5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2 rounded-2xl shadow-lg shadow-red-200">
              <TrendingUp className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 leading-tight">台股強勢分析 <span className="text-red-600">爸爸專屬版</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Smart Stock Limit-Up Detector</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="p-3 text-slate-400 hover:text-red-600 transition-all"><RefreshCcw className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* 主要篩選器設定區 */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 border-2 border-white">
          <div className="space-y-10">
            {/* 1. 時間選擇 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-slate-500 flex items-center gap-2 underline decoration-red-200 decoration-4">1. 選擇時間區間</label>
                <div className="flex gap-2">
                  <button onClick={() => setQuickDate('lastMonth')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-600 transition-all">最近一個月</button>
                  <button onClick={() => setQuickDate('lastYear')} className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-black text-red-600 transition-all">查詢去年整年</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">從這天開始</span>
                  <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl font-black text-xl outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">到這天結束</span>
                  <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl font-black text-xl outline-none transition-all shadow-inner" />
                </div>
              </div>
            </div>

            {/* 2. 漲停次數區間 - 爸爸想要的選單模式 */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-500 flex items-center gap-2 underline decoration-blue-200 decoration-4">2. 選擇漲停次數範圍</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['全部', '0-10次', '11-20次', '21-30次'] as const).map(label => (
                  <button
                    key={label}
                    onClick={() => handleRangeChange(label)}
                    className={`py-6 rounded-2xl font-black text-lg transition-all border-2 ${rangeLabel === label ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 股價篩選 - 改為自定義區間 */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-500 flex items-center gap-2 underline decoration-amber-200 decoration-4">3. 設定股價搜尋區間</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-2">
                    <CircleDollarSign className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">最低價格 ($)</span>
                  </div>
                  <input 
                    type="number" 
                    value={filters.minPrice} 
                    onChange={e => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} 
                    placeholder="0"
                    className="w-full px-8 py-5 bg-white border-2 border-transparent focus:border-amber-500 rounded-2xl font-black text-2xl outline-none transition-all shadow-sm text-amber-900"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">最高價格 ($)</span>
                  </div>
                  <input 
                    type="number" 
                    value={filters.maxPrice} 
                    onChange={e => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} 
                    placeholder="150"
                    className="w-full px-8 py-5 bg-white border-2 border-transparent focus:border-amber-500 rounded-2xl font-black text-2xl outline-none transition-all shadow-sm text-amber-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-amber-600/60 text-center uppercase tracking-[0.2em] mt-2">
                    💡 預設為 0~150 元，AI 將優先搜尋此區間的飆股
                  </p>
                </div>
              </div>
            </div>

            {/* 執行按鈕 */}
            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="group w-full py-8 bg-red-600 hover:bg-red-700 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Zap className="w-9 h-9 fill-current" />}
              {loading ? "AI 正在掃描全台股..." : "立即搜尋標的"}
            </button>
          </div>
        </section>

        {/* 搜尋結果 */}
        {hasSearched && !loading && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-center px-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg"><BarChart3 className="text-white w-6 h-6" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">搜尋結果 ({stocks.length} 檔)</h3>
                  <p className="text-xs font-bold text-slate-400">顯示區間：${filters.minPrice} ~ ${filters.maxPrice} 元</p>
                </div>
              </div>
              {stocks.length > 0 && (
                <button 
                  onClick={exportForTrading}
                  className="w-full md:w-auto px-12 py-5 bg-slate-900 hover:bg-black text-white rounded-[1.8rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-slate-300 transition-all active:scale-95 border-b-4 border-slate-700 active:border-b-0"
                >
                  <Download className="w-6 h-6 text-red-500" /> 匯出代號名單
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5">
              {stocks.map((stock, idx) => (
                <div key={stock.symbol} className="bg-white p-8 md:p-12 rounded-[3rem] border-2 border-slate-50 hover:border-red-200 hover:shadow-2xl shadow-sm flex flex-col md:flex-row items-center justify-between group transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-center gap-10 z-10">
                    <div className="text-5xl font-black text-slate-100 group-hover:text-red-50 transition-colors w-16 text-center tabular-nums">{idx + 1}</div>
                    <div>
                      <div className="flex items-baseline gap-4 mb-3">
                        <h4 className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">{stock.name}</h4>
                        <span className="text-xl font-bold text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{stock.symbol}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="px-5 py-2 bg-slate-50 text-[12px] font-black rounded-xl text-slate-500 border border-slate-200 uppercase">{stock.sector}</span>
                        <span className="px-5 py-2 bg-red-50 text-[12px] font-black rounded-xl text-red-500 border border-red-100 uppercase">{stock.market}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12 mt-8 md:mt-0 z-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-8 md:pt-0 border-slate-50">
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-300 uppercase mb-2 tracking-widest">參考股價</p>
                      <p className="text-3xl font-black text-slate-700 tabular-nums">${stock.lastClosePrice}</p>
                    </div>
                    <div className="bg-red-600 text-white px-14 py-8 rounded-[2.8rem] text-center shadow-xl shadow-red-200 group-hover:scale-110 transition-all">
                      <p className="text-[11px] font-black text-red-200 uppercase mb-1">漲停次數</p>
                      <p className="text-6xl font-black leading-none tabular-nums">{stock.limitUpCount}<span className="text-lg opacity-60 ml-1">次</span></p>
                    </div>
                  </div>
                </div>
              ))}
              
              {stocks.length === 0 && (
                <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                  <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <Search className="w-12 h-12 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-black text-2xl">找不符合條件的股票</p>
                  <p className="text-slate-300 font-bold mt-3 text-lg">試著調整股價區間或搜尋時間</p>
                </div>
              )}
            </div>

            {/* 參考來源 */}
            {sources.length > 0 && (
              <div className="p-10 bg-white/60 rounded-[3rem] border border-slate-200 backdrop-blur-sm shadow-inner mt-10">
                <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
                  <Info className="w-5 h-5 text-blue-500" />
                  <h4 className="font-black text-slate-500 text-sm tracking-widest uppercase">數據搜尋來源</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl text-slate-600 hover:text-red-600 transition-all font-bold border border-slate-100 shadow-sm hover:shadow-md">
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <span className="truncate flex-1">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t-2 border-slate-100 py-4 px-8 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-bold">
          <p className="text-slate-400">★ 透過 AI 自動統計區間內漲停次數，幫助您快速整理飆股名單。</p>
          <div className="flex items-center gap-3">
             <div className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-red-100">爸爸專屬 1.4 版</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
