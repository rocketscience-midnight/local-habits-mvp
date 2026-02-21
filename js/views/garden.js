/**
 * Garden View - Placeholder for virtual garden
 */

export async function renderGarden(container) {
  container.innerHTML = `
    <div class="placeholder-screen">
      <div class="placeholder-emoji">🌱</div>
      <h2>Garten kommt bald</h2>
      <p>Dein virtueller Garten wächst mit deinen Gewohnheiten!</p>
    </div>
  `;
}
