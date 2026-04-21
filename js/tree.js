/**
 * tree.js — Ağaç Render ve Animasyon
 * App.Tree namespace: düğüm kartları oluşturma, animasyon, SVG bağlantı çizgileri
 */

App.Tree = {

  /* ─── ANA RENDER ──────────────────────────────────────── */

  /**
   * Belirli bir seviyedeki düğümleri render eder.
   * @param {Array}   nodes    - Gösterilecek düğüm listesi
   * @param {number}  level    - Ağaçtaki derinlik (0 = kök)
   * @param {boolean} animate  - Giriş animasyonu uygulansın mı?
   */
  renderLevel(nodes, level, animate = true) {
    const layer = document.getElementById('nodes-layer');

    // Mevcut kartlar varsa çıkış animasyonuyla kaldır
    const existing = layer.querySelectorAll('.node-card');
    if (existing.length > 0 && animate) {
      existing.forEach(card => {
        card.classList.remove('state-visible', 'state-entering');
        card.classList.add('state-exiting');
      });
      // Animasyon süresi (CSS: 0.4s) geçtikten sonra yeni kartları çiz
      setTimeout(() => {
        layer.innerHTML = '';
        this._buildNodes(nodes, level, animate);
      }, 380);
    } else {
      layer.innerHTML = '';
      this._buildNodes(nodes, level, animate);
    }
  },

  /* ─── DÜĞÜM OLUŞTURMA ────────────────────────────────── */

  _buildNodes(nodes, level, animate) {
    const layer = document.getElementById('nodes-layer');

    // Ebeveyn başlığı (kök seviye değilse)
    if (App.state.currentPath.length > 0) {
      const parent = App.state.currentPath[App.state.currentPath.length - 1].node;
      const lang   = App.state.language;
      const header = document.createElement('div');
      header.className = 'level-header';
      header.innerHTML = `
        <p class="level-parent-name">${lang === 'tr' ? parent.name_tr : lang === 'de' ? parent.name_de : parent.name_en}</p>
        <div class="level-parent-line"></div>
      `;
      layer.appendChild(header);
    }

    // Kartları oluştur
    nodes.forEach((node, index) => {
      const card = this._createCard(node, level);

      // Animasyon başlangıç durumu
      card.classList.add(animate ? 'state-entering' : 'state-visible');
      layer.appendChild(card);

      if (animate) {
        // Staggered (kademeli) giriş animasyonu
        const delay = index * 65; // ms
        setTimeout(() => {
          requestAnimationFrame(() => {
            card.classList.remove('state-entering');
            card.classList.add('state-visible');
          });
        }, delay);
      }
    });

    // SVG bağlantı çizgileri — kartlar yerleşince çiz
    if (App.state.currentPath.length > 0 && nodes.length > 0) {
      const totalDelay = nodes.length * 65 + 120;
      setTimeout(() => this.redrawLines(), totalDelay);
    } else {
      document.getElementById('lines-layer').innerHTML = '';
    }
  },

  /* ─── KART OLUŞTURMA ──────────────────────────────────── */

  _createCard(node, level) {
    const lang   = App.state.language;
    const isLeaf = !node.children || node.children.length === 0;
    const name   = lang === 'tr' ? node.name_tr  : lang === 'de' ? node.name_de : node.name_en;
    const desc   = lang === 'tr' ? node.description_tr : lang === 'de' ? node.description_de : node.description_en;

    const card = document.createElement('div');
    card.className  = 'node-card' + (isLeaf ? ' is-leaf' : '');
    card.setAttribute('data-level',   level);
    card.setAttribute('data-node-id', node.id);
    card.setAttribute('role',         'button');
    card.setAttribute('tabindex',     '0');

    const ariaLabel = isLeaf
      ? (lang === 'tr' ? `${name} — detayları gör` : lang === 'de' ? `${name} — Details anzeigen` : `${name} — view details`)
      : (lang === 'tr' ? `${name} — alt kategorileri aç` : lang === 'de' ? `${name} — Unterkategorien öffnen` : `${name} — open subcategories`);
    card.setAttribute('aria-label', ariaLabel);

    const icon      = node.icon || this._fallbackIcon(level);
    const shortDesc = level <= 1 ? this._clip(desc, 85) : '';

    card.innerHTML = `
      <span class="card-icon" aria-hidden="true">${icon}</span>
      <p class="card-name">${this._escape(name)}</p>
      ${shortDesc ? `<p class="card-desc">${this._escape(shortDesc)}</p>` : ''}
      ${!isLeaf    ? `<span class="card-chevron" aria-hidden="true">›</span>` : ''}
    `;

    // Tıklama
    card.addEventListener('click', () => App.navigateTo(node));

    // Klavye: Enter / Space
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        App.navigateTo(node);
      }
    });

    return card;
  },

  /* ─── SVG BAĞLANTI ÇİZGİLERİ ────────────────────────── */

  redrawLines() {
    const svg        = document.getElementById('lines-layer');
    const stage      = document.getElementById('tree-stage');
    const nodesLayer = document.getElementById('nodes-layer');

    svg.innerHTML = '';

    const header = nodesLayer.querySelector('.level-header');
    if (!header) return;

    const stageRect  = stage.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();

    // Başlık alt-orta noktası (SVG koordinat sistemine çevir)
    const anchorX = headerRect.left + headerRect.width / 2 - stageRect.left;
    const anchorY = headerRect.bottom - stageRect.top + 10;

    const cards = nodesLayer.querySelectorAll('.node-card');
    cards.forEach((card, i) => {
      const cardRect  = card.getBoundingClientRect();
      const targetX   = cardRect.left + cardRect.width / 2 - stageRect.left;
      const targetY   = cardRect.top - stageRect.top;
      const ctrlMidY  = anchorY + (targetY - anchorY) * 0.52;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d',
        `M ${anchorX},${anchorY} C ${anchorX},${ctrlMidY} ${targetX},${ctrlMidY} ${targetX},${targetY}`
      );
      path.setAttribute('class', 'tree-line');
      // Staggered çizgi animasyonu
      path.style.animationDelay = `${i * 40}ms`;

      svg.appendChild(path);
    });
  },

  /* ─── YARDIMCI FONKSİYONLAR ──────────────────────────── */

  _clip(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.slice(0, maxLen).replace(/\s\S*$/, '') + '…';
  },

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _fallbackIcon(level) {
    const icons = ['🎼', '🎵', '🎶', '🎸', '🎹'];
    return icons[Math.min(level, icons.length - 1)];
  }
};
