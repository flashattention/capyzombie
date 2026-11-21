// 터치 버튼 아이콘(SVG). 게임 그림체에 맞춰 굵은 갈색 외곽선과 플랫 색으로 그린다.
const svg = body => `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#3a2a1c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  // 로켓 포드: 비스듬히 날아가는 붉은 로켓
  rocket: svg(`<g transform="rotate(45 24 24)">
    <path d="M16 27l-5 6v5h5M32 27l5 6v5h-5" fill="#f2c14e"/>
    <path d="M19 34l2 8 3-4 3 4 2-8z" fill="#f7931e" stroke-width="2.5"/>
    <path d="M24 5c6 5 8 12 8 20v9H16v-9c0-8 2-15 8-20z" fill="#d9523a"/>
    <circle cx="24" cy="19" r="3.5" fill="#fff8ea" stroke-width="2.5"/></g>`),
  // 발 구르기: 내리찍는 카피바라 발과 충격파
  stomp: svg(`<path d="M4 43h40" />
    <path d="M7 36l-4-3M41 36l4-3M9 29l-5-1M39 29l5-1" stroke-width="2.5"/>
    <path d="M16 4h16v15c0 3-2 6-5 6h-6c-3 0-5-3-5-6z" fill="#b9824f"/>
    <path d="M11 25h26v8c0 2-2 4-4 4H15c-2 0-4-2-4-4z" fill="#7a5a3c"/>
    <path d="M19.5 29v8M28.5 29v8" stroke-width="2.5"/>`),
  // 미끼 귤: 좀비를 꾀어내는 커다란 귤
  decoy: svg(`<path d="M6 20a15 15 0 0 0 0 14M42 20a15 15 0 0 1 0 14" stroke-width="2.5"/>
    <circle cx="24" cy="28" r="13" fill="#f7931e"/>
    <circle cx="19" cy="24" r="3" fill="#ffc46b" stroke="none"/>
    <path d="M24 15c0-4 2-6 4-7"/>
    <path d="M26 12c3-4 9-4 11-1-3 3-8 3-11 1z" fill="#4f8a3c" stroke-width="2.5"/>`),
  // 미사일 난사: 부채꼴로 솟구치는 미사일 셋
  ult: svg([-32, 0, 32].map(a => `<g transform="rotate(${a} 24 42)">
    <path d="M21.5 30l2.5 8 2.5-8" fill="#f7931e" stroke-width="2.2"/>
    <path d="M24 7c3 3 4.5 7 4.5 11v12h-9V18c0-4 1.5-8 4.5-11z" fill="#fff1d6" stroke-width="2.5"/>
    <path d="M20.3 14.5h7.4" stroke="#d9523a" stroke-width="3"/></g>`).join('')),
  // B2 귤 폭격: 날개만 있는 폭격기와 떨어지는 귤 폭탄
  b2: svg(`<path d="M24 9L45 28l-6 3-5-3-5 3-5-3-5 3-5-3-6 3-6-3z" fill="#5a6070"/>
    <path d="M18 19l6-5 6 5" stroke="#8a93a6" stroke-width="2"/>
    <circle cx="24" cy="39" r="5" fill="#f7931e"/>`),
  // 점프: 위로 향하는 화살표
  jump: svg(`<path d="M24 5l15 17h-8v14H17V22H9z" fill="#f2c14e"/><path d="M15 43h18" />`),
  // 시점 전환: 눈
  view: svg(`<path d="M4 24c5-9 12-13 20-13s15 4 20 13c-5 9-12 13-20 13S9 33 4 24z" fill="#fff8ea"/>
    <circle cx="24" cy="24" r="7" fill="#3f6b5c"/><circle cx="26.5" cy="21.5" r="2.2" fill="#fff" stroke="none"/>`),
};

// 터치 버튼에 아이콘을 한 번만 넣는다. 글자는 화면 읽기 도구용 이름(aria-label)으로 남긴다.
const SLOTS = { 'sk-m2': 'rocket', 'sk-q': 'stomp', 'sk-e': 'decoy', 'sk-r': 'ult', 'sk-b': 'b2', 't-jump': 'jump', 't-view': 'view' };
export function addTouchIcons() {
  for (const [id, key] of Object.entries(SLOTS)) {
    const el = document.getElementById(id);
    if (!el || el.querySelector('.ico')) continue;
    const label = (el.querySelector('span') || el).textContent.trim().replace(/\s*×\d+$/, '');
    el.setAttribute('aria-label', label); el.title = label;
    if (el.tagName !== 'BUTTON') el.setAttribute('role', 'button');
    if (el.classList.contains('tbtn')) el.innerHTML = '';
    el.insertAdjacentHTML('afterbegin', ICONS[key]);
    if (id === 'sk-b') el.insertAdjacentHTML('beforeend', '<b class="cnt" id="sk-b-c">0</b>');
  }
}
