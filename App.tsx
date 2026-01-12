
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
  Key
} from 'lucide-react';
import { StockLimitUpRecord, FilterState, GroundingSource } from './types';
import { fetchLimitUpRanking } from './services/geminiService';

const App: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  // 預設往前推 5 天
  const defaultStartDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState<FilterState>({
    startDate: defaultStartDate,
    endDate: today,
    minPrice: 10,
    maxPrice: 200,
    marketTypes: ['上市', '上櫃'],
    minLimitUp: 1,
    maxLimitUp: 20
  });

  const [limitUpMode, setLimitUpMode] = useState<string>('custom');
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
      if (err.message === "API_KEY_MISSING") {
        setError("API_KEY_MISSING");
      } else {
        setError("連線稍微慢一點，請再按一次搜尋試試看。");
      }
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
    
    switch (mode) {
      case 'all':
        setFilters(prev => ({ ...prev, minLimitUp: 1, maxLimitUp: 999 }));
        break;
      case '0-10':
        setFilters(prev => ({ ...prev, minLimitUp: 0, maxLimitUp: 10 }));
        break;
      case '10-20':
        setFilters(prev => ({ ...prev, minLimitUp: 10, maxLimitUp: 20 }));
        break;
      case '20-30':
        setFilters(prev => ({ ...prev, minLimitUp: 20, maxLimitUp: 30 }));
        break;
      case '30+':
        setFilters(prev => ({ ...prev, minLimitUp: 30, maxLimitUp: 999 }));
        break;
      case 'custom':
        break;
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
    const header = "股票代號\t名稱\t收盤價\t累積漲停\t產業\n";
    const body = stocks.map(s => `${s.symbol}\t${s.name}\t${s.lastClosePrice}\t${s.limitUpCount}\t${s.sector}`).join('\n');
    navigator.clipboard.writeText(header + body);
    alert("表格已經複製好了！");
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-900 font-sans">
      
      {/* 頂部標題區 */}
      <header className="bg-white border-b-4 border-red-600 py-5 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-xl shadow-lg">
              <TrendingUp className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">台股漲停統計助手</h1>
              <p className="text-sm text-slate-500 font-bold mt-1">
                整合 Goodinfo 與 MoneyDJ 資料，專為長輩設計
              </p>
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            {['上市', '上櫃'].map(m => (
              <button
                key={m}
                onClick={() => toggleMarketType(m)}
                className={`px-5 py-2 rounded-lg text-lg font-bold transition-all border-2 ${
                  filters.marketTypes.includes(m) 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 設定區域 */}
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-black">爸爸的查詢條件</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 日期設定 */}
            <div className="space-y-2">
              <label className="text-base font-bold text-slate-600 block">
                <Calendar className="w-4 h-4 inline mr-1 mb-1" />
                統計期間
              </label>
              <div className="flex gap-2">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} 
                  className="w-full px-3 py-3 border-2 border-slate-300 rounded-xl text-lg font-bold focus:border-red-500 outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} 
                  className="w-full px-3 py-3 border-2 border-slate-300 rounded-xl text-lg font-bold focus:border-red-500 outline-none" />
              </div>
            </div>

            {/* 價格設定 */}
            <div className="space-y-2">
              <label className="text-base font-bold text-slate-600 block">
                股價範圍 (元)
              </label>
              <div className="flex items-center gap-2">
                <input type="number" name="minPrice" value={filters.minPrice} onChange={handleInputChange} 
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-xl font-bold text-center focus:border-red-500 outline-none" />
                <span className="text-slate-400 font-bold">~</span>
                <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleInputChange} 
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-xl font-bold text-center focus:border-red-500 outline-none" />
              </div>
            </div>

            {/* 次數設定 */}
            <div className="space-y-2">
              <label className="text-base font-bold text-slate-600 block">
                累積漲停次數
              </label>
              <div className="relative">
                <select 
                  value={limitUpMode} 
                  onChange={handleLimitUpModeChange}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-lg font-bold appearance-none bg-white focus:border-red-500 outline-none text-slate-700 pr-10"
                >
                  <option value="all">全部 (只要有漲停)</option>
                  <option value="0-10">10 次以下 (0~10)</option>
                  <option value="10-20">10 ~ 20 次</option>
                  <option value="20-30">20 ~ 30 次</option>
                  <option value="30+">30 次以上</option>
                  <option value="custom">自行輸入區間</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {limitUpMode === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="number" 
                    name="minLimitUp" 
                    value={filters.minLimitUp} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border-2 border-red-200 bg-red-50/50 rounded-xl text-xl font-black text-red-600 text-center focus:border-red-500 outline-none" 
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input 
                    type="number" 
                    name="maxLimitUp" 
                    value={filters.maxLimitUp} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border-2 border-red-200 bg-red-50/50 rounded-xl text-xl font-black text-red-600 text-center focus:border-red-500 outline-none" 
                  />
                </div>
              )}
            </div>

            {/* 搜尋按鈕 */}
            <div className="flex items-end">
              <button 
                onClick={() => loadData(filters)}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xl font-black rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    統計中...
                  </>
                ) : (
                  <>
                    <Search className="w-6 h-6" />
                    開始統計
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 結果列表 */}
      <main className="max-w-5xl mx-auto pb-12 px-4">
        {!hasSearched ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-200 border-dashed">
            <TrendingUp className="w-24 h-24 text-slate-200 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-400">準備好了嗎？</h2>
            <p className="text-slate-400 font-bold mt-2 text-lg">調整上方的日期與價格，按下「開始統計」幫爸爸找強勢股！</p>
          </div>
        ) : error ? (
           <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-200 text-center">
             <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                {error === 'API_KEY_MISSING' ? <Key className="w-10 h-10 text-red-600" /> : <AlertCircle className="w-10 h-10 text-red-600" />}
             </div>
             
             {error === 'API_KEY_MISSING' ? (
                <>
                  <h3 className="text-2xl font-black text-red-800 mb-2">還沒設定 AI 金鑰喔！</h3>
                  <p className="text-lg text-red-700 font-bold mb-4">請設定 API_KEY。</p>
                </>
             ) : (
                <>
                  <h3 className="text-2xl font-black text-red-800 mb-2">連線有點問題</h3>
                  <p className="text-lg text-red-700 font-bold">{error}</p>
                </>
             )}
           </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  統計結果
                  <span className="bg-red-100 text-red-700 text-lg px-3 py-1 rounded-full border border-red-200">
                    共 {stocks.length} 檔
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                   {sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" className="text-xs font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                        <ExternalLink className="w-3 h-3" /> {s.title}
                      </a>
                   ))}
                </div>
              </div>
              
              {stocks.length > 0 && (
                <button 
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  複製內容
                </button>
              )}
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                 <div className="w-16 h-16 border-8 border-slate-100 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
                 <h3 className="text-xl font-black text-slate-800 mb-2">AI 正在努力閱讀 Goodinfo 網站...</h3>
                 <p className="text-slate-500 font-bold">這需要一點時間，因為 AI 正在一頁一頁幫您找 {filters.startDate} 到 {filters.endDate} 的資料。</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-200">
                        <th className="px-6 py-5 text-lg font-black text-slate-600 whitespace-nowrap">股票名稱</th>
                        <th className="px-6 py-5 text-lg font-black text-slate-600 text-center whitespace-nowrap">最新股價</th>
                        <th className="px-6 py-5 text-lg font-black text-red-600 text-center whitespace-nowrap bg-red-50">期間漲停</th>
                        <th className="px-6 py-5 text-lg font-black text-slate-600 whitespace-nowrap">產業類別</th>
                        <th className="px-6 py-5 text-lg font-black text-slate-600 text-center whitespace-nowrap">市場</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stocks.length > 0 ? stocks.map((stock, index) => (
                        <tr key={stock.symbol} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xl font-black text-slate-900">{stock.name}</span>
                              <span className="text-base font-bold text-slate-400 font-mono tracking-wider">{stock.symbol}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-xl font-bold font-mono text-slate-700 block">${stock.lastClosePrice}</span>
                          </td>
                          <td className="px-6 py-5 text-center bg-red-50/30">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-600 text-white text-2xl font-black shadow-md shadow-red-200">
                              {stock.limitUpCount}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-base font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-md">
                              {stock.sector}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`text-sm font-bold px-2 py-1 rounded border ${stock.market === '上市' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                              {stock.market}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-24 text-center">
                             <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                             <p className="text-xl font-black text-slate-400">沒有找到符合條件的股票。</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
