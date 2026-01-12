
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
  Clock,
  Bug
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState<FilterState>({
    startDate: defaultStart,
    endDate: today,
    minPrice: 10,
    maxPrice: 80,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 999
  });

  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockLimitUpRecord[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const result = await fetchLimitUpRanking(filters);
      setStocks(result.stocks);
      setSources(result.sources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name.includes('Price') ? Number(value) : value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b-4 border-red-600 py-5 px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg">
              <TrendingUp className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">台股漲停分析器 v2.0</h1>
              <p className="text-xs font-bold text-slate-400">當前年份: 2026 | 已切換至穩定模型</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest">統計日期</label>
              <div className="space-y-2">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-red-500 outline-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest">股價區間 (元)</label>
              <div className="flex items-center gap-3">
                <input type="number" name="minPrice" value={filters.minPrice} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-center" />
                <span className="text-slate-300 font-black">~</span>
                <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-center" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest">漲停次數篩選</label>
              <select 
                value={filters.minLimitUp} 
                onChange={(e) => setFilters({...filters, minLimitUp: Number(e.target.value)})}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-red-500"
              >
                <option value="1">至少 1 次漲停</option>
                <option value="2">至少 2 次漲停 (強勢)</option>
                <option value="3">至少 3 次漲停 (極強)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-100 active:scale-95"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                {loading ? "AI 正在分析中..." : "開始統計"}
              </button>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <div className="text-center py-24 bg-white/40 rounded-[40px] border-4 border-dashed border-slate-200">
            <Clock className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-300">請設定條件後開始分析</h3>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-red-100 p-12 rounded-[40px] text-center shadow-2xl animate-in zoom-in-95 duration-300">
            {error === "QUOTA_EXCEEDED" ? (
              <>
                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Coffee className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4">AI 正在排隊中</h3>
                <p className="text-slate-500 font-bold text-lg mb-10 leading-relaxed">
                  因為目前使用的是免費通道，Google 限制每分鐘的查詢頻率。<br/>
                  請休息 **60 秒**，再按一次「開始統計」就可以了。
                </p>
                <button onClick={handleSearch} className="px-12 py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 flex items-center gap-3 mx-auto shadow-lg"><RefreshCw className="w-6 h-6" /> 我休息好了，再試一次</button>
              </>
            ) : error === "API_KEY_MISSING" ? (
              <div className="space-y-4">
                <Key className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-2xl font-black">找不到 API 金鑰</h3>
                <p className="font-bold text-slate-400">請確認 Vercel 後台是否已設定 API_KEY 環境變數。</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Bug className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-2xl font-black text-red-600">偵測到技術錯誤</h3>
                <div className="p-6 bg-slate-50 rounded-2xl text-left border border-slate-200">
                  <p className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Error Detail:</p>
                  <code className="text-sm font-bold text-slate-700 break-all">{error}</code>
                </div>
                <button onClick={handleSearch} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors">嘗試重新連線</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-between items-end px-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800">統計結果</h2>
                <p className="text-sm font-bold text-slate-400">依據漲停次數由高到低排列</p>
              </div>
              <div className="bg-red-600 text-white px-5 py-2 rounded-full font-black shadow-lg">
                共 {stocks.length} 檔
              </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b-2 border-slate-100">
                  <tr>
                    <th className="px-8 py-6 font-black text-slate-400 text-sm uppercase tracking-widest">股票資訊</th>
                    <th className="px-8 py-6 font-black text-slate-400 text-sm uppercase tracking-widest text-center">價格</th>
                    <th className="px-8 py-6 font-black text-red-600 text-sm uppercase tracking-widest text-center bg-red-50/50">累計漲停</th>
                    <th className="px-8 py-6 font-black text-slate-400 text-sm uppercase tracking-widest">產業</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stocks.length > 0 ? stocks.map(stock => (
                    <tr key={stock.symbol} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-7">
                        <div className="font-black text-xl text-slate-900 group-hover:text-red-600 transition-colors">{stock.name}</div>
                        <div className="text-sm font-bold text-slate-400 font-mono tracking-wider">{stock.symbol} · {stock.market}</div>
                      </td>
                      <td className="px-8 py-7 text-center font-black font-mono text-slate-700 text-xl">${stock.lastClosePrice}</td>
                      <td className="px-8 py-7 text-center bg-red-50/20">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-red-600 text-white text-2xl font-black shadow-xl shadow-red-200 transform group-hover:scale-110 transition-transform">
                          {stock.limitUpCount}
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <span className="text-sm font-black px-4 py-2 bg-slate-100 rounded-xl text-slate-600 border border-slate-200">{stock.sector}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-32 text-center">
                        <Info className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-black text-2xl">此區間內沒有符合條件的股票</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {sources.length > 0 && (
              <div className="p-8 bg-white/60 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <Info className="w-4 h-4" />
                  <span className="text-sm font-black uppercase tracking-widest">AI 參考來源</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-blue-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm">
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
