/**
 * radial.js — Musiorganolog Radial Tree
 * D3.js v7 ile tam ekran interaktif radyal ağaç.
 * Her ana grup benzersiz renge sahip; dallar aynı renk tonunu miras alır.
 */

App.Radial = {

  /* ─── state ──────────────────────────────────────────────── */
  _svg:         null,
  _gMain:       null,
  _gLinks:      null,
  _gNodes:      null,
  _gCenter:     null,
  _zoom:        null,
  _root:        null,
  _w:           0,
  _h:           0,
  _allExpanded: false,
  _expanding:   false,

  DEPTH_STEP: 240,
  DUR:        650,

  /* Ana grup renkleri — her dalın rengi buradan miras alır */
  GROUP_COLORS: {
    'kordofonlar':    '#e8834a',   // sıcak amber-turuncu
    'aerofonlar':     '#4ab0e8',   // gökyüzü mavisi
    'idiofonlar':     '#e8c84a',   // altın sarısı
    'membranofonlar': '#4ae89e',   // zümrüt yeşili
    'elektrofonlar':  '#b04ae8',   // mor/eflatun
  },

  /* ─── init ───────────────────────────────────────────────── */
  init(data) {
    this._w = window.innerWidth;
    this._h = window.innerHeight;

    this._svg = d3.select('#tree-stage')
      .append('svg')
      .attr('width',  '100%')
      .attr('height', '100%');

    this._panning    = false; // sürükleme aktifken kullanılır

    // ── Dokunuş / fare ayrımı ─────────────────────────────────
    // Son pointer tipini izle: 'mouse' | 'touch' | 'pen'
    // Dokunuşla gelmiş sahte mouseenter'da hover uygulanmaz.
    this._lastPointerType = 'mouse';
    window.addEventListener('pointerdown', e => {
      this._lastPointerType = e.pointerType || 'mouse';
    }, { passive: true });

    // Dokunuşta açık kalmış tooltip + hover glowunu temizle
    this._svg.node().addEventListener('touchstart', () => {
      this._tooltip(null, null, false);
      this._clearAllHover();
    }, { passive: true });

    this._zoom = d3.zoom()
      .scaleExtent([0.12, 10])                      // min: ağaç kaybolmasın
      .on('start', ev => {
        if (ev.sourceEvent) {
          this._panning = true;
        }
      })
      .on('zoom', ev => {
        this._gMain.attr('transform', ev.transform);
        const k = ev.transform.k;
        if (ev.sourceEvent && k <= 0.125) this._showBoundFeedback();
        this._updateDeepLabelOpacity(k);
      })
      .on('end', ev => {
        if (ev.sourceEvent) {
          this._panning = false;
          this._springBack(ev.transform);
        }
      });

    this._svg.call(this._zoom)
      .on('dblclick.zoom', null);

    // ── Double-tap zoom (mobil — dblclick.zoom iptal edildiği için) ───
    let _lastTap = 0;
    this._svg.on('touchend.dbtap', (ev) => {
      const now = Date.now();
      if (now - _lastTap < 300 && ev.changedTouches.length === 1) {
        ev.preventDefault();
        const touch = ev.changedTouches[0];
        const rect  = this._svg.node().getBoundingClientRect();
        const pt    = [touch.clientX - rect.left, touch.clientY - rect.top];
        this._svg.transition().duration(280)
          .call(this._zoom.scaleBy, 1.8, pt);
      }
      _lastTap = now;
    });

    // Kontrol butonlarını bağla
    const self = this;
    document.getElementById('r-ctrl-in')?.addEventListener('click',     () => self.zoomIn());
    document.getElementById('r-ctrl-out')?.addEventListener('click',    () => self.zoomOut());
    document.getElementById('r-ctrl-center')?.addEventListener('click', () => self.centerTree());

    this._gMain  = this._svg.append('g');
    this._gLinks = this._gMain.append('g').attr('class', 'r-links-g');
    this._gNodes = this._gMain.append('g').attr('class', 'r-nodes-g');
    // Merkez butonu en üstte (nodeların üzerinde) kalmalı
    this._gCenter = this._gMain.append('g').attr('class', 'r-center-btn-g');

    const vRoot = {
      id: '_root', name_tr: '', name_en: '', name_de: '',
      icon: '', description_tr: '', description_en: '', description_de: '',
      children: data
    };
    this._root = d3.hierarchy(vRoot);

    this._root.descendants().forEach(d => {
      if (d.depth >= 1 && d.children) {
        d._children = d.children;
        d.children  = null;
      }
      d.x0 = 0; d.y0 = 0;
    });

    this._initCenterBtn();
    this._update(this._root);
    // İlk açılışta ağacı ortala
    setTimeout(() => this._zoomToFit(null, true), 120);

    // Resize: debounce (250 ms) + zoomToFit
    let _resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        const newW = window.innerWidth;
        const newH = window.innerHeight;
        if (newW === this._w && newH === this._h) return; // boyut değişmedi
        this._w = newW;
        this._h = newH;
        this._zoomToFit(null, false);
      }, 250);
    });
  },

  /* ─── layout ─────────────────────────────────────────────── */
  /*
   * Sektör bazlı özel layout:
   *   • Her ana grup dairenin eşit dilimini sahiplenir (5 grup → 72°'lik sektör)
   *   • Grupların açısal konumu HİÇBİR ZAMAN değişmez — alt dallar açılsa da sabit
   *   • Alt dallar kendi grubunun sektörü içinde, merkez yönünden dışa doğru yayılır
   *   • Dallar komşu gruplara taşmaz
   */
  _layout() {
    const root   = this._root;
    root.x = 0; root.y = 0;

    const depth1 = root.children || [];
    const n      = depth1.length;
    if (!n) return;

    const TWO_PI    = 2 * Math.PI;
    const GAP_RAD   = 8 * Math.PI / 180;      // 8° boşluk gruplar arası
    const available = TWO_PI - n * GAP_RAD;

    // Her grubun alt ağacı için gereken minimum arc
    const reqs     = depth1.map(d => this._requiredArc(d, 1));
    const minArc   = available / n;            // eşit dağılım alt sınırı
    const adjusted = reqs.map(r => Math.max(r, minArc));
    const totalAdj = adjusted.reduce((s, r) => s + r, 0);
    // Toplam tahsis > available ise orantılı olarak küçült
    const scale    = totalAdj > available ? available / totalAdj : 1.0;
    const groupArcs = adjusted.map(r => r * scale);

    // İlk grubun başlangıcını -π'den (üstten) değil, simetrik olarak ayarla
    let a = -Math.PI + GAP_RAD / 2;
    depth1.forEach((d, i) => {
      const arc = groupArcs[i];
      d.x = a + arc / 2;
      d.y = this.DEPTH_STEP;
      this._layoutSubtree(d, d.x, arc, 2);
      a += arc + GAP_RAD;
    });
  },

  /*
   * Bir düğümün alt ağacı için gereken MINIMUM açısal yayı (radyan) hesaplar.
   * Aşağıdan yukarı (leaf → root) çalışır:
   *   • Yaprak düğüm  → tek dairenin gerektirdiği minimum açı  (MIN_GAP / r)
   *   • İç düğüm      → tüm çocukların gerektirdiği yayların toplamı
   * Bu sayede her üst düğüm, alt ağacının ne kadar yer istediğini tam olarak bilir.
   */
  _requiredArc(node, depth) {
    // Her derinlik için daire çapı + küçük boşluk (px)
    const MIN_GAP = [0, 0, 36, 26, 22, 20][depth] || 20;
    const r       = depth * this.DEPTH_STEP;
    const kids    = node.children;
    if (!kids || !kids.length) return MIN_GAP / r;           // yaprak
    return kids.reduce((s, c) => s + this._requiredArc(c, depth + 1), 0);
  },

  /*
   * Bir düğümün görünür alt ağacını verilen açısal dilim içine yerleştirir.
   * Dağıtım ağırlıkları artık yaprak sayısı değil, _requiredArc tabanlı;
   * bu sayede her dal tam ihtiyacı kadar alan alır ve üst üste binme olmaz.
   */
  _layoutSubtree(node, center, arc, depth) {
    const kids = node.children;
    if (!kids || !kids.length) return;

    // Her çocuğun alt ağacı için gereken arc (bottom-up)
    const reqs     = kids.map(c => this._requiredArc(c, depth));
    const totalReq = reqs.reduce((s, r) => s + r, 0);

    // ÖNEMLİ: arc'ı ASLA aşma — aksi halde komşu gruba taşar.
    // Tahsis yetmezse çocuklar orantılı olarak sıkıştırılır (intra-group),
    // ama hiçbir düğüm ebeveynin sektörünün dışına çıkmaz.
    let a = center - arc / 2;

    kids.forEach((child, i) => {
      const w      = totalReq > 0 ? (reqs[i] / totalReq) * arc
                                  : arc / kids.length;
      child.x      = a + w / 2;
      child.y      = depth * this.DEPTH_STEP;
      this._layoutSubtree(child, child.x, w, depth + 1);
      a += w;
    });
  },

  /* ─── update ─────────────────────────────────────────────── */
  _update(source) {
    this._layout();

    const dur   = this.DUR;
    const nodes = this._root.descendants().filter(d => d.depth > 0);
    const links = this._root.links().filter(l => l.source.depth > 0);

    const diagonal = d3.linkRadial()
      .angle(d  => d.x)
      .radius(d => d.y);

    /* ── LINKS ── */
    const link = this._gLinks.selectAll('path.r-link')
      .data(links, d => d.target.data.id);

    const linkEnter = link.enter().append('path')
      .attr('class', 'r-link')
      .attr('d', () => {
        const o = { x: source.x0 ?? 0, y: source.y0 ?? 0 };
        return diagonal({ source: o, target: o });
      })
      .attr('opacity', 0)
      .style('stroke', d => this._groupColor(d.target) + '70');

    link.merge(linkEnter)
      .style('stroke', d => this._groupColor(d.target) + '70')
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr('d', diagonal)
      .attr('opacity', 1);

    link.exit()
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr('d', () => {
        const o = { x: source.x, y: source.y };
        return diagonal({ source: o, target: o });
      })
      .attr('opacity', 0)
      .remove();

    /* ── NODES ── */
    const node = this._gNodes.selectAll('g.r-node')
      .data(nodes, d => d.data.id);

    const nodeEnter = node.enter().append('g')
      .attr('class', d => this._nodeClass(d))
      .attr('transform', () => {
        const [px, py] = this._pt(source.x0 ?? 0, source.y0 ?? 0);
        return `translate(${px},${py})`;
      })
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('click',      (ev, d) => this._click(ev, d))
      .on('mouseenter', (ev, d) => { this._onHoverIn(ev, d);  this._tooltip(ev, d, true);  })
      .on('mouseleave', (ev, d) => { this._onHoverOut(ev, d); this._tooltip(null, null, false); });

    // ring (depth-1 only)
    nodeEnter.filter(d => d.depth === 1)
      .append('circle').attr('class', 'r-ring').attr('r', 0);

    // circle
    nodeEnter.append('circle').attr('class', 'r-circle').attr('r', 0);

    // Emoji icon kaldırıldı — renk sistemi yeterli tanımlayıcı

    // label
    nodeEnter.append('text').attr('class', 'r-label').attr('opacity', 0);

    /* ── merge & animate ── */
    const nodeUpdate = node.merge(nodeEnter);

    nodeUpdate
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr('transform', d => {
        const [x, y] = this._pt(d.x, d.y);
        return `translate(${x},${y})`;
      })
      .attr('opacity', 1);

    nodeUpdate.attr('class', d => this._nodeClass(d));

    // ring
    nodeUpdate.select('.r-ring')
      .style('stroke', d => this._groupColor(d) + '55')
      .attr('r', d => this._r(d) + 8);   // r direkt — transition çakışmasını önler

    // circle — fill & stroke by group color + depth
    nodeUpdate.select('.r-circle')
      .style('stroke',       d => this._circleStroke(d))
      .style('stroke-width', d => d.depth === 1 ? '2.5' : '1.5')
      .style('fill',         d => this._circleFill(d))
      .style('filter',       d => d.depth === 1
        ? `drop-shadow(0 0 12px ${this._groupColor(d)}66)`
        : null)
      .attr('r', d => this._r(d));        // r direkt — transition çakışmasını önler


    // label — coloured by group
    nodeUpdate.select('.r-label')
      .style('fill', d => this._labelColor(d))
      .style('opacity', null)          // önceki zoom gizlemesini temizle
      .transition().duration(dur)
      .attr('opacity', 1)
      .attr('dy', '0.32em')
      .each((d, i, elems) => {
        const el     = d3.select(elems[i]);
        const r      = this._r(d) + 9;

        if (d.depth >= 3) {
          /* ── radyal güneş ışını stili: depth 3+ tüm nodelar ──
             Ana dal (depth 1) ve 2. dal (depth 2) hariç hepsi.
             Layout d.x aralığı: [-π, +π]  (0 = tepe, clockwise)
             Sağ yarı (d.x ≥ 0):  deg ∈ [-90°, 90°] → okunabilir
             Sol yarı (d.x < 0):  aynalı açı deg+180 kullan.     */
          const deg = d.x * 180 / Math.PI - 90;
          const gap = this._r(d) + 5;
          if (d.x >= 0) {
            el.attr('transform', `rotate(${deg}) translate(${gap},0)`)
              .attr('text-anchor', 'start')
              .attr('x', null).attr('y', null);
          } else {
            const mirDeg = deg + 180;
            const ox = gap * Math.sin(d.x);
            const oy = -gap * Math.cos(d.x);
            el.attr('transform', `translate(${ox},${oy}) rotate(${mirDeg})`)
              .attr('text-anchor', 'end')
              .attr('x', null).attr('y', null);
          }
          el.text(this._truncate(this._name(d.data)));
        } else {
          /* ── depth 1-2: yatay etiket (büyük kategoriler) ── */
          const sin = Math.sin(d.x);
          const cos = Math.cos(d.x);
          let lx = 0, ly = 0, anchor = 'middle';
          if (Math.abs(sin) > 0.15) {
            lx     = sin > 0 ? r : -r;
            anchor = sin > 0 ? 'start' : 'end';
          } else {
            ly     = -cos * r;
          }
          el.attr('transform', null)
            .attr('x', lx).attr('y', ly).attr('text-anchor', anchor)
            .text(this._name(d.data));
        }
      });

    /* ── exit ── */
    node.exit()
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr('transform', () => {
        const [x, y] = this._pt(source.x, source.y);
        return `translate(${x},${y})`;
      })
      .attr('opacity', 0)
      .remove();

    this._root.each(d => { d.x0 = d.x; d.y0 = d.y; });

    // Mevcut zoom'a göre depth 3+ etiket görünürlüğünü güncelle
    const curK = this._svg.node().__zoom?.k ?? 1;
    this._updateDeepLabelOpacity(curK);
  },

  /* ─── click ──────────────────────────────────────────────── */
  _click(ev, d) {
    ev.stopPropagation();

    if (!d._children && !d.children) {
      // Breadcrumb için kökten yaprağa giden yol (D3 ancestors() ters sırada döner)
      const path = d.ancestors().reverse().map(a => a.data);
      App.openModal(d.data, path);
      return;
    }

    if (d.children) {
      // Kapatırken tüm alt dalları sıfırla — yeniden açıldığında temiz gelir
      d.children.forEach(c => this._collapseAll(c));
      d._children = d.children;
      d.children  = null;
    } else {
      d.children  = d._children;
      d._children = null;
    }

    this._update(d);
  },

  /* Alt ağacı tamamen kapat (özyinelemeli) */
  _collapseAll(d) {
    if (d.children) {
      d.children.forEach(c => this._collapseAll(c));
      d._children = d.children;
      d.children  = null;
    }
  },

  /* ─── hover ──────────────────────────────────────────────── */
  _onHoverIn(ev, d) {
    // Dokunuştan gelen sahte mouseenter'ı yoksay
    if (this._lastPointerType !== 'mouse') return;
    this._applyHoverIn(ev.currentTarget, d);
  },

  _onHoverOut(ev, d) {
    this._applyHoverOut(ev.currentTarget, d);
  },

  // Gerçek hover uygula (element referansı ile — clearAllHover'dan da çağrılır)
  _applyHoverIn(el, d) {
    const col = this._groupColor(d);
    d3.select(el).select('.r-circle')
      .style('stroke', col)
      .style('stroke-width', d.depth === 1 ? '2.5' : '2')
      .style('filter', `drop-shadow(0 0 16px ${col}99) brightness(1.25)`);
    d3.select(el).select('.r-label')
      .style('fill', col);
    this._hoveredEl = el;
    this._hoveredD  = d;
  },

  _applyHoverOut(el, d) {
    d3.select(el).select('.r-circle')
      .style('stroke', this._circleStroke(d))
      .style('stroke-width', null)
      .style('filter', d.depth === 1
        ? `drop-shadow(0 0 10px ${this._groupColor(d)}55)`
        : null);
    d3.select(el).select('.r-label')
      .style('fill', this._labelColor(d));
    this._hoveredEl = null;
    this._hoveredD  = null;
  },

  // Tüm açık hover stillerini sıfırla (dokunuşta çağrılır)
  _clearAllHover() {
    if (this._hoveredEl && this._hoveredD) {
      this._applyHoverOut(this._hoveredEl, this._hoveredD);
    }
    // Center hover
    if (this._gCenter) this._gCenter.classed('r-center-hover', false);
  },

  /* ─── zoom ───────────────────────────────────────────────── */
  /* depth 3+ etiketler zoom'dan bağımsız her zaman görünür —
     _updateDeepLabelOpacity artık kullanılmıyor ama çağrılar
     güvenli olsun diye boş bırakıldı.                         */
  _updateDeepLabelOpacity(_k) { /* no-op */ },

  /* ─── label truncation ───────────────────────────────────────
     Yaprak etiketleri max 26 karakter; aşarsa '…' ile kesilir.  */
  _truncate(str, max = 26) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  },

  _visiblePoints(d) {
    const pts = [];
    const walk = node => {
      if (node.depth > 0) pts.push(this._pt(node.x, node.y));
      if (node.children) node.children.forEach(walk);
    };
    walk(d ?? this._root);
    return pts;
  },

  _zoomToFit(d, immediate = false) {
    const pts = this._visiblePoints(d);
    if (!pts.length) return;

    const pad  = d ? 170 : 150;
    const xs   = pts.map(p => p[0]);
    const ys   = pts.map(p => p[1]);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;

    const bw    = maxX - minX;
    const bh    = maxY - minY;
    const scale = Math.min(this._w / bw, this._h / bh, 1.8) * 0.88;
    const tx    = this._w / 2 - scale * (minX + maxX) / 2;
    const ty    = this._h / 2 - scale * (minY + maxY) / 2;

    const target = d3.zoomIdentity.translate(tx, ty).scale(scale);

    if (immediate) {
      // D3 zoom event dispatch yerine doğrudan state + transform ata
      // (throttled iframe gibi ortamlarda event dispatch atlanabilir)
      this._svg.node().__zoom = target;
      this._gMain.attr('transform', target.toString());
      this._updateDeepLabelOpacity(scale);
    } else {
      this._svg.transition()
        .duration(750)
        .ease(d3.easeCubicInOut)
        .call(this._zoom.transform, target);
    }
  },

  /* ─── tooltip ────────────────────────────────────────────── */
  _tooltip(ev, d, show) {
    let tip = document.getElementById('r-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'r-tooltip';
      document.body.appendChild(tip);
    }
    // Dokunuş cihazında tooltip gösterme
    if (!show || !d || this._lastPointerType !== 'mouse') { tip.hidden = true; return; }

    const isLeaf = !d._children && !d.children;
    const name   = this._name(d.data);
    const desc   = this._desc(d.data);
    const col    = this._groupColor(d);

    tip.style.borderColor = col + '80';
    tip.innerHTML = `<strong style="color:${col}">${name}</strong>${
      desc && isLeaf
        ? `<br><span>${desc.slice(0, 90)}${desc.length > 90 ? '…' : ''}</span>`
        : ''}`;
    tip.hidden = false;
    tip.style.left = (ev.clientX + 14) + 'px';
    tip.style.top  = (ev.clientY - 12) + 'px';
  },

  /* ─── language update ────────────────────────────────────── */
  setLanguage() {
    const self = this;
    this._gNodes.selectAll('.r-label').text(function(d) {
      return self._name(d.data);
    });
  },

  /* ─── search: expand path ────────────────────────────────── */
  expandPath(pathArray) {
    this._root.each(d => {
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (d.data.id === pathArray[i].id && d._children) {
          d.children  = d._children;
          d._children = null;
        }
      }
    });

    this._update(this._root);

    const leafId = pathArray[pathArray.length - 1].id;

    setTimeout(() => {
      let leafD = null;
      this._root.each(d => { if (d.data.id === leafId) leafD = d; });

      if (leafD) {
        this._zoomToFit(leafD.parent ?? leafD);

        setTimeout(() => {
          this._gNodes.selectAll('g.r-node')
            .filter(d => d.data.id === leafId)
            .select('.r-circle')
            .classed('r-highlighted', true);
          setTimeout(() => {
            this._gNodes.selectAll('.r-circle.r-highlighted')
              .classed('r-highlighted', false);
          }, 2500);
        }, 400);

        if (!leafD._children && !leafD.children) {
          const path = leafD.ancestors().reverse().map(a => a.data);
          setTimeout(() => App.openModal(leafD.data, path), 900);
        }
      }
    }, this.DUR + 80);
  },

  /* ─── breadcrumb: verilen id'li düğüme zoom yap ──────────── */
  focusNodeById(id) {
    let target = null;
    this._root.each(d => { if (d.data.id === id) target = d; });
    if (target) this._zoomToFit(target, false);
  },

  /* ─── helpers ────────────────────────────────────────────── */

  _pt(angle, radius) {
    return [radius * Math.sin(angle), -radius * Math.cos(angle)];
  },

  _r(d) {
    if (d.depth === 1) return 24;
    if (d.depth === 2) return 16;
    if (d.depth === 3) return 11;
    return 8;
  },

  /** Verilen node'un derinliğine göre grup renginin şeffaflığı */
  _circleStroke(d) {
    const col = this._groupColor(d);
    if (d.depth === 1) return col;                // %100
    if (d.depth === 2) return col + 'cc';         // %80
    if (d.depth === 3) return col + '99';         // %60
    return col + '66';                            // %40
  },

  _circleFill(d) {
    const col = this._groupColor(d);
    if (d.depth === 1) return col + '18';         // çok şeffaf tint
    if (d.depth === 2) return 'var(--bg-card)';
    if (d.depth === 3) return 'var(--bg-mid)';
    return 'var(--bg-deep)';
  },

  _labelColor(d) {
    const col = this._groupColor(d);
    if (d.depth === 1) return col;
    if (d.depth === 2) return col + 'dd';
    if (d.depth === 3) return col + 'aa';
    return col + '88';
  },

  _nodeClass(d) {
    let c = 'r-node';
    if (d.depth === 1)                  c += ' r-main';
    if (!d._children && !d.children)   c += ' r-leaf';
    if (d.children)                     c += ' r-open';
    return c;
  },

  /** Depth-1 ataya çıkarak grup rengini döndür */
  _groupColor(d) {
    let node = d;
    while (node && node.depth > 1) node = node.parent;
    if (node && node.depth === 1) return this.GROUP_COLORS[node.data.id] || '#d4af37';
    return '#d4af37';
  },

  /* ─── pan spring-back (devre dışı — kullanıcı serbestçe gezinebilir) */
  _springBack(_t) {},

  /** Görünür ağacın yaklaşık max yarıçapını döndürür */
  _treeRadius() {
    const pts = this._visiblePoints(null);
    if (!pts.length) return this.DEPTH_STEP * 5;
    const maxR = Math.max(...pts.map(p => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
    return maxR + this.DEPTH_STEP;
  },

  /** Sınır vurgusunu kısa süreliğine göster */
  _showBoundFeedback() {
    const el = document.getElementById('r-pan-feedback');
    if (!el) return;
    el.classList.add('active');
    clearTimeout(this._fbTimer);
    this._fbTimer = setTimeout(() => el.classList.remove('active'), 500);
  },

  /* ─── kontrol butonları ──────────────────────────────────── */

  zoomIn() {
    this._svg.transition().duration(300).ease(d3.easeCubicOut)
      .call(this._zoom.scaleBy, 1.6);
  },

  zoomOut() {
    this._svg.transition().duration(300).ease(d3.easeCubicOut)
      .call(this._zoom.scaleBy, 1 / 1.6);
  },

  centerTree() {
    this._zoomToFit(null, false);
  },

  _name(data) {
    const l = App.state.language;
    return (l === 'tr' ? data.name_tr : l === 'de' ? data.name_de : data.name_en) || '';
  },

  _desc(data) {
    const l = App.state.language;
    return (l === 'tr' ? data.description_tr : l === 'de' ? data.description_de : data.description_en) || '';
  },

  /* ─── merkez butonu ──────────────────────────────────────── */

  _initCenterBtn() {
    const R   = 22;   // daire yarıçapı (px, SVG koordinatı) — depth-1 düğümlerden küçük
    const g   = this._gCenter;
    const self = this;

    // Arka plan dairesi
    g.append('circle')
      .attr('class', 'r-center-bg')
      .attr('r', R)
      .attr('cx', 0).attr('cy', 0);

    // Dış halka (ince dekoratif)
    g.append('circle')
      .attr('class', 'r-center-ring')
      .attr('r', R + 5)
      .attr('cx', 0).attr('cy', 0)
      .attr('fill', 'none');

    // İlk satır metin
    g.append('text')
      .attr('class', 'r-center-line1')
      .attr('x', 0).attr('y', -4)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');

    // İkinci satır metin
    g.append('text')
      .attr('class', 'r-center-line2')
      .attr('x', 0).attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');

    // Tıklanabilir şeffaf overlay (tam daire)
    g.append('circle')
      .attr('r', R + 5)
      .attr('cx', 0).attr('cy', 0)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('click',      () => self._onCenterClick())
      .on('mouseenter', () => { if (self._lastPointerType === 'mouse') self._gCenter.classed('r-center-hover', true); })
      .on('mouseleave', () => self._gCenter.classed('r-center-hover', false));

    this._updateCenterBtn();
  },

  _updateCenterBtn() {
    const g = this._gCenter;
    if (this._allExpanded) {
      g.select('.r-center-line1').text('Tümünü');
      g.select('.r-center-line2').text('Kapat');
      g.classed('r-center-open', true);
    } else {
      g.select('.r-center-line1').text('Tümünü');
      g.select('.r-center-line2').text('Göster');
      g.classed('r-center-open', false);
    }
  },

  _onCenterClick() {
    if (this._expanding) return;
    if (this._allExpanded) {
      this._collapseAllGroups();
    } else {
      this._expandAllDepths();
    }
  },

  /* Tüm dalları derinlik derinlik aç (cascade animasyonu) */
  _expandAllDepths() {
    this._expanding = true;
    this._allExpanded = false;
    this._updateCenterBtn();

    const step = (depth) => {
      // Bu derinlikteki tüm kapalı düğümleri aç
      let any = false;
      this._root.each(d => {
        if (d.depth === depth && d._children) {
          d.children  = d._children;
          d._children = null;
          any = true;
        }
      });

      if (any) this._update(this._root);

      // Hâlâ kapalı düğüm var mı? (az önce açtıklarımızın çocukları da dahil)
      const hasMore = this._root.descendants().some(d => d._children);

      if (hasMore) {
        setTimeout(() => step(depth + 1), this.DUR + 80);
      } else {
        // Hepsi açıldı → zoom fit + buton güncelle
        setTimeout(() => {
          this._allExpanded = true;
          this._expanding   = false;
          this._updateCenterBtn();
          this._zoomToFit(null, false);
        }, this.DUR + 80);
      }
    };

    step(1);
  },

  /* Tüm açık dalları tek seferde kapat */
  _collapseAllGroups() {
    this._expanding  = false;
    this._allExpanded = false;

    // Derinlik 1+ olan tüm açık düğümleri tek geçişte kapat
    this._root.each(d => {
      if (d.depth >= 1 && d.children) {
        d._children = d.children;
        d.children  = null;
      }
    });

    this._update(this._root);
    this._updateCenterBtn();
    setTimeout(() => this._zoomToFit(null, false), this.DUR + 60);
  },

  redrawLines() {}
};
