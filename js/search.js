/**
 * search.js — Arama Fonksiyonu
 * App.Search namespace: anlık filtreleme, dropdown, klavye navigasyonu
 * Fuzzy search: %70 benzerlik eşiği ile yaklaşık eşleşme desteği
 */

App.Search = {

  _index: [],   // [{ node, path: [node, ...] }]
  _lang: 'tr',

  /* ─── INIT ─────────────────────────────────────────────── */

  init(flatIndex) {
    this._index = flatIndex;
    this._lang  = App.state.language;

    const input    = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');

    // Her tuşa basışta filtrele
    input.addEventListener('input', () => this._onInput());

    // Odaklandığında varsa önceki sonuçları tekrar göster
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) this._onInput();
    });

    // Klavye navigasyonu (↑ ↓ Enter Escape)
    input.addEventListener('keydown', (e) => this._onKeyDown(e));

    // Başka yere tıklanınca dropdown'ı kapat
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-wrap')) {
        this._hideDropdown();
      }
    });
  },

  /* ─── DİL ──────────────────────────────────────────────── */

  setLanguage(lang) {
    this._lang = lang;
    const val = document.getElementById('search-input').value.trim();
    if (val.length >= 1) this._onInput();
  },

  /* ─── INPUT HANDLER ─────────────────────────────────────── */

  _onInput() {
    const input = document.getElementById('search-input');
    const query = input.value.trim().toLowerCase();

    if (query.length < 1) {
      this._hideDropdown();
      return;
    }

    const results = this._search(query);
    this._showResults(results, query);
    input.setAttribute('aria-expanded', 'true');
  },

  /* ─── LEVENSHTEIN MESAFE ────────────────────────────────── */

  _levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    // Optimizasyon: iki satırlık DP
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        curr[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  },

  /* ─── FUZZY SKOR (0–1) ──────────────────────────────────── */

  /**
   * Bir isim ile sorgu arasındaki en yüksek benzerlik skorunu döner.
   * 1.0 = tam alt-dizi eşleşmesi, 0.0 = hiç benzerlik yok.
   */
  _fuzzyScore(name, query) {
    if (!name) return 0;

    // 1. Tam alt-dizi eşleşmesi → maksimum skor
    if (name.includes(query)) {
      // Baştan başlıyorsa biraz daha yüksek sırala
      return name.startsWith(query) ? 1.05 : 1.0;
    }

    // Kısa sorgular (1-2 harf) için sadece includes yeterli
    if (query.length < 3) return 0;

    // 2. Tüm isimle Levenshtein benzerliği
    const fullSim = 1 - this._levenshtein(query, name) / Math.max(query.length, name.length, 1);

    // 3. Her kelimeyle ayrı ayrı karşılaştır (en iyi skoru al)
    const words = name.split(/[\s\-\/·]+/).filter(w => w.length >= 2);
    const wordSim = words.length > 0
      ? Math.max(...words.map(w =>
          1 - this._levenshtein(query, w) / Math.max(query.length, w.length, 1)
        ))
      : 0;

    // 4. Sliding window: sorgu, ismin herhangi bir alt-bölümüne benziyor mu?
    let windowSim = 0;
    if (query.length <= name.length) {
      const wl = query.length;
      for (let i = 0; i <= name.length - wl; i++) {
        const slice = name.slice(i, i + wl);
        const sim   = 1 - this._levenshtein(query, slice) / wl;
        if (sim > windowSim) windowSim = sim;
      }
    }

    return Math.max(fullSim, wordSim, windowSim);
  },

  /* ─── ARAMA ALGORİTMASI ─────────────────────────────────── */

  _search(query) {
    const THRESHOLD = 0.70;   // %70 benzerlik eşiği

    return this._index
      .map(item => {
        const tr = item.node.name_tr.toLowerCase();
        const en = item.node.name_en.toLowerCase();
        const de = (item.node.name_de || '').toLowerCase();

        const score = Math.max(
          this._fuzzyScore(tr, query),
          this._fuzzyScore(en, query),
          this._fuzzyScore(de, query)
        );

        return { item, score };
      })
      .filter(({ score }) => score >= THRESHOLD)
      .sort((a, b) => b.score - a.score)   // en iyi eşleşme üstte
      .slice(0, 10)
      .map(({ item, score }) => ({ ...item, _score: score }));
  },

  /* ─── DROPDOWN GÖSTER ───────────────────────────────────── */

  _showResults(results, query) {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '';

    if (results.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-no-results';
      li.setAttribute('role', 'option');
      li.textContent = this._lang === 'tr'
        ? 'Sonuç bulunamadı'
        : this._lang === 'de'
          ? 'Keine Ergebnisse gefunden'
          : 'No results found';
      dropdown.appendChild(li);
      dropdown.hidden = false;
      return;
    }

    results.forEach((item, i) => {
      const lang    = this._lang;
      const name    = lang === 'tr' ? item.node.name_tr
                    : lang === 'de' ? item.node.name_de
                    : item.node.name_en;
      const pathStr = item.path
        .slice(0, -1)
        .map(n => lang === 'tr' ? n.name_tr : lang === 'de' ? n.name_de : n.name_en)
        .join(' › ');

      const isFuzzy = item._score < 1.0;   // tam eşleşme değil

      const li = document.createElement('li');
      li.className = 'search-result-item' + (isFuzzy ? ' search-result-fuzzy' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('id', `sr-${i}`);
      li.setAttribute('aria-selected', 'false');

      li.innerHTML = `
        <div class="result-name">${this._highlight(name, query)}</div>
        <div class="result-path">${this._escapeHtml(pathStr)}</div>
      `;

      li.addEventListener('click', () => this._selectItem(item));
      dropdown.appendChild(li);
    });

    dropdown.hidden = false;
  },

  /* ─── KLAVYE NAVİGASYONU ────────────────────────────────── */

  _onKeyDown(e) {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown.hidden) return;

    const items       = Array.from(dropdown.querySelectorAll('.search-result-item'));
    const activeEl    = dropdown.querySelector('[aria-selected="true"]');
    let   activeIndex = items.indexOf(activeEl);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._setActive(items, Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._setActive(items, Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Seçili öğe varsa onu, yoksa listedeki ilk sonucu seç
      const target = activeEl || items[0];
      if (target) target.click();
    } else if (e.key === 'Escape') {
      this._hideDropdown();
    }
  },

  _setActive(items, index) {
    items.forEach((item, i) => {
      item.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    items[index]?.scrollIntoView({ block: 'nearest' });
  },

  /* ─── SEÇİM ─────────────────────────────────────────────── */

  _selectItem(item) {
    const lang = this._lang;
    document.getElementById('search-input').value =
      lang === 'tr' ? item.node.name_tr
    : lang === 'de' ? item.node.name_de
    : item.node.name_en;
    this._hideDropdown();
    App.navigateToInstrument(item.path);
  },

  /* ─── DROPDOWN KAPAT ────────────────────────────────────── */

  _hideDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.hidden = true;
    document.getElementById('search-input').setAttribute('aria-expanded', 'false');
  },

  /* ─── YARDIMCI ──────────────────────────────────────────── */

  /** Arama terimini vurgula — tam eşleşme varsa işaretle */
  _highlight(text, query) {
    const lower = text.toLowerCase();
    const idx   = lower.indexOf(query.toLowerCase());
    if (idx < 0) {
      // Fuzzy eşleşme: tam alt-dizi yok, ismi olduğu gibi göster
      return this._escapeHtml(text);
    }
    return (
      this._escapeHtml(text.slice(0, idx)) +
      `<mark style="background:rgba(212,175,55,0.32);color:inherit;border-radius:2px;padding:0 1px;">` +
      this._escapeHtml(text.slice(idx, idx + query.length)) +
      `</mark>` +
      this._escapeHtml(text.slice(idx + query.length))
    );
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
