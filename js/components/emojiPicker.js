/**
 * Shared Emoji Picker component
 */

/** Default emoji categories for habits */
export const HABIT_EMOJI_CATEGORIES = [
  { name: 'Fitness', emojis: ['💪', '🏃', '🚴', '🏊', '🧘', '⚽', '🎾', '🏋️', '🤸', '🚶'] },
  { name: 'Essen', emojis: ['💧', '🥗', '🍎', '🥦', '🍳', '☕', '🫖', '🥤', '🧃', '🍌'] },
  { name: 'Geist', emojis: ['📚', '🧠', '✍️', '📝', '🎵', '🎨', '🙏', '😴', '🧘', '💭'] },
  { name: 'Arbeit', emojis: ['💻', '📧', '📊', '🎯', '⏰', '📅', '✅', '📞', '🗂️', '💡'] },
  { name: 'Zuhause', emojis: ['🧹', '🛏️', '🪴', '🍳', '👕', '🗑️', '🐕', '🐈', '🧺', '🪥'] },
  { name: 'Natur', emojis: ['🌿', '🌻', '☀️', '🌲', '🦋', '🌈', '🍃', '🌊', '🐦', '⭐'] },
];

/** Emoji categories for tasks */
export const TASK_EMOJI_CATEGORIES = [
  { name: 'Haushalt', emojis: ['🧹', '🧺', '🪣', '🧽', '🗑️', '🚿', '🛁', '🪟', '🧴', '💡'] },
  { name: 'Küche', emojis: ['🍳', '🧊', '🫧', '🔥', '🧈', '🥘', '🍽️', '☕', '🫖', '🧃'] },
  { name: 'Garten', emojis: ['🌿', '🌻', '🪴', '🌳', '🍂', '🪓', '🧑‍🌾', '💧', '🌾', '🪨'] },
  { name: 'Technik', emojis: ['💻', '🔋', '📱', '🔧', '🪛', '🔌', '💾', '🖨️', '📡', '🛠️'] },
  { name: 'Sonstiges', emojis: ['📋', '📦', '🏠', '🚗', '🐕', '👕', '💊', '📬', '🔑', '🎒'] },
];

/**
 * Render emoji picker HTML for given categories and currently selected emoji.
 *
 * @param {Array} categories - Array of { name, emojis }
 * @param {string} selectedEmoji - Currently selected emoji
 * @returns {string} HTML string
 */
export function renderEmojiPickerHTML(categories, selectedEmoji) {
  return categories.map(cat => `
    <div class="emoji-cat">
      <div class="emoji-cat-label">${cat.name}</div>
      <div class="emoji-cat-grid">
        ${cat.emojis.map(e => `
          <button type="button" class="emoji-btn ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Attach click handlers to emoji buttons inside a container.
 * Updates selection state and calls onChange with the picked emoji.
 *
 * @param {HTMLElement} container - Element containing .emoji-btn elements
 * @param {Function} onChange - Called with the selected emoji string
 */
export function attachEmojiPickerHandlers(container, onChange) {
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onChange(btn.dataset.emoji);
    });
  });
}
