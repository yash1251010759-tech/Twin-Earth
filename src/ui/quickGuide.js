/**
 * Quick Guide & Operator Manual Controller
 * Provides an interactive, user-friendly help dialog and cheat sheet for Twin Earth.
 */

export function initQuickGuide() {
  const guideBtn = document.getElementById('quick-guide-btn');
  const modal = document.getElementById('quick-guide-modal');
  if (!guideBtn || !modal) return;

  const closeBtns = modal.querySelectorAll('[data-quick-guide-close]');
  const tabs = modal.querySelectorAll('.quick-guide-tab');
  const panels = modal.querySelectorAll('.quick-guide-panel');

  function openGuide() {
    modal.removeAttribute('hidden');
    modal.classList.add('is-open');
    guideBtn.setAttribute('aria-expanded', 'true');
    const firstTab = modal.querySelector('.quick-guide-tab.active');
    if (firstTab) firstTab.focus();
  }

  function closeGuide() {
    modal.classList.remove('is-open');
    modal.setAttribute('hidden', '');
    guideBtn.setAttribute('aria-expanded', 'false');
    guideBtn.focus();
  }

  guideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (modal.hasAttribute('hidden')) {
      openGuide();
    } else {
      closeGuide();
    }
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeGuide();
    });
  });

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((t) => {
        const isTarget = t === tab;
        t.classList.toggle('active', isTarget);
        t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      panels.forEach((p) => {
        const matches = p.getAttribute('data-panel') === target;
        p.classList.toggle('active', matches);
        if (matches) {
          p.removeAttribute('hidden');
        } else {
          p.setAttribute('hidden', '');
        }
      });
    });
  });

  // Keyboard shortcut listener: '?' or 'F1' or 'Escape'
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes inside text inputs or contenteditable
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return;
    }

    if (e.key === '?' || (e.shiftKey && e.key === '/') || e.key === 'F1') {
      e.preventDefault();
      if (modal.hasAttribute('hidden')) {
        openGuide();
      } else {
        closeGuide();
      }
    } else if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      e.preventDefault();
      closeGuide();
    }
  });
}
