import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// 웹: 랜딩(index)과 게임(play) 두 페이지. 앱(--mode app): 게임 페이지만 dist-app/에 상대 경로로 빌드한다.
export default defineConfig(({ mode }) => mode === 'app'
  ? {
    base: './',
    build: { outDir: 'dist-app', emptyOutDir: true, chunkSizeWarningLimit: 1200, rollupOptions: { input: { play: resolve(__dirname, 'play.html') } } },
  }
  : {
    build: { chunkSizeWarningLimit: 1200, rollupOptions: { input: { index: resolve(__dirname, 'index.html'), play: resolve(__dirname, 'play.html') } } },
  });
