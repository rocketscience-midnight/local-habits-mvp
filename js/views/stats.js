/**
 * Stats View - Statistics, heatmaps, streaks, completion rates
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, daysAgo, getDayOfWeek, getWeekStart, isHabitDueToday, countByDate, calculateStreak, calculateBestStreak, WEEKDAYS_MONDAY } from '../utils/dates.js';

export async function renderStats(container) {
  const habits = await habitRepo.getAll();
  const allCompletions = await habitRepo.getAllCompletions();
  const today = todayString();

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="placeholder-screen">
        <div class="placeholder-emoji">📊</div>
        <h2>Noch keine Statistiken</h2>
        <p>Erstelle zuerst eine Gewohnheit!</p>
      </div>
    `;
    return;
  }

  // Build completions index per habit
  const compByHabit = {};
  for (const c of allCompletions) {
    if (!compByHabit[c.habitId]) compByHabit[c.habitId] = [];
    compByHabit[c.habitId].push(c);
  }

  // === Overall Stats ===
  const todayCompletions = allCompletions.filter(c => c.date === today);
  const todayCompleted = new Set();
  const todayCounts = {};
  for (const c of todayCompletions) {
    todayCounts[c.habitId] = (todayCounts[c.habitId] || 0) + 1;
  }
  for (const h of habits) {
    if ((todayCounts[h.id] || 0) >= (h.targetPerDay || 1)) todayCompleted.add(h.id);
  }

  // Average completion rate (last 30 days)
  let totalRate = 0;
  let longestStreak = 0;
  let longestStreakHabit = '';
  const habitStats = [];

  for (const h of habits) {
    const dates = (compByHabit[h.id] || []).map(c => c.date);
    const streak = calculateStreak(dates, h);
    const bestStreak = calculateBestStreak(dates, h);
    const rate7 = calcCompletionRate(h, dates, 7);
    const rate30 = calcCompletionRate(h, dates, 30);
    totalRate += rate30;

    if (streak > longestStreak) {
      longestStreak = streak;
      longestStreakHabit = h.emoji + ' ' + h.name;
    }

    habitStats.push({ habit: h, streak, bestStreak, rate7, rate30, dates });
  }

  const avgRate = Math.round(totalRate / habits.length);

  // Render
  let html = `
    <h1 class="stats-title">Statistiken</h1>

    <div class="stats-section">
      <div class="stats-section-header">📈 Übersicht</div>
      <div class="stats-overview-grid">
        <div class="stats-overview-card">
          <div class="stats-overview-value">${habits.length}</div>
          <div class="stats-overview-label">Gewohnheiten</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-overview-value">${todayCompleted.size}/${habits.filter(h => isHabitDueToday(h, today)).length}</div>
          <div class="stats-overview-label">Heute erledigt</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-overview-value">${avgRate}%</div>
          <div class="stats-overview-label">∅ Erfolgsrate</div>
        </div>
        <div class="stats-overview-card">
          <div class="stats-overview-value">🔥 ${longestStreak}</div>
          <div class="stats-overview-label">${longestStreakHabit || '–'}</div>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-header">🔥 Streaks</div>
      <div class="stats-streaks-list">
        ${habitStats.map(s => `
          <div class="stats-streak-card">
            <span class="stats-streak-emoji">${s.habit.emoji || '✨'}</span>
            <div class="stats-streak-info">
              <div class="stats-streak-name">${s.habit.name}</div>
              <div class="stats-streak-numbers">
                <span>🔥 ${s.streak} aktuell</span>
                <span>🏆 ${s.bestStreak} bester</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-header">📊 Erfolgsrate</div>
      <div class="stats-rates-list">
        ${habitStats.map(s => `
          <div class="stats-rate-card">
            <div class="stats-rate-header">
              <span>${s.habit.emoji || '✨'} ${s.habit.name}</span>
            </div>
            <div class="stats-rate-row">
              <span class="stats-rate-label">7 Tage</span>
              <div class="stats-rate-bar"><div class="stats-rate-fill" style="width:${s.rate7}%"></div></div>
              <span class="stats-rate-pct">${s.rate7}%</span>
            </div>
            <div class="stats-rate-row">
              <span class="stats-rate-label">30 Tage</span>
              <div class="stats-rate-bar"><div class="stats-rate-fill stats-rate-fill-30" style="width:${s.rate30}%"></div></div>
              <span class="stats-rate-pct">${s.rate30}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-header">🗓️ Aktivität (12 Wochen)</div>
      ${habitStats.map(s => renderHeatmap(s)).join('')}
    </div>

    <div class="stats-section" id="focus-archive">
      <div class="stats-section-header">🎯 Wochenfokus-Archiv</div>
      <div class="focus-archive-list" id="focus-archive-list">
        <p style="color:#8A8A8A;text-align:center;">Laden...</p>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Load weekly focus archive
  await renderFocusArchive(container.querySelector('#focus-archive-list'));
}

/**
 * Render weekly focus archive
 */
