import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// 웹: 랜딩(index), 게임(play), 개인정보처리방침(privacy). 앱(--mode app): 게임과 개인정보처리방침만 dist-app/에 상대 경로로 빌드한다.
export default defineConfig(({ mode }) => mode === 'app'
  ? {
    base: './',
    build: { outDir: 'dist-app', emptyOutDir: true, chunkSizeWarningLimit: 1200, rollupOptions: { input: { play: resolve(__dirname, 'play.html'), privacy: resolve(__dirname, 'privacy.html') } } },
  }
  : {
    build: { chunkSizeWarningLimit: 1200, rollupOptions: { input: { index: resolve(__dirname, 'index.html'), play: resolve(__dirname, 'play.html'), privacy: resolve(__dirname, 'privacy.html') } } },
  });
