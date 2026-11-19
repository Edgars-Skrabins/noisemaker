const TIP_DELAY = 350;
const GAP = 8;

let tooltip = null;
let help = {};
let tipButton = null;
let tipPinned = false;
let tipTimer = 0;

function placeTip(btn) {
  const r = btn.getBoundingClientRect();
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let left = r.right + GAP;
  let top = r.top + r.height / 2 - h / 2;
  if (left + w > vw - GAP) left = (btn.closest('.dock') || btn).getBoundingClientRect().left - w - GAP;
  if (left < GAP) {
    left = Math.min(vw - w - GAP, Math.max(GAP, r.left + r.width / 2 - w / 2));
    top = r.bottom + 6;
    if (top + h > vh - GAP) top = r.top - h - 6;
  }
  tooltip.style.left = Math.round(left) + 'px';
  tooltip.style.top = Math.round(Math.min(vh - h - GAP, Math.max(GAP, top))) + 'px';
}

function showTip(btn, pinned = false) {
  clearTimeout(tipTimer);
  if (tipButton && tipButton !== btn) hideTip();
  const title = document.createElement('strong');
  title.textContent = btn.dataset.name;
  tooltip.replaceChildren(title, document.createTextNode(help[btn.dataset.helpFor]));
  tooltip.hidden = false;
  placeTip(btn);
  btn.setAttribute('aria-describedby', tooltip.id);
  btn.classList.add('open');
  tipButton = btn;
  tipPinned = pinned;
}

export function hideTip() {
  clearTimeout(tipTimer);
  if (!tipButton) return false;
  tipButton.removeAttribute('aria-describedby');
  tipButton.classList.remove('open');
  tooltip.hidden = true;
  tipButton = null;
  tipPinned = false;
  return true;
}

function infoButton(el) {
  const name = el.textContent.trim();
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info';
  btn.dataset.helpFor = el.dataset.help;
  btn.dataset.name = name;
  btn.setAttribute('aria-label', `About ${name}`);
  btn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-info"/></svg>';
  if (el.classList.contains('prop-label')) {
    const text = document.createElement('span');
    text.id = el.id;
    text.textContent = name;
    el.removeAttribute('id');
    el.replaceChildren(text, btn);
  } else {
    (el.closest('label') || el).after(btn);
  }
  return btn;
}

function wireButton(btn) {
  btn.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || tipPinned) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(btn), TIP_DELAY);
  });
  btn.addEventListener('pointerleave', () => {
    clearTimeout(tipTimer);
    if (tipButton === btn && !tipPinned) hideTip();
  });
  btn.addEventListener('focus', () => {
    if (btn.matches(':focus-visible')) showTip(btn);
  });
  btn.addEventListener('blur', () => {
    if (tipButton === btn) hideTip();
  });
  btn.addEventListener('click', () => {
    if (tipButton === btn && tipPinned) hideTip();
    else showTip(btn, true);
  });
}

export function setupHelp(texts, { tip, scrollers = [] }) {
  help = texts;
  tooltip = tip;
  document.querySelectorAll('[data-help]').forEach((el) => wireButton(infoButton(el)));
  document.addEventListener('pointerdown', (e) => {
    if (tipButton && !e.target.closest('.info')) hideTip();
  });
  scrollers.forEach((el) => el.addEventListener('scroll', hideTip, { passive: true }));
  window.addEventListener('resize', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });
}