async function renderFocusArchive(container) {
  const allFocus = await habitRepo.getAllWeeklyFocus();
  if (!allFocus || allFocus.length === 0) {
    container.innerHTML = '<p style="color:#8A8A8A;text-align:center;font-style:italic;">Noch keine Wochenmottos gespeichert</p>';
    return;
  }
  // Sort newest first
  const sorted = allFocus.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  container.innerHTML = sorted.map(f => `
    <div class="focus-archive-item">
      <span class="focus-archive-week">${f.weekKey}</span>
      <span class="focus-archive-text">"${f.text}"</span>
    </div>
  `).join('');
}

/**
 * Calculate completion rate for last N days
 */
function calcCompletionRate(habit, completionDates, days) {
  const dateCount = countByDate(completionDates);
  const target = habit.targetPerDay || 1;
  let due = 0, completed = 0;
  for (let i = 0; i < days; i++) {
    const d = daysAgo(i);
    if (isHabitDueToday(habit, d)) {
      due++;
      if ((dateCount[d] || 0) >= target) completed++;
    }
  }
  return due > 0 ? Math.round(completed / due * 100) : 0;
}

/**
 * Render a GitHub-style heatmap grid for one habit (last 12 weeks)
 */
function renderHeatmap(stats) {
  const { habit, dates } = stats;
  const target = habit.targetPerDay || 1;
  const dateCount = countByDate(dates);
  const today = todayString();

  // Build 12-week grid: columns = weeks, rows = Mon-Sun
  // Find the Monday 11 weeks ago
  const todayDate = new Date(today + 'T12:00:00');
  const todayDow = todayDate.getDay(); // 0=Sun
  const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;
  const thisMonday = new Date(todayDate);
  thisMonday.setDate(thisMonday.getDate() - mondayOffset);
  const startMonday = new Date(thisMonday);
  startMonday.setDate(startMonday.getDate() - 11 * 7);

  let cells = '';
  for (let row = 0; row < 7; row++) { // Mon=0, Tue=1, ..., Sun=6
    for (let col = 0; col < 12; col++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(cellDate.getDate() + col * 7 + row);
      const ds = cellDate.toISOString().slice(0, 10);
      if (ds > today) {
        cells += `<div class="heatmap-cell heatmap-future"></div>`;
        continue;
      }
      const count = dateCount[ds] || 0;
      let level = 0;
      if (count > 0 && count < target) level = 1;
      else if (count >= target) level = 2;
      cells += `<div class="heatmap-cell heatmap-level-${level}" title="${ds}: ${count}/${target}"></div>`;
    }
  }

  return `
    <div class="stats-heatmap-card">
      <div class="stats-heatmap-title">${habit.emoji || '✨'} ${habit.name}</div>
      <div class="heatmap-grid">
        <div class="heatmap-labels">
          ${WEEKDAYS_MONDAY.map(d => `<div class="heatmap-label">${d}</div>`).join('')}
        </div>
        <div class="heatmap-cells">${cells}</div>
      </div>
    </div>
  `;
}
