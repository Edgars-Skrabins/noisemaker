const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]';

function stops(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.tabIndex < 0 || !el.getClientRects().length) return false;
    if (el.type === 'radio' && !el.checked) return !dialog.querySelector(`input[type="radio"][name="${el.name}"]:checked`);
    return true;
  });
}

function wire(dialog) {
  dialog.dataset.wired = 'true';
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const list = stops(dialog);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close('cancel')));
  dialog.addEventListener('close', () => {
    const opener = dialog.opener;
    dialog.opener = null;
    if (opener && opener.isConnected) opener.focus();
  });
}

export function firstStop(dialog) {
  return stops(dialog)[0] || null;
}

export function openDialog(dialog, { opener = document.activeElement, focus } = {}) {
  if (!dialog.dataset.wired) wire(dialog);
  dialog.returnValue = '';
  dialog.opener = opener;
  dialog.showModal();
  const target = focus || firstStop(dialog);
  if (target) target.focus();
}

export function confirmDialog({ title, message, confirm, opener }) {
  const dialog = document.getElementById('confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok').textContent = confirm;
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    openDialog(dialog, { opener, focus: document.getElementById('confirm-cancel') });
  });
}
