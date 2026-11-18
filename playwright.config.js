import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests', timeout:60000, workers:1,
  use:{baseURL:'http://127.0.0.1:5187',channel:process.env.MOSAIC_BROWSER || 'chromium',launchOptions:{args:['--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',url:'http://127.0.0.1:5187',reuseExistingServer:!process.env.CI}
});

