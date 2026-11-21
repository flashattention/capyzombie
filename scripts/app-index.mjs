// 앱 빌드 뒷정리: Capacitor는 index.html을 시작 페이지로 쓰므로 play.html의 이름을 바꾼다.
import { renameSync, existsSync } from 'node:fs';
const dir = new URL('../dist-app/', import.meta.url).pathname;
if (existsSync(dir + 'play.html')) renameSync(dir + 'play.html', dir + 'index.html');
console.log('dist-app/index.html 준비 완료');
