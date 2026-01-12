
import React, { useState } from 'react';
import { 
  TrendingUp, Search, Loader2, Zap, BarChart3, Download, Calendar, ArrowRight, AlertCircle, RefreshCcw, Info, CircleDollarSign
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
    if (filters.maxPrice <= filters.minPrice) {
      setError("股價設定有誤：最高價必須大於最低價");
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
        setError("這段時間內沒有符合您條件的股票，請放寬區間再試。");
      }
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError("系統尚未設定 API 金鑰 (API_KEY)。請檢查環境變數。");
      } else {
        setError(err.message || "搜尋失敗，請檢查網路或稍後再試。");
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
    link.download = `台股強勢股_${filters.startDate}_${filters.endDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2 rounded-xl">
              <TrendingUp className="text-white w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-800">台股強勢分析 <span className="text-red-600">爸爸版</span></h1>
          </div>
          <button onClick={() => window.location.reload()} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RefreshCcw className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* 設定區塊 */}
        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-lg border border-slate-100">
          <div className="space-y-10">
            {/* 時間 */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-400 flex items-center gap-2">1. 選擇日期範圍</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:ring-2 ring-red-500/20 transition-all border border-slate-100" />
                <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:ring-2 ring-red-500/20 transition-all border border-slate-100" />
              </div>
            </div>

            {/* 次數按鈕 */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-400 flex items-center gap-2">2. 漲停次數 (篩選條件)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['全部', '0-10次', '11-20次', '21-30次'] as const).map(label => (
                  <button
                    key={label}
                    onClick={() => handleRangeChange(label)}
                    className={`py-5 rounded-2xl font-black text-lg transition-all border-2 ${rangeLabel === label ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 股價區間輸入 */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-400 flex items-center gap-2">3. 設定股價區間 (自行輸入)</label>
              <div className="grid grid-cols-2 gap-6 bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最低價 ($)</span>
                  <input 
                    type="number" 
                    value={filters.minPrice} 
                    onChange={e => setFilters(p => ({...p, minPrice: Number(e.target.value)}))} 
                    className="w-full px-6 py-4 bg-white rounded-2xl font-black text-xl outline-none border border-amber-200 focus:border-amber-500 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-amber-600 ml-2 uppercase tracking-widest">最高價 ($)</span>
                  <input 
                    type="number" 
                    value={filters.maxPrice} 
                    onChange={e => setFilters(p => ({...p, maxPrice: Number(e.target.value)}))} 
                    className="w-full px-6 py-4 bg-white rounded-2xl font-black text-xl outline-none border border-amber-200 focus:border-amber-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full py-8 bg-red-600 hover:bg-red-700 text-white font-black text-2xl rounded-3xl shadow-xl shadow-red-100 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-4"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-7 h-7" />}
              {loading ? "AI 正在全網搜尋強勢股..." : "開始智慧分析"}
            </button>
          </div>
        </section>

        {/* 錯誤顯示 */}
        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-700 animate-in fade-in">
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* 結果清單 */}
        {hasSearched && !loading && stocks.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-slate-400" />
                分析結果 ({stocks.length} 檔)
              </h3>
              <button 
                onClick={exportForTrading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg"
              >
                <Download className="w-4 h-4 text-red-500" /> 匯出清單
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {stocks.map((stock, i) => (
                <div key={stock.symbol} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-all group flex flex-col md:flex-row items-center justify-between">
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black text-slate-100 group-hover:text-red-50 transition-colors w-12 text-center">{i+1}</span>
                    <div>
                      <div className="flex items-baseline gap-3">
                        <h4 className="text-2xl font-black text-slate-800">{stock.name}</h4>
                        <span className="text-lg font-bold text-slate-400 font-mono">{stock.symbol}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-lg text-slate-500">{stock.sector}</span>
                        <span className="text-[10px] font-black bg-red-50 px-3 py-1 rounded-lg text-red-500">{stock.market}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 mt-6 md:mt-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase">參考價</p>
                      <p className="text-2xl font-black text-slate-600">${stock.lastClosePrice}</p>
                    </div>
                    <div className="bg-red-600 text-white px-10 py-6 rounded-[2rem] text-center shadow-lg shadow-red-100 group-hover:scale-105 transition-transform">
                      <p className="text-[10px] font-black text-red-200 uppercase">漲停次數</p>
                      <p className="text-4xl font-black">{stock.limitUpCount}<span className="text-sm ml-1 opacity-60">次</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 參考來源 */}
            {sources.length > 0 && (
              <div className="p-8 bg-slate-100/50 rounded-[2.5rem] border border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info className="w-4 h-4" /> 數據同步來源
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:text-red-600 transition-colors shadow-sm">
                      <span className="font-bold text-sm truncate">{s.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-30" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 py-4 z-40">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-400">★ 建議輸入較長的日期區間以獲得更準確的次數統計。</p>
          <span className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black">爸爸專屬 1.5</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
