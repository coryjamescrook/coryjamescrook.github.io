// Crookflix — shared custom elements (light DOM, no shadow, no build, file:// safe).
// Loaded in <head> after session.js. Each element owns its markup + behavior;
// visual styling stays in style.css (class selectors). Pure data helpers are
// shared from app.js via window.CrookflixRender at runtime (resolved lazily so
// load order is irrelevant).
(function() {
  'use strict';

  // Lazy accessor for app.js helpers.
  function R() { return window.CrookflixRender || {}; }

  // Shared color palette (mirrors style.css --accent-*).
  var PALETTE = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--accent-5)'];

  // ─── SITE LOADER ──────────────────────────────
  // Host carries class="loading-screen" (the full-screen panel styles). Hidden by
  // session.js (session flag) or app.js (first-load timer) via .hidden / .remove().
  class CxSiteLoader extends HTMLElement {
    connectedCallback() {
      this.innerHTML =
        '<div class="load-text">Initializing Crookflix...</div>' +
        '<div class="load-bar"><div class="load-bar-inner"></div></div>';
    }
    hide() { this.classList.add('hidden'); }
  }

  // ─── PROGRESS BAR ─────────────────────────────
  // Owns the scroll listener. The element itself is the progress bar (id=progress-bar).
  class CxProgressBar extends HTMLElement {
    connectedCallback() {
      this._onScroll = () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        this.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
      };
      window.addEventListener('scroll', this._onScroll, { passive: true });
      this._onScroll();
    }
    disconnectedCallback() {
      if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    }
  }

  // ─── NAV ──────────────────────────────────────
  // Builds the nav itself. Logo → home (#/). Upcoming/Archive nav links call
  // window.Crookflix.goto(anchor) so they either smooth-scroll (home) or
  // navigate home-then-scroll (collection).
  class CxNav extends HTMLElement {
    connectedCallback() {
      this.innerHTML =
        '<nav>' +
          '<a class="nav-logo" href="#/">CROOK<span>FLIX</span></a>' +
          '<div class="nav-links">' +
            '<a href="#upcoming" data-nav="upcoming">Upcoming</a>' +
            '<a href="#archive" data-nav="archive">Archive</a>' +
          '</div>' +
        '</nav>';
      this.addEventListener('click', (e) => {
        const link = e.target.closest('[data-nav]');
        if (!link) return;
        e.preventDefault();
        if (window.Crookflix && typeof window.Crookflix.goto === 'function') {
          window.Crookflix.goto(link.getAttribute('data-nav'));
        }
      });
    }
  }

  // ─── HOME HERO ────────────────────────────────
  // Generates floating pixel field + types the subtitle (read from `subtitle` attr).
  class CxHomeHero extends HTMLElement {
    connectedCallback() {
      this.classList.add('hero');
      this.innerHTML =
        '<div class="hero-pixels"></div>' +
        '<h1 class="hero-title">' +
          '<span class="glitch" data-text="CROOK">CROOK</span> ' +
          '<span class="glitch" data-text="FLIX" style="color:var(--accent-2)">FLIX</span>' +
        '</h1>' +
        '<p class="hero-sub"><span id="typed-text"></span><span class="cursor"></span></p>' +
        '<div class="scroll-indicator">▼ SCROLL TO EXPLORE ▼</div>';
      this._pixels();
      const typed = this.querySelector('#typed-text');
      if (typed) this._type(typed, this.getAttribute('subtitle') || '');
    }
    _pixels() {
      const c = this.querySelector('.hero-pixels');
      if (!c) return;
      for (let i = 0; i < 30; i++) {
        const s = document.createElement('span');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.background = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        s.style.animationDelay = (Math.random() * 6) + 's';
        s.style.animationDuration = (4 + Math.random() * 4) + 's';
        const w = (4 + Math.random() * 8) + 'px';
        s.style.width = w;
        s.style.height = w;
        c.appendChild(s);
      }
    }
    _type(el, text, speed) {
      speed = speed || 50;
      if (!text) { el.textContent = ''; return; }
      let i = 0;
      const iv = setInterval(() => {
        el.textContent = text.substring(0, i + 1);
        i++;
        if (i >= text.length) clearInterval(iv);
      }, speed);
    }
  }

  // ─── COLLECTION HERO ──────────────────────────
  // Rendered on connect if .data is set; call .refresh() after setting .data.
  // Label prefers the collection object's `label`, falls back to data-label.
  // Back-link target is data-home (default #/).
  class CxCollectionHero extends HTMLElement {
    connectedCallback() { if (this._data) this._render(); }
    set data(v) { this._data = v; if (this.isConnected) this._render(); }
    get data() { return this._data; }
    refresh() { this._render(); }
    _render() {
      const d = this._data || {};
      const label = d.label || this.getAttribute('data-label') || '';
      const home = this.getAttribute('data-home') || '#/';
      const events = d.events || [];
      const h = R();
      const upcoming = h.isPast ? events.filter(e => !h.isPast(e)).length : events.length;
      this.classList.add('hero', 'collection-hero');
      this.innerHTML =
        '<div class="hero-pixels"></div>' +
        '<div class="collection-hero-inner">' +
          '<a class="back-link" href="' + home + '">← BACK TO CROOKFLIX</a>' +
          '<span class="section-label">' + label + '</span>' +
          '<h1 class="collection-name">' + (d.title || 'COLLECTION') + '</h1>' +
          '<p class="collection-desc">' + (d.description || '') + '</p>' +
          '<div class="collection-count">' + events.length + ' SCREENING' + (events.length !== 1 ? 'S' : '') + ' · ' + upcoming + ' UPCOMING</div>' +
        '</div>' +
        '<div class="hero-strip"></div>';
      const c = this.querySelector('.hero-pixels');
      if (c) {
        for (let i = 0; i < 30; i++) {
          const s = document.createElement('span');
          s.style.left = Math.random() * 100 + '%';
          s.style.top = Math.random() * 100 + '%';
          s.style.background = PALETTE[Math.floor(Math.random() * PALETTE.length)];
          s.style.animationDelay = (Math.random() * 6) + 's';
          s.style.animationDuration = (4 + Math.random() * 4) + 's';
          const w = (4 + Math.random() * 8) + 'px';
          s.style.width = w;
          s.style.height = w;
          c.appendChild(s);
        }
      }
    }
  }

  // ─── FOOTER ───────────────────────────────────
  class CxFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML =
        '<footer>' +
          '<div class="footer-logo">CROOKFLIX</div>' +
          '<p class="footer-text">Home Theatre Showtimes — Est. 2022</p>' +
          '<div class="pixel-row"></div>' +
        '</footer>';
      const row = this.querySelector('.pixel-row');
      if (!row) return;
      for (let i = 0; i < 12; i++) {
        const s = document.createElement('span');
        s.style.background = PALETTE[i % PALETTE.length];
        s.style.border = '2px solid #000';
        row.appendChild(s);
      }
    }
  }

  // ─── VIDEO MODAL ──────────────────────────────
  // Owns the [data-trailer] delegation (document-wide) + Escape / click-out /
  // close behavior. Exposes .open(id) / .close(). Toggles the .active class on
  // the inner .modal-overlay element (existing CSS targets that class).
  class CxVideoModal extends HTMLElement {
    connectedCallback() {
      this.innerHTML =
        '<div class="modal-overlay" id="video-modal">' +
          '<div class="modal-box">' +
            '<div class="modal-close" id="modal-close">✕ CLOSE</div>' +
            '<iframe id="modal-iframe" src="" frameborder="0" ' +
              'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
              'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
          '</div>' +
        '</div>';
      this._docClick = (e) => {
        const t = e.target.closest('[data-trailer]');
        if (t) { this.open(t.getAttribute('data-trailer')); return; }
        const panel = this.querySelector('.modal-overlay');
        const closeBtn = this.querySelector('#modal-close');
        if (panel && (e.target === panel || e.target === closeBtn)) this.close();
      };
      this._key = (e) => {
        const panel = this.querySelector('.modal-overlay');
        if (e.key === 'Escape' && panel && panel.classList.contains('active')) this.close();
      };
      document.addEventListener('click', this._docClick);
      document.addEventListener('keydown', this._key);
    }
    open(id) {
      if (!id) return;
      const iframe = this.querySelector('#modal-iframe');
      const panel = this.querySelector('.modal-overlay');
      if (iframe) iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      if (panel) panel.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    close() {
      const iframe = this.querySelector('#modal-iframe');
      const panel = this.querySelector('.modal-overlay');
      if (panel) panel.classList.remove('active');
      if (iframe) iframe.src = '';
      document.body.style.overflow = '';
    }
    disconnectedCallback() {
      if (this._docClick) document.removeEventListener('click', this._docClick);
      if (this._key) document.removeEventListener('keydown', this._key);
      document.body.style.overflow = '';
    }
  }

  // ─── EVENT CARD ───────────────────────────────
  // Self-contained. Set .event (object) before connect. Host carries
  // .event-card so all existing .event-card* CSS applies (including .past).
  class CxEventCard extends HTMLElement {
    connectedCallback() { this.render(); }
    render() {
      const evt = this.event || {};
      const h = R();
      const past = h.isPast ? h.isPast(evt) : false;
      const tbd = h.isTBD ? h.isTBD(evt) : true;
      this.classList.add('event-card');
      this.classList.toggle('past', !!past);
      const dateLabel = h.eventDateLabel ? h.eventDateLabel(evt) : 'TBD';
      const timeLabel = h.eventTimeLabel ? h.eventTimeLabel(evt) : 'TBD';
      const tags = (evt.tags || []).filter(t => typeof t === 'string' && t.trim());
      const tagsHtml = tags.length
        ? '<div class="event-tags">' + tags.map(t => '<span class="event-tag">' + t + '</span>').join('') + '</div>'
        : '';
      const trailer = evt.trailer
        ? '<div class="event-actions"><button class="btn btn-primary" data-trailer="' + evt.trailer + '">▶ Watch Trailer</button></div>'
        : '';
      this.innerHTML =
        '<div class="event-date-stamp">' + (tbd ? 'TBD' : dateLabel + (past ? ' · PAST' : '')) + '</div>' +
        '<div class="event-card-inner">' +
          '<span class="event-badge">' + (evt.type || 'MOVIE').toUpperCase() + '</span>' +
          '<h3 class="event-title">' + evt.title + '</h3>' +
          '<div class="event-meta">' +
            '<span>📅 ' + dateLabel + '</span>' +
            '<span>🕐 ' + timeLabel + '</span>' +
          '</div>' +
          tagsHtml +
          '<p class="event-desc">' + (evt.description || '') + '</p>' +
          trailer +
        '</div>';
    }
  }

  // ─── DAY CARD (multiple events on the same day) ──
  // Self-contained. Set .events (array, 2+) before connect. Host carries
  // .event-card so all existing .event-card* CSS applies (including .past).
  class CxDayCard extends HTMLElement {
    connectedCallback() { this.render(); }
    render() {
      const events = this.events || [];
      const h = R();
      const past = h.isPast ? events.every(e => h.isPast(e)) : false;
      this.classList.add('event-card', 'cx-day-card');
      this.classList.toggle('past', !!past);
      const first = events[0] || {};
      const dateLabel = h.eventDateLabel ? h.eventDateLabel(first) : 'TBD';
      const badge = events.length === 2 ? 'DOUBLE FEATURE' : 'MULTIPLE SHOWINGS';
      const show = (evt) => {
        const timeLabel = h.eventTimeLabel ? h.eventTimeLabel(evt) : 'TBD';
        const tags = (evt.tags || []).filter(t => typeof t === 'string' && t.trim());
        const tagsHtml = tags.length
          ? '<div class="event-tags">' + tags.map(t => '<span class="event-tag">' + t + '</span>').join('') + '</div>'
          : '';
        const trailer = evt.trailer
          ? '<div class="event-actions"><button class="btn btn-primary" data-trailer="' + evt.trailer + '">▶ Watch Trailer</button></div>'
          : '';
        return '<div class="day-show">' +
          '<span class="day-show-time">🕐 ' + timeLabel + '</span>' +
          '<h3 class="event-title">' + evt.title + '</h3>' +
          tagsHtml +
          '<p class="event-desc">' + (evt.description || '') + '</p>' +
          trailer +
        '</div>';
      };
      this.innerHTML =
        '<div class="event-date-stamp">' + events.length + ' EVENTS · ' + dateLabel + (past ? ' · PAST' : '') + '</div>' +
        '<div class="event-card-inner">' +
          '<span class="event-badge">' + badge + '</span>' +
          events.map(show).join('') +
        '</div>';
    }
  }

  // ─── COLLECTION CARD ─────────────────────────
  // Home / archive entry. Host carries .event-card + .collection-entry.
  // Clicking anywhere on the card navigates to #/c/<slug>.
  // Set .collection (object), .archived (bool) before connect.
  class CxCollectionCard extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-trailer]') || e.target.closest('a')) return;
        if (this._slug) window.location.hash = '#/c/' + this._slug;
      });
      this.render();
    }
    render() {
      const col = this.collection || {};
      const archived = !!this.archived;
      const h = R();
      const events = h.sortedEvents ? h.sortedEvents(col.events) : (col.events || []);
      const range = h.collectionRange ? h.collectionRange(col.events || []) : '';
      const slug = col.slug || col.id || '';
      this._slug = slug;
      this.classList.add('event-card', 'collection-entry');
      this.classList.toggle('past', archived);
      this.innerHTML =
        '<div class="event-date-stamp">' + events.length + ' EVENTS' + (archived ? ' · PAST' : '') + '</div>' +
        '<div class="event-card-inner">' +
          '<span class="event-badge collection">' + (archived ? 'ARCHIVED COLLECTION' : 'COLLECTION') + '</span>' +
          '<h3 class="event-title">' + col.title + '</h3>' +
          '<div class="event-meta">' +
            '<span>🎬 ' + events.length + ' screening' + (events.length !== 1 ? 's' : '') + '</span>' +
            '<span>📅 ' + range + '</span>' +
          '</div>' +
          '<p class="event-desc">' + (col.description || '') + '</p>' +
          '<div class="event-actions">' +
            '<span class="btn btn-primary">▶ ' + (archived ? 'View Archive' : 'View All Events') + '</span>' +
          '</div>' +
        '</div>';
    }
  }

  // ─── REGISTER (idempotent) ───────────────────
  function def(name, cls) {
    if (!customElements.get(name)) customElements.define(name, cls);
  }
  def('cx-site-loader', CxSiteLoader);
  def('cx-progress-bar', CxProgressBar);
  def('cx-nav', CxNav);
  def('cx-home-hero', CxHomeHero);
  def('cx-collection-hero', CxCollectionHero);
  def('cx-footer', CxFooter);
  def('cx-video-modal', CxVideoModal);
  def('cx-event-card', CxEventCard);
  def('cx-day-card', CxDayCard);
  def('cx-collection-card', CxCollectionCard);
})();
