
# 台股漲停分析助手 (Taiwan Stock Limit-Up Analyzer)

這是一個專為長輩設計的股票分析工具，利用 Google Gemini AI 的搜尋能力，自動整理 Goodinfo 與各大財經網站的漲停股資料。

## 🚀 快速開始

### 1. 設定 API Key (必要)
為了讓 AI 能夠搜尋與分析，您需要一組 Google Gemini API Key。
- 前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 申請 Key。

### 2. 環境設定

#### 💻 在本機開發 (Local)
1. 複製專案到本地。
2. 在專案根目錄新增 `.env` 檔案。
3. 貼上您的金鑰：
   ```env
   API_KEY=您的_AIzaSy_開頭的金鑰
   ```
4. 安裝並啟動：
   ```bash
   npm install
   npm run dev
   ```

#### ☁️ 部署到 Vercel
1. 將程式碼 Push 到 GitHub。
2. 在 Vercel Dashboard 匯入此專案。
3. 在 **Settings (設定)** > **Environment Variables (環境變數)** 中新增：
   - **Key**: `API_KEY`
   - **Value**: `您的_AIzaSy_開頭的金鑰`
4. 等待部署完成 (Redeploy)。

## 🛠️ 常見問題

**Q: Vercel 部署失敗，顯示 `TS2580: Cannot find name 'process'`？**
A: 請確認 `package.json` 有安裝 `@types/node`，且 `vite.config.ts` 頂部有 `import process from 'node:process';`。目前的程式碼版本已包含此修復。

**Q: 查詢時顯示「API_KEY_MISSING」？**
A: 代表您忘記在 Vercel 或 `.env` 中設定 `API_KEY`，請參照上方步驟設定。
