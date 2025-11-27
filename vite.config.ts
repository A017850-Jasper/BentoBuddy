import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (例如 .env 檔案中的 API_KEY)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // 設定 base 為 './' 是部署到 GitHub Pages 的關鍵，確保資源路徑正確
    base: './', 
    define: {
      // 讓前端程式碼可以讀取 process.env.API_KEY 和 process.env.BACKEND_URL
      // 加入 || '' 以防止 undefined 導致 JSON.stringify 出錯
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL || ''),
    },
  };
});