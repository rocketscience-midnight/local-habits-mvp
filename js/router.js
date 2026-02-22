/**
 * Simple hash-based SPA router
 * Routes: #today, #garden, #stats, #settings
 */

const routes = {};
const cleanupFns = [];

/**
 * Register a cleanup function to run before each view transition
 */
export function registerCleanup(fn) {
  cleanupFns.push(fn);
}

/**
 * Register a route with its render function
 * @param {string} hash - Route hash (e.g. 'today')
 * @param {Function} renderFn - Async function that renders into the container
 */
export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

/**
 * Navigate to a specific route
 */
export function navigate(hash) {
  window.location.hash = hash;
}

/**
 * Initialize the router - listen for hash changes and render
 */
export function initRouter() {
  const container = document.getElementById('app-content');

  async function handleRoute() {
    const hash = window.location.hash.slice(1) || 'today';
    const renderFn = routes[hash];

    if (!renderFn) {
      navigate('today');
      return;
    }

    // Update active nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.route === hash);
    });

    // Run cleanup functions before rendering new view
    for (const fn of cleanupFns) fn();

    // Clear and render
    container.innerHTML = '';
    await renderFn(container);
  }

  window.addEventListener('hashchange', handleRoute);

  // Setup nav tab clicks
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      navigate(tab.dataset.route);
    });
  });

  // Initial route
  handleRoute();
}
