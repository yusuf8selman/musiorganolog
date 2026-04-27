/* visitor.js — Yerel ziyaretçi sayacı (localStorage tabanlı) */
(function () {
  const KEY   = 'musiorganolog_visits';
  const count = (parseInt(localStorage.getItem(KEY) || '0') + 1);
  localStorage.setItem(KEY, count);
  const fmt = count.toLocaleString();
  document.addEventListener('DOMContentLoaded', function () {
    const badge = document.getElementById('visitor-count');
    const stat  = document.getElementById('stat-visitors');
    if (badge) badge.textContent = fmt;
    if (stat)  stat.textContent  = fmt;
  });
})();
