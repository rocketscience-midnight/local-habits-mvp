/**
 * Shared Modal component – creates overlay + modal card with backdrop-close.
 */

/**
 * Create a modal overlay with the given inner HTML.
 * Automatically closes on backdrop click.
 *
 * @param {string} innerHTML - HTML content for the .modal div
 * @param {Object} [options]
 * @param {string} [options.extraClass] - Extra CSS class on the .modal div
 * @param {Function} [options.onClose] - Called when modal is closed via backdrop
 * @returns {{ overlay: HTMLElement, modal: HTMLElement, close: Function }}
 */
export function createModal(innerHTML, options = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modalDiv = document.createElement('div');
  modalDiv.className = 'modal' + (options.extraClass ? ' ' + options.extraClass : '');
  modalDiv.innerHTML = innerHTML;
  overlay.appendChild(modalDiv);

  function close() {
    overlay.remove();
    options.onClose?.();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);

  return { overlay, modal: modalDiv, close };
}
