// 그래픽 품질: 휴대폰에서 끊기지 않게 해상도 배율과 그림자를 조절한다.
// 렌더러를 만들 때 한 번 적용하고, 설정을 바꾸면 페이지를 다시 불러온다(안티에일리어싱은 나중에 못 바꾼다).
import * as T from 'three';
import { t } from './i18n.js';
import { loadProgress, saveProgress } from './save.js';

export const QUALITIES = [
  { id: 'low', name: t('낮음'), desc: t('그림자를 끄고 해상도를 낮춰 가장 부드럽게 돌아갑니다.'), pr: 1, aa: false, shadows: false, shadowSize: 512 },
  { id: 'mid', name: t('보통'), desc: t('단순한 그림자와 적당한 해상도. 대부분의 휴대폰에 맞습니다.'), pr: 1.5, aa: false, shadows: true, soft: false, shadowSize: 1024 },
  { id: 'high', name: t('높음'), desc: t('부드러운 그림자와 선명한 화면. 성능이 좋은 기기용입니다.'), pr: 2, aa: true, shadows: true, soft: true, shadowSize: 2048 },
];
export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1 && !matchMedia('(pointer: fine)').matches;
const defaultQuality = () => (isTouchDevice() ? 'mid' : 'high');

export function getQuality() {
  const id = loadProgress().settings.quality;
  return QUALITIES.find(q => q.id === id) || QUALITIES.find(q => q.id === defaultQuality());
}
export function setQuality(id) {
  const p = loadProgress(); p.settings.quality = id; saveProgress(p);
  location.reload();
}
// 현재 품질로 렌더러를 만든다
export function makeRenderer(opts) {
  const q = getQuality();
  const r = new T.WebGLRenderer({ antialias: q.aa, powerPreference: 'high-performance', ...opts });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  r.shadowMap.enabled = q.shadows;
  r.shadowMap.type = q.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
  return r;
}
