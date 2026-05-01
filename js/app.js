/**
 * app.js — Musiorganolog
 * Ana uygulama: global App namespace, state yönetimi, dil, modal, arama
 *
 * SCRIPT SIRASI:
 *   1. app.js  — window.App tanımlanır
 *   2. radial.js — App.Radial eklenir
 *   3. search.js — App.Search eklenir
 * DOMContentLoaded ile App.init() çağrılır
 */

window.App = {

  /* ─── STATE ─────────────────────────────────────────── */
  state: {
    language: 'tr',
    data: null,
  },

  /* ─── TOAST ──────────────────────────────────────────── */
  _toastTimer: null,

  showToast(msg, type = 'info') {
    const t = document.getElementById('app-toast');
    if (!t) return;
    t.textContent = msg;
    t.className   = 'show' + (type === 'error' ? ' error' : '');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
  },

  /* ─── CAROUSEL STATE ────────────────────────────────── */
  _carousel: {
    idx: 0,
    images: [],
    touchStartX: null,
    eventsAttached: false,
  },

  /* ─── DOM CACHE ─────────────────────────────────────── */
  _els: null,

  _initEls() {
    this._els = {
      backdrop:        document.getElementById('modal-backdrop'),
      modal:           document.getElementById('modal'),
      aboutBackdrop:   document.getElementById('about-backdrop'),
      aboutModal:      document.getElementById('about-modal'),
      aboutClose:      document.getElementById('about-close'),
      aboutPanel:      document.getElementById('panel-about'),
      supportBackdrop: document.getElementById('support-backdrop'),
      supportModal:    document.getElementById('support-modal'),
      supportClose:    document.getElementById('support-close'),
      supportOpenBtn:  document.getElementById('support-open-btn'),
    };
  },

  /* Backdrop'u görünür/gizli yap (opacity transition) */
  _showBackdrop(el) {
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => el.classList.add('is-visible'));
  },
  _hideBackdrop(el) {
    el.classList.remove('is-visible');
    el.setAttribute('aria-hidden', 'true');
    const done = () => { el.hidden = true; el.removeEventListener('transitionend', done); };
    el.addEventListener('transitionend', done);
  },

  /* Modal'ı animasyonla kapat */
  _animClose(modalEl, cb) {
    modalEl.classList.add('is-closing');
    const done = () => {
      modalEl.removeEventListener('animationend', done);
      modalEl.classList.remove('is-closing');
      modalEl.hidden = true;
      modalEl.setAttribute('aria-hidden', 'true');
      if (cb) cb();
    };
    modalEl.addEventListener('animationend', done);
  },

  /* ─── MODAL ──────────────────────────────────────────── */

  openModal(node, path = []) {
    const lang     = this.state.language;
    const backdrop = this._els.backdrop;
    const modal    = this._els.modal;

    const primaryName   = lang === 'tr' ? node.name_tr : lang === 'de' ? node.name_de : node.name_en;
    const secondaryName = lang === 'tr' ? node.name_en : lang === 'de' ? node.name_en : node.name_tr;
    const desc          = lang === 'tr' ? node.description_tr : lang === 'de' ? node.description_de : node.description_en;

    document.getElementById('modal-name-primary').textContent   = primaryName;
    document.getElementById('modal-name-secondary').textContent = secondaryName;
    document.getElementById('modal-desc').textContent           = desc || '';

    // ─── Bölge (coğrafi köken) ────────────────────────────
    const regionEl    = document.getElementById('modal-region');
    const regionLabel = document.getElementById('modal-region-label');
    const regionValue = document.getElementById('modal-region-value');
    const regionText  = lang === 'tr' ? node.region_tr : node.region_en;
    if (regionText) {
      regionLabel.textContent = lang === 'tr' ? 'Bölge' : lang === 'de' ? 'Region' : 'Region';
      regionValue.textContent = regionText;
      regionEl.hidden = false;
    } else {
      regionEl.hidden = true;
    }

    // ─── Görsel alanı: carousel vs. fallback ──────────────
    const imageArea  = document.getElementById('modal-image-area');
    const carousel   = document.getElementById('modal-carousel');
    const imageLabel = document.getElementById('modal-image-label');

    if (node.images && node.images.length > 0) {
      // Carousel modunda gradient arka planı kaldır
      imageArea.style.background = '';
      imageLabel.hidden = true;
      this._carousel.node = node;          // fallback için node'u sakla
      this._buildCarousel(node.images);
    } else {
      // Fallback: renkli gradient + enstrüman adı
      carousel.hidden = true;
      imageLabel.hidden = false;
      imageLabel.textContent = primaryName;
      const palettes = [
        ['#1a2d4e', '#2d3a6e'],
        ['#2d1a4e', '#4e2d6e'],
        ['#4e1a2d', '#6e2d3a'],
        ['#1a4e2d', '#2d6e3a'],
        ['#3a2d1a', '#5a4a2d'],
        ['#1a3a4e', '#2d4e5a'],
      ];
      const pi = (node.id || '').length % palettes.length;
      const [c1, c2] = palettes[pi];
      imageArea.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    }

    // ─── Video buton durumu ────────────────────────────────
    const videoBtn  = document.getElementById('modal-video-btn');
    const videoWrap = document.getElementById('modal-video-wrap');
    const videoIframe = document.getElementById('modal-video-iframe');

    // Önce videoyu kapat / temizle
    videoWrap.hidden = true;
    videoIframe.src  = '';
    videoBtn.setAttribute('aria-expanded', 'false');
    this._setVideoBtnText(videoBtn, lang, false);

    if (node.video_id) {
      videoBtn.hidden = false;
      // Her açılışta tıklama dinleyicisini yenile
      videoBtn.onclick = () => this._toggleVideo(node.video_id, lang);
    } else {
      videoBtn.hidden = true;
    }

    this._showBackdrop(backdrop);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    // ── Permalink: URL hash'i güncelle (geçmişe eklemeden) ────
    if (node.id) {
      history.replaceState({ nodeId: node.id }, '', '#' + node.id);
    }

    // ── Breadcrumb oluştur ─────────────────────────────────────
    this._buildBreadcrumb(path, lang);

    requestAnimationFrame(() => {
      document.getElementById('modal-close').focus();
    });
  },

  /* ─── BREADCRUMB ─────────────────────────────────────────── */

  _buildBreadcrumb(path, lang) {
    const nav = document.getElementById('breadcrumb-nav');
    const ol  = document.getElementById('breadcrumb');
    if (!nav || !ol || path.length < 2) {
      if (nav) nav.hidden = true;
      return;
    }

    ol.innerHTML = '';

    path.forEach((node, idx) => {
      const isLast = idx === path.length - 1;
      const name   = lang === 'tr' ? node.name_tr
                   : lang === 'de' ? (node.name_de || node.name_en)
                   : node.name_en;

      // Ayraç ekle (ilk öğe hariç)
      if (idx > 0) {
        const sep = document.createElement('li');
        sep.className    = 'breadcrumb-sep';
        sep.textContent  = '›';
        sep.setAttribute('aria-hidden', 'true');
        ol.appendChild(sep);
      }

      const li = document.createElement('li');
      li.className = 'breadcrumb-item' + (isLast ? ' active' : '');

      if (isLast) {
        // Son öğe (mevcut enstrüman) — tıklanamaz
        li.setAttribute('aria-current', 'page');
        const span = document.createElement('span');
        span.textContent = name;
        li.appendChild(span);
      } else {
        // Tıklanabilir ata — ağaçta o düğüme zoom yap
        const btn = document.createElement('button');
        btn.type        = 'button';
        btn.textContent = name;
        btn.addEventListener('click', () => {
          if (App.Radial) App.Radial.focusNodeById(node.id);
        });
        li.appendChild(btn);
      }

      ol.appendChild(li);
    });

    nav.hidden = false;
  },

  _setVideoBtnText(btn, lang, isOpen) {
    const labels = {
      tr: { open: 'Enstrümanı dinle', close: 'Videoyu kapat' },
      en: { open: 'Watch performance',  close: 'Close video'    },
      de: { open: 'Aufführung ansehen', close: 'Video schließen'},
    };
    const t = labels[lang] || labels.tr;
    document.getElementById('modal-video-btn-text').textContent = isOpen ? t.close : t.open;
  },

  _toggleVideo(videoId, lang) {
    const videoBtn    = document.getElementById('modal-video-btn');
    const videoWrap   = document.getElementById('modal-video-wrap');
    const videoIframe = document.getElementById('modal-video-iframe');
    const isOpen      = videoBtn.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      // Kapat — iframe src temizle (video durur, bellek serbest kalır)
      videoIframe.src = '';
      videoWrap.hidden = true;
      videoBtn.setAttribute('aria-expanded', 'false');
      this._setVideoBtnText(videoBtn, lang, false);
    } else {
      // Aç — privacy-enhanced embed (no cookie)
      videoIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      videoWrap.hidden = false;
      videoBtn.setAttribute('aria-expanded', 'true');
      this._setVideoBtnText(videoBtn, lang, true);
      // Videoyu görünür alana kaydır
      videoWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  /* ─── CAROUSEL ──────────────────────────────────────────── */

  _buildCarousel(images) {
    const carousel = document.getElementById('modal-carousel');
    const track    = document.getElementById('carousel-track');
    const dotsEl   = document.getElementById('carousel-dots');

    this._carousel.idx = 0;

    // Slaytları temizle & yeniden oluştur
    track.innerHTML  = '';
    dotsEl.innerHTML = '';

    images.forEach((imgData, i) => {
      // Slayt — caption data-attribute'unda sakla (DOM-tabanlı erişim için)
      const slide = document.createElement('div');
      slide.className      = 'm-carousel-slide';
      slide.dataset.caption = imgData.caption || '';

      const el = document.createElement('img');
      el.src      = imgData.src;
      el.alt      = imgData.caption || '';
      el.loading  = i === 0 ? 'eager' : 'lazy';
      el.decoding = 'async';
      // Yükleme hatası → bu slide'ı DOM'dan çıkar
      el.onerror  = () => this._carouselRemoveSlide(slide);
      // Tıklayınca lightbox aç
      el.addEventListener('click', () => this._openLightbox(imgData.src, imgData.caption));
      slide.appendChild(el);
      track.appendChild(slide);

      // Dot — tek görsel varsa gizle
      if (images.length > 1) {
        const dot = document.createElement('button');
        dot.className = 'm-carousel-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Görsel ${i + 1}`);
        // Closure: DOM'daki mevcut indeksi kullan (silinen slide'lar sonrası güvenli)
        dot.addEventListener('click', () => {
          const cur = Array.from(track.children).indexOf(slide);
          if (cur >= 0) this._carouselGo(cur);
        });
        dotsEl.appendChild(dot);
      }
    });

    carousel.hidden = false;

    // Event listener'ları sadece bir kez bağla
    if (!this._carousel.eventsAttached) {
      this._initCarouselEvents();
      this._carousel.eventsAttached = true;
    }

    this._carouselGo(0);
  },

  // Başarısız yüklenen slide'ı DOM'dan kaldır; hiç slide kalmazsa gradient'e dön
  _carouselRemoveSlide(slide) {
    const track    = document.getElementById('carousel-track');
    const dotsEl   = document.getElementById('carousel-dots');
    const slides   = Array.from(track.children);
    const idx      = slides.indexOf(slide);
    if (idx < 0) return;

    track.removeChild(slide);

    // Aynı indeksteki dot'u da kaldır
    const dots = Array.from(dotsEl.children);
    if (dots[idx]) dotsEl.removeChild(dots[idx]);

    const remaining = track.children.length;
    if (remaining === 0) {
      // Tüm görseller başarısız → carousel'i gizle, gradient göster
      document.getElementById('modal-carousel').hidden = true;
      if (this._carousel.node) this._showGradientFallback(this._carousel.node);
      return;
    }

    // Mevcut indeksi sınırla
    if (this._carousel.idx >= remaining) this._carousel.idx = remaining - 1;
    this._carouselGo(this._carousel.idx);
  },

  // Gradient + isim fallback (carousel başarısız olduğunda)
  _showGradientFallback(node) {
    const lang        = this.state.language;
    const primaryName = lang === 'tr' ? node.name_tr : lang === 'de' ? node.name_de : node.name_en;
    const imageArea   = document.getElementById('modal-image-area');
    const imageLabel  = document.getElementById('modal-image-label');
    imageLabel.hidden      = false;
    imageLabel.textContent = primaryName;
    const palettes = [
      ['#1a2d4e', '#2d3a6e'], ['#2d1a4e', '#4e2d6e'], ['#4e1a2d', '#6e2d3a'],
      ['#1a4e2d', '#2d6e3a'], ['#3a2d1a', '#5a4a2d'], ['#1a3a4e', '#2d4e5a'],
    ];
    const pi = (node.id || '').length % palettes.length;
    const [c1, c2] = palettes[pi];
    imageArea.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  },

  /* ─── Lightbox ─────────────────────────────────────────── */
  _openLightbox(src, caption) {
    const lb = document.createElement('div');
    lb.className = 'r-lightbox';

    const img = document.createElement('img');
    img.src = src;
    img.alt = caption || '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'r-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Kapat');
    closeBtn.textContent = '✕';

    lb.appendChild(img);
    lb.appendChild(closeBtn);
    document.body.appendChild(lb);

    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target === closeBtn) close(); });
    document.addEventListener('keydown', onKey);
  },

  _carouselGo(n) {
    const track  = document.getElementById('carousel-track');
    if (!track) return;
    const slides = Array.from(track.children);
    const total  = slides.length;
    if (!total) return;

    // Döngüsel sarma
    n = ((n % total) + total) % total;
    this._carousel.idx = n;

    // Track'i kaydır
    track.style.transform = `translateX(-${n * 100}%)`;

    // Dots
    document.querySelectorAll('.m-carousel-dot').forEach((d, i) => {
      d.classList.toggle('active', i === n);
      d.setAttribute('aria-selected', i === n ? 'true' : 'false');
    });

    // Caption — slide'ın data-caption'ından oku
    const capEl = document.getElementById('carousel-caption');
    if (capEl) capEl.textContent = slides[n].dataset.caption || '';

    // Sayaç
    const counterEl = document.getElementById('carousel-counter');
    if (counterEl) counterEl.textContent = total > 1 ? `${n + 1} / ${total}` : '';

    // Navigasyon okları: tek görsel varsa gizle
    const showNav = total > 1;
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (prevBtn) prevBtn.hidden = !showNav;
    if (nextBtn) nextBtn.hidden = !showNav;
  },

  _initCarouselEvents() {
    // Prev / Next butonları
    document.getElementById('carousel-prev')
      .addEventListener('click', () => this._carouselGo(this._carousel.idx - 1));
    document.getElementById('carousel-next')
      .addEventListener('click', () => this._carouselGo(this._carousel.idx + 1));

    // Touch swipe (mobil)
    const vp = document.getElementById('carousel-viewport');
    vp.addEventListener('touchstart', e => {
      this._carousel.touchStartX = e.touches[0].clientX;
    }, { passive: true });
    vp.addEventListener('touchend', e => {
      if (this._carousel.touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - this._carousel.touchStartX;
      if (Math.abs(dx) > 42) this._carouselGo(this._carousel.idx + (dx < 0 ? 1 : -1));
      this._carousel.touchStartX = null;
    }, { passive: true });
  },

  closeModal() {
    const { backdrop, modal } = this._els;
    const videoIframe = document.getElementById('modal-video-iframe');
    const videoWrap   = document.getElementById('modal-video-wrap');
    const videoBtn    = document.getElementById('modal-video-btn');

    // Modal kapanınca videoyu durdur
    videoIframe.src = '';
    videoWrap.hidden = true;
    if (videoBtn) videoBtn.setAttribute('aria-expanded', 'false');

    // Carousel'i sıfırla
    const carousel = document.getElementById('modal-carousel');
    if (carousel) carousel.hidden = true;
    this._carousel.images = [];
    this._carousel.idx    = 0;

    this._hideBackdrop(backdrop);
    this._animClose(modal, () => {
      // ── Permalink: hash temizle ──────────────────────────────
      history.replaceState(null, '', location.pathname + location.search);
      // ── Breadcrumb gizle ────────────────────────────────────
      const bcNav = document.getElementById('breadcrumb-nav');
      if (bcNav) bcNav.hidden = true;
    });
  },

  /* ─── DİL ────────────────────────────────────────────── */

  setLanguage(lang) {
    if (this.state.language === lang) return;
    this.state.language = lang;

    document.getElementById('lang-tr').setAttribute('aria-pressed', lang === 'tr' ? 'true' : 'false');
    document.getElementById('lang-en').setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    document.getElementById('lang-de').setAttribute('aria-pressed', lang === 'de' ? 'true' : 'false');

    document.getElementById('site-subtitle').textContent =
      lang === 'tr' ? 'Enstrüman Haritası' : lang === 'de' ? 'Instrumentenkarte' : 'Instrument Map';

    document.getElementById('search-input').placeholder =
      lang === 'tr' ? 'Enstrüman ara...' : lang === 'de' ? 'Instrument suchen...' : 'Search instruments...';

    if (App.Radial)   App.Radial.setLanguage();
    if (App.Search)   App.Search.setLanguage(lang);
    if (App.MapView)  App.MapView.setLanguage();

    // Video butonu metni dil değişiminde güncellenir
    const videoBtn = document.getElementById('modal-video-btn');
    if (videoBtn && !videoBtn.hidden) {
      const isOpen = videoBtn.getAttribute('aria-expanded') === 'true';
      this._setVideoBtnText(videoBtn, lang, isOpen);
    }

    // About modal içerikleri dil değişiminde güncellenir
    this._updateAboutLang(lang);

    // ── Aria-label / title güncellemeleri ─────────────────────
    this._updateAriaLabels(lang);
  },

  /* ─── ARIA-LABEL / TITLE GÜNCELLEMESİ ───────────────────── */
  _updateAriaLabels(lang) {
    const T = {
      tr: {
        homeLink:       'Ana sayfaya dön',
        viewGroup:      'Görünüm seçimi',
        viewRadial:     'Radyal Ağaç',
        viewMap:        'Harita',
        aboutBtn:       'Site hakkında',
        loader:         'Yükleniyor',
        loaderText:     'Yükleniyor…',
        bcNav:          'Gezinme yolu',
        treeStage:      'Enstrüman aile ağacı',
        mapView:        'Harita görünümü',
        mapFilterBar:   'Kategori filtresi',
        mapCanvas:      'Enstrüman dünya haritası',
        visitorBadge:   'Ziyaretçi sayısı',
        rControls:      'Ağaç kontrolleri',
        modalClose:     'Kapat',
        aboutClose:     'Kapat',
        carousel:       'Enstrüman görselleri',
        carouselPrev:   'Önceki görsel',
        carouselNext:   'Sonraki görsel',
        carouselDots:   'Görsel seçimi',
        videoIframe:    'Enstrüman performans videosu',
        aboutTabs:      'Hakkında sekmeleri',
      },
      en: {
        homeLink:       'Go to homepage',
        viewGroup:      'View selection',
        viewRadial:     'Radial Tree',
        viewMap:        'Map',
        aboutBtn:       'About this site',
        loader:         'Loading',
        loaderText:     'Loading…',
        bcNav:          'Breadcrumb navigation',
        treeStage:      'Instrument family tree',
        mapView:        'Map view',
        mapFilterBar:   'Category filter',
        mapCanvas:      'Instrument world map',
        visitorBadge:   'Visitor count',
        rControls:      'Tree controls',
        modalClose:     'Close',
        aboutClose:     'Close',
        carousel:       'Instrument images',
        carouselPrev:   'Previous image',
        carouselNext:   'Next image',
        carouselDots:   'Image selection',
        videoIframe:    'Instrument performance video',
        aboutTabs:      'About tabs',
      },
      de: {
        homeLink:       'Zur Startseite',
        viewGroup:      'Ansichtsauswahl',
        viewRadial:     'Radialer Baum',
        viewMap:        'Karte',
        aboutBtn:       'Über diese Seite',
        loader:         'Wird geladen',
        loaderText:     'Wird geladen…',
        bcNav:          'Brotkrumen-Navigation',
        treeStage:      'Instrument-Stammbaum',
        mapView:        'Kartenansicht',
        mapFilterBar:   'Kategoriefilter',
        mapCanvas:      'Instrument-Weltkarte',
        visitorBadge:   'Besucheranzahl',
        rControls:      'Baum-Steuerung',
        modalClose:     'Schließen',
        aboutClose:     'Schließen',
        carousel:       'Instrumentenbilder',
        carouselPrev:   'Vorheriges Bild',
        carouselNext:   'Nächstes Bild',
        carouselDots:   'Bildauswahl',
        videoIframe:    'Instrument-Aufführungsvideo',
        aboutTabs:      'Über Registerkarten',
      },
    };
    const t = T[lang] || T.tr;

    const set = (id, attr, val) => {
      const el = document.getElementById(id);
      if (!el || !val) return;
      if (attr === 'text') el.textContent = val;
      else el.setAttribute(attr, val);
    };
    const setQ = (sel, attr, val) => {
      const el = document.querySelector(sel);
      if (!el || !val) return;
      el.setAttribute(attr, val);
    };

    // Genel sayfa elementleri
    setQ('.title-home-link',              'aria-label', t.homeLink);
    setQ('.view-toggle',                  'aria-label', t.viewGroup);
    set('view-radial',                    'title',      t.viewRadial);
    set('view-map',                       'title',      t.viewMap);
    set('about-btn',                      'aria-label', t.aboutBtn);
    // Yükleme ekranı
    set('app-loader',                     'aria-label', t.loader);
    const loaderText = document.querySelector('#app-loader .loader-text');
    if (loaderText) loaderText.textContent = t.loaderText;
    // Breadcrumb
    set('breadcrumb-nav',                 'aria-label', t.bcNav);
    // Ağaç ve harita alan
    set('tree-stage',                     'aria-label', t.treeStage);
    set('map-view',                       'aria-label', t.mapView);
    set('map-filter-bar',                 'aria-label', t.mapFilterBar);
    set('map-canvas',                     'aria-label', t.mapCanvas);
    // Ziyaretçi rozeti
    set('visitor-badge',                  'aria-label', t.visitorBadge);
    // Ağaç kontrol grubu
    set('r-controls',                     'aria-label', t.rControls);
    // Modal kapat
    set('modal-close',                    'aria-label', t.modalClose);
    set('about-close',                    'aria-label', t.aboutClose);
    // Carousel
    set('modal-carousel',                 'aria-label', t.carousel);
    set('carousel-prev',                  'aria-label', t.carouselPrev);
    set('carousel-next',                  'aria-label', t.carouselNext);
    set('carousel-dots',                  'aria-label', t.carouselDots);
    // Video iframe
    const iframe = document.getElementById('modal-video-iframe');
    if (iframe) iframe.title = t.videoIframe;
    // About sekme bar
    setQ('.about-tabs[role="tablist"]',   'aria-label', t.aboutTabs);
  },

  /* ─── ABOUT MODAL ───────────────────────────────────────── */

  openAbout() {
    const { aboutBackdrop, aboutModal, aboutClose, aboutPanel } = this._els;
    // Panel scroll'u sıfırla
    if (aboutPanel) aboutPanel.scrollTop = 0;
    this._showBackdrop(aboutBackdrop);
    aboutModal.hidden = false;
    aboutModal.setAttribute('aria-hidden', 'false');
    // İlk sekmeyi aktif yap
    this._switchAboutTab('panel-about');
    requestAnimationFrame(() => aboutClose.focus());
  },

  closeAbout() {
    const { aboutBackdrop, aboutModal } = this._els;
    this._hideBackdrop(aboutBackdrop);
    this._animClose(aboutModal);
  },

  _switchAboutTab(panelId) {
    document.querySelectorAll('.about-tab').forEach(btn => {
      const active = btn.dataset.panel === panelId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.about-panel').forEach(panel => {
      panel.hidden = panel.id !== panelId;
    });
  },

  _updateAboutLang(lang) {
    const t = {
      tr: {
        tagline:    'Enstrüman Haritası',
        tab1:       'Site Hakkında',
        tab2:       'Kaynaklar',
        main:       'Musiorganolog, dünya müzik enstrümanlarını Hornbostel-Sachs organolojik sınıflandırma sistemi üzerine inşa edilmiş interaktif bir haritadır. 389 düğüm ve 287 yaprak enstrümanı kapsayan bu koleksiyon; kordofonlar, aerofonlar, idiofonlar, membranofonlar ve elektrofonlar olmak üzere beş ana kategoride düzenlenmiştir.',
        desc:       'Her enstrüman Türkçe, İngilizce ve Almanca açıklamalar, etimoloji, tarihsel köken, yapım tekniği ve kültürel bağlam bilgileriyle zenginleştirilmiştir. Seçilmiş performans videoları dünya arşivlerinden küratörlüklü olarak sunulmaktadır.',
        nodes:      'Düğüm', instruments: 'Enstrüman', langs: 'Dil', cats: 'Kategori', visitors: 'Ziyaret',
        srcEncy:    'Ansiklopediler', srcClass: 'Sınıflandırma',
        srcBooks:   'Kitaplar',       srcOnline: 'Çevrimiçi',
        mapSoon:    'Çok Yakında',    mapDesc: '287 enstrümanı dünya haritası üzerinde keşfet — bölge ve ülke bazlı filtreleme ile.',
        aboutBtn:   'Hakkında',
      },
      en: {
        tagline:    'Instrument Map',
        tab1:       'About',
        tab2:       'Sources',
        main:       'Musiorganolog is an interactive map of world musical instruments built on the Hornbostel-Sachs organological classification system. Covering 389 nodes and 287 leaf instruments, the collection is organised into five main categories: chordophones, aerophones, idiophones, membranophones, and electrophones.',
        desc:       'Each instrument is enriched with descriptions in Turkish, English, and German covering etymology, historical origins, construction, and cultural context. Curated performance videos are drawn from world archives.',
        nodes:      'Nodes', instruments: 'Instruments', langs: 'Languages', cats: 'Categories', visitors: 'Visits',
        srcEncy:    'Encyclopaedias', srcClass: 'Classification',
        srcBooks:   'Books',          srcOnline: 'Online',
        mapSoon:    'Coming Soon',    mapDesc: 'Explore 287 instruments on a world map — filter by region and country.',
        aboutBtn:   'About',
      },
      de: {
        tagline:    'Instrumentenkarte',
        tab1:       'Über die Seite',
        tab2:       'Quellen',
        main:       'Musiorganolog ist eine interaktive Karte der Musikinstrumente der Welt, aufgebaut auf dem organologischen Klassifikationssystem von Hornbostel-Sachs. Die Sammlung umfasst 389 Knoten und 287 Blattinstrumente, gegliedert in fünf Hauptkategorien: Chordophone, Aerophone, Idiophone, Membranophone und Elektophone.',
        desc:       'Jedes Instrument ist mit Beschreibungen auf Türkisch, Englisch und Deutsch angereichert, die Etymologie, historische Herkunft, Konstruktion und kulturellen Kontext abdecken. Kuratierte Aufführungsvideos stammen aus weltweiten Archiven.',
        nodes:      'Knoten', instruments: 'Instrumente', langs: 'Sprachen', cats: 'Kategorien', visitors: 'Besuche',
        srcEncy:    'Enzyklopädien', srcClass: 'Klassifikation',
        srcBooks:   'Bücher',        srcOnline: 'Online',
        mapSoon:    'Demnächst',     mapDesc: '287 Instrumente auf einer Weltkarte entdecken — nach Region und Land filtern.',
        aboutBtn:   'Über uns',
      },
    };
    const s = t[lang] || t.tr;
    const el = id => document.getElementById(id);
    if (el('about-tagline'))     el('about-tagline').textContent     = s.tagline;
    if (el('tab-about'))         el('tab-about').textContent         = s.tab1;
    if (el('tab-sources'))       el('tab-sources').textContent       = s.tab2;
    if (el('about-text-main'))   el('about-text-main').textContent   = s.main;
    if (el('about-text-desc'))   el('about-text-desc').textContent   = s.desc;
    if (el('stat-nodes'))        el('stat-nodes').textContent        = s.nodes;
    if (el('stat-instruments'))  el('stat-instruments').textContent  = s.instruments;
    if (el('stat-langs'))        el('stat-langs').textContent        = s.langs;
    if (el('stat-cats'))         el('stat-cats').textContent         = s.cats;
    if (el('src-cat-ency'))        el('src-cat-ency').textContent        = s.srcEncy;
    if (el('src-cat-class'))       el('src-cat-class').textContent       = s.srcClass;
    if (el('src-cat-books'))       el('src-cat-books').textContent       = s.srcBooks;
    if (el('src-cat-online'))      el('src-cat-online').textContent      = s.srcOnline;
    if (el('stat-visitors-label')) el('stat-visitors-label').textContent = s.visitors;
    if (el('about-btn'))           el('about-btn').textContent           = s.aboutBtn;
  },

  /* ─── ARAMA NAVIGASYON ───────────────────────────────── */

  navigateToInstrument(pathArray) {
    const mapView = document.getElementById('map-view');
    const isMapActive = mapView && !mapView.hidden;
    if (isMapActive && App.MapView) {
      // Map görünümü aktif — haritada o bölgeye zoom yap
      const inst = pathArray[pathArray.length - 1];
      App.MapView.navigateTo(inst);
    } else {
      App.Radial.expandPath(pathArray);
    }
  },

  /* ─── DÜZLEŞTIRILMIŞ ARAMA İNDEKSİ ──────────────────── */

  buildFlatIndex(nodes, ancestors = []) {
    let result = [];
    for (const node of nodes) {
      const currentPath = [...ancestors, node];
      if (!node.children || node.children.length === 0) {
        result.push({ node, path: currentPath });
      } else {
        result = result.concat(this.buildFlatIndex(node.children, currentPath));
      }
    }
    return result;
  },

  /* ─── INIT ────────────────────────────────────────────── */

  async init() {
    // ── Yükleme ekranı göster ────────────────────────────────
    const loader = document.getElementById('app-loader');
    if (loader) loader.hidden = false;

    try {
      const res = await fetch('./data/instruments.json?v=6');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.state.data = await res.json();
    } catch (err) {
      // Yükleme ekranını kaldır, hata toast'u göster
      if (loader) loader.hidden = true;
      const lang = this.state.language;
      this.showToast(
        lang === 'de' ? 'Daten konnten nicht geladen werden. Bitte python3 serve.py ausführen.' :
        lang === 'en' ? 'Data failed to load. Please run via python3 serve.py.' :
        'Veri yüklenemedi. Lütfen python3 serve.py ile çalıştırın.',
        'error'
      );
      document.getElementById('tree-stage').innerHTML = `
        <p style="color:var(--gold);text-align:center;padding:3rem 1rem;font-family:var(--font-serif);font-style:italic;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
          Veri yüklenemedi. Lütfen sayfayı yerel bir sunucu üzerinden açın.<br>
          <span style="font-size:0.8rem;color:var(--text-muted);font-style:normal;">(örn: <code>python3 serve.py</code>)</span>
        </p>`;
      console.error('instruments.json yükleme hatası:', err);
      return;
    }

    // ── Yükleme ekranını gizle (fade-out) ───────────────────
    if (loader) {
      loader.classList.add('fading');
      setTimeout(() => { loader.hidden = true; loader.classList.remove('fading'); }, 420);
    }

    // Header yüksekliğini CSS değişkenine yaz (map-view için gerekli)
    const syncHeaderH = () => {
      const h = document.querySelector('.site-header')?.offsetHeight || 72;
      document.documentElement.style.setProperty('--header-h', h + 'px');
    };
    syncHeaderH();
    window.addEventListener('resize', syncHeaderH);

    // DOM referanslarını cache'le
    this._initEls();

    // Radial ağacı başlat
    App.Radial.init(this.state.data);

    // Arama indexi oluştur ve Search modülünü başlat
    const flatIndex = this.buildFlatIndex(this.state.data);
    App.Search.init(flatIndex);

    // ── Permalink: sayfa açılışında URL hash ile enstrümana git ─
    const hashId = decodeURIComponent(location.hash.slice(1));
    if (hashId) {
      const entry = flatIndex.find(e => e.node.id === hashId);
      if (entry) {
        // Ağaç ilk render + zoomToFit bitmesini bekle
        setTimeout(() => App.navigateToInstrument(entry.path), 600);
      }
    }

    // Dil toggle
    document.getElementById('lang-tr').addEventListener('click', () => this.setLanguage('tr'));
    document.getElementById('lang-en').addEventListener('click', () => this.setLanguage('en'));
    document.getElementById('lang-de').addEventListener('click', () => this.setLanguage('de'));

    // Modal kapatma
    document.getElementById('modal-close').addEventListener('click',    () => this.closeModal());
    this._els.backdrop.addEventListener('click', () => this.closeModal());

    // About modal — her açılışta dili senkronize et
    document.getElementById('about-btn').addEventListener('click', () => {
      this._updateAboutLang(this.state.language);
      this.openAbout();
    });
    this._els.aboutClose.addEventListener('click',      () => this.closeAbout());
    this._els.aboutBackdrop.addEventListener('click',   () => this.closeAbout());

    // Destek popup
    const { supportOpenBtn, supportModal, supportBackdrop, supportClose } = this._els;
    const openSupport = () => {
      this._showBackdrop(supportBackdrop);
      supportModal.hidden = false;
      supportModal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => { if (supportClose) supportClose.focus(); });
    };
    const closeSupport = () => {
      this._hideBackdrop(supportBackdrop);
      this._animClose(supportModal, () => { if (supportOpenBtn) supportOpenBtn.focus(); });
    };
    if (supportOpenBtn)  supportOpenBtn.addEventListener('click',  openSupport);
    if (supportClose)    supportClose.addEventListener('click',    closeSupport);
    if (supportBackdrop) supportBackdrop.addEventListener('click', closeSupport);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && supportModal && !supportModal.hidden) closeSupport();
    });

    // Görünüm toggle: Radyal Ağaç ↔ Harita
    const treeStage  = document.getElementById('tree-stage');
    const mapView    = document.getElementById('map-view');
    const rControls  = document.getElementById('r-controls');
    const visitorBadge = document.getElementById('visitor-badge');
    document.getElementById('view-radial').addEventListener('click', () => {
      document.getElementById('view-radial').setAttribute('aria-pressed', 'true');
      document.getElementById('view-radial').classList.add('active');
      document.getElementById('view-map').setAttribute('aria-pressed', 'false');
      document.getElementById('view-map').classList.remove('active');
      treeStage.hidden   = false;
      mapView.hidden     = true;
      if (rControls)    rControls.hidden    = false;
      if (visitorBadge) visitorBadge.hidden = false;
    });
    document.getElementById('view-map').addEventListener('click', () => {
      document.getElementById('view-map').setAttribute('aria-pressed', 'true');
      document.getElementById('view-map').classList.add('active');
      document.getElementById('view-radial').setAttribute('aria-pressed', 'false');
      document.getElementById('view-radial').classList.remove('active');
      treeStage.hidden   = true;
      mapView.hidden     = false;
      if (rControls)    rControls.hidden    = true;
      if (visitorBadge) visitorBadge.hidden = true;
      // Init or refresh map
      if (App.MapView) App.MapView.onShow();
    });

    // About sekme geçişleri
    document.querySelectorAll('.about-tab').forEach(btn => {
      btn.addEventListener('click', () => this._switchAboutTab(btn.dataset.panel));
    });

    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
      const modalOpen = !this._els.modal.hidden;
      if (e.key === 'Escape') {
        if (modalOpen)                              this.closeModal();
        if (!this._els.aboutModal.hidden)           this.closeAbout();
      }
      // Carousel klavye navigasyonu (modal açıkken ← →)
      if (modalOpen && this._carousel.images.length > 1) {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this._carouselGo(this._carousel.idx - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this._carouselGo(this._carousel.idx + 1); }
      }
    });

    // İlk dil için about metinleri hazırla
    this._updateAboutLang(this.state.language);
    // İlk yüklemede aria-label'ları doğru dille ayarla
    this._updateAriaLabels(this.state.language);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
