/**
 * PWA Install Prompt - Shows install banner for Android (beforeinstallprompt)
 * and iOS instruction hint.
 */

let deferredPrompt = null;

export function initInstallPrompt() {
  if (localStorage.getItem('installDismissed') === '1') return;
  // Already installed as standalone?
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (navigator.standalone) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    showBanner(null, true);
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner(deferredPrompt, false);
  });
}

function showBanner(prompt, isIOS) {
  if (document.querySelector('.install-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'install-banner';

  if (isIOS) {
    banner.innerHTML = `
      <span class="install-banner-text">📱 Zum Homescreen: Teilen <strong>⎋</strong> → <strong>Zum Home-Bildschirm</strong></span>
      <button class="install-banner-dismiss" aria-label="Schließen">✕</button>
    `;
  } else {
    banner.innerHTML = `
      <span class="install-banner-text">📱 Zum Homescreen hinzufügen</span>
      <button class="install-banner-install">Installieren</button>
      <button class="install-banner-dismiss" aria-label="Schließen">✕</button>
    `;
    banner.querySelector('.install-banner-install').addEventListener('click', async () => {
      if (prompt) {
        prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === 'accepted') {
          banner.remove();
        }
      }
    });
  }

  banner.querySelector('.install-banner-dismiss').addEventListener('click', () => {
    localStorage.setItem('installDismissed', '1');
    banner.remove();
  });

  // Insert at top of body
  document.body.prepend(banner);
}
