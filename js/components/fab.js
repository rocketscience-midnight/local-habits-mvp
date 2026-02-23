/**
 * Shared FAB (Floating Action Button) component
 */

/**
 * Create and attach a FAB to the body. Automatically removes itself
 * when the given container is cleared or detached from the DOM.
 *
 * @param {Object} options
 * @param {HTMLElement} options.container - The view container (used for auto-cleanup)
 * @param {string} [options.label='Neue Gewohnheit erstellen'] - aria-label
 * @param {Function} options.onClick - Click handler
 * @returns {HTMLButtonElement} The FAB element
 */
export function createFAB({ container, label = 'Erstellen', onClick }) {
  // Remove any existing FAB first
  document.querySelector('.fab')?.remove();

  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', label);
  fab.textContent = '+';
  fab.addEventListener('click', onClick);
  document.body.appendChild(fab);

  // Auto-cleanup when container is cleared or removed
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container) || container.innerHTML === '') {
      fab.remove();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });

  return fab;
}
