
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入當前模式下的環境變數
  // process.cwd() 指向專案根目錄
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // 這樣設定後，程式碼中的 process.env.API_KEY 就會被替換成實際的金鑰
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
