
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
  ChevronDown,
  Key,
  Info
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 預設往前推 3 天，減少 AI 搜尋負擔
  const defaultStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState<FilterState>({
    startDate: defaultStartDate,
    endDate: today,
    minPrice: 10,
    maxPrice: 200,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 20
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
      console.error("Catch 到的錯誤:", err);
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
    alert("已複製表格內容！");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 標題 */}
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

      {/* 篩選器 */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">統計區間</label>
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
                <option value="1-999">全部 (1次以上)</option>
                <option value="2-999">強勢 (2次以上)</option>
                <option value="3-999">極強 (3次以上)</option>
                <option value="custom">自定義次數</option>
              </select>
              {limitUpMode === 'custom' && (
                 <div className="flex gap-2 mt-2">
                   <input type="number" name="minLimitUp" value={filters.minLimitUp} onChange={handleInputChange} className="w-full px-2 py-1 border border-red-200 rounded font-bold text-center" />
                   <span className="text-slate-300">~</span>
                   <input type="number" name="maxLimitUp" value={filters.maxLimitUp} onChange={handleInputChange} className="w-full px-2 py-1 border border-red-200 rounded font-bold text-center" />
                 </div>
              )}
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => loadData(filters)}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? "搜尋中" : "開始分析"}
              </button>
            </div>
          </div>
        </div>

        {/* 內容顯示區 */}
        {!hasSearched ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Info className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">請設定條件後點擊「開始分析」</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-100 p-8 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-red-800 mb-4">搜尋出了一點問題</h3>
            
            <div className="max-w-lg mx-auto bg-white p-4 rounded-xl border border-red-200 text-left font-mono text-sm text-red-600 mb-6 break-all">
              {error}
            </div>

            <div className="max-w-lg mx-auto text-left text-slate-600 bg-white/50 p-6 rounded-xl border border-slate-200">
              <p className="font-bold mb-3 text-slate-800">💡 給爸爸的排除建議：</p>
              <ul className="list-decimal list-inside space-y-2 font-medium">
                <li>請確認您已在 Vercel 後台設定好正確的 <code className="bg-slate-100 px-1 rounded">API_KEY</code>。</li>
                <li>如果是「Failed to fetch」，請重新整理頁面再試一次。</li>
                <li>這可能是因為搜尋量太大導致 AI 暫時休息，請稍候 30 秒。</li>
              </ul>
              <button onClick={() => window.location.reload()} className="mt-6 w-full py-2 border-2 border-slate-300 rounded-lg hover:bg-slate-100 font-bold transition-colors">
                重新整理頁面
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-slate-800">統計結果 ({stocks.length})</h2>
              {stocks.length > 0 && (
                <button onClick={copyToClipboard} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all">
                  <Copy className="w-4 h-4" /> 複製表格
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-500">股票</th>
                      <th className="px-6 py-4 font-black text-slate-500 text-center">收盤價</th>
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
                          <span className="inline-block w-10 h-10 leading-10 rounded-full bg-red-600 text-white font-black shadow-md shadow-red-100">
                            {stock.limitUpCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-600">{stock.sector}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold">沒有符合條件的股票</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-400">參考來源：</span>
                {sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
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
