// 모바일 앱(Capacitor) 연동: 뒤로 가기 버튼, 앱이 백그라운드로 갈 때 일시정지, 웹 전용 UI 숨기기.
// 웹 브라우저에서는 탭이 가려질 때 일시정지만 한다.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { suspendAudio, resumeAudio } from './audio.js';

export const isNative = Capacitor.isNativePlatform();

// hooks.back(): 처리했으면 true. false면 앱을 닫는다.
// hooks.suspend(): 게임을 일시정지한다.
export function setupNative(hooks) {
  if (isNative) document.body.classList.add('app');
  const hide = () => { hooks.suspend(); suspendAudio(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else resumeAudio(); });
  if (!isNative) return;
  App.addListener('backButton', () => { if (!hooks.back()) App.exitApp(); });
  App.addListener('pause', hide);
  App.addListener('resume', resumeAudio);
}
