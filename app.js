(function() {
  'use strict';

  // ─── DATA FETCHING ───────────────────────────
  // Data is loaded from an external file (data/home.js, or
  // data/collections/<name>.js for collection pages) that
  // sets window.CROOKFLIX_DATA before this script runs.
  // Falls back to an inline #crookflix-data JSON block if
  // no external data file is present (legacy layout).
  function loadSiteData() {
    return new Promise((resolve, reject) => {
      if (typeof window.CROOKFLIX_DATA !== 'undefined' && window.CROOKFLIX_DATA != null) {
        resolve(window.CROOKFLIX_DATA);
        return;
      }
      const dataEl = document.getElementById('crookflix-data');
      if (dataEl) {
        try {
          resolve(JSON.parse(dataEl.textContent));
          return;
        } catch(e) {
          reject(e);
          return;
        }
      }
      reject(new Error('No site data found: load a data file that sets window.CROOKFLIX_DATA, or an inline #crookflix-data JSON block.'));
    });
  }

  // ─── DATE UTILITIES ──────────────────────────
  // Events store an ISO 8601 datetime (e.g. "2026-10-02T19:00:00-05:00")
  // with a fixed UTC offset. datetime may be null/undefined (unscheduled);
  // those events are TBD. Dates/times render in the viewer's browser-local
  // timezone.
  function eventDateTime(evt) {
    if (evt && evt.datetime) {
      const d = new Date(evt.datetime);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  // The showtime is TBD when datetime is null/undefined.
  function isTBD(evt) {
    return !eventDateTime(evt);
  }

  function dateKey(evt) {
    const d = eventDateTime(evt);
    return d ? d.getTime() : Infinity; // TBD sorts last, never past
  }

  function formatDate(d) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTime(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function eventDateLabel(evt) {
    const d = eventDateTime(evt);
    return d ? formatDate(d) : 'TBD';
  }

  function eventTimeLabel(evt) {
    const d = eventDateTime(evt);
    return d ? formatTime(d) : 'TBD';
  }

  function isPast(evt) {
    const d = eventDateTime(evt);
    return !!d && d < new Date(); // TBD is never archived
  }

  // ─── POLYMORPHIC HELPERS ─────────────────────
  // Flatten the polymorphic "upcoming" array into plain events
  // (standalone events + events embedded inside collections).
  function flattenEvents(upcoming) {
    const out = [];
    (upcoming || []).forEach(item => {
      if (item.kind === 'collection') {
        (item.events || []).forEach(e => out.push(e));
      } else {
        out.push(item);
      }
    });
    return out;
  }

  // Chronological ascending. TBD events (no datetime) always sort last and
  // tie-break by title, alphabetically.
  function sortedEvents(events) {
    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');
    return (events || []).slice().sort((a, b) => {
      const aTbd = isTBD(a);
      const bTbd = isTBD(b);
      if (aTbd !== bTbd) return aTbd ? 1 : -1;
      if (aTbd) return byTitle(a, b);
      const diff = dateKey(a) - dateKey(b);
      return diff !== 0 ? diff : byTitle(a, b);
    });
  }

  function collectionRange(events) {
    const dated = events.filter(e => eventDateTime(e));
    if (dated.length === 0) return 'TBD';
    const first = eventDateLabel(dated[0]);
    const last = eventDateLabel(dated[dated.length - 1]);
    return first === last ? first : `${first} — ${last}`;
  }

  // ─── CALENDAR (ICS) ──────────────────────────
  function icsEscape(s) {
    return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function buildIcs(evt) {
    const d = eventDateTime(evt);
    const dt = d ? d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Crookflix//Showtimes//EN',
      'BEGIN:VEVENT',
      `UID:${evt.id || 'event'}@crookflix`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dt}`,
      `SUMMARY:${icsEscape(evt.title)}`
    ];
    if (evt.description) lines.push(`DESCRIPTION:${icsEscape(evt.description)}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadIcs(evt) {
    const blob = new Blob([buildIcs(evt)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(evt.title || 'event').replace(/[^\w\-]+/g, '-')}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── CARD BUILDERS (shared by home + collection pages) ──
  function buildEventCard(evt, i) {
    const past = isPast(evt);
    const tbd = isTBD(evt);
    const card = document.createElement('div');
    card.className = 'event-card' + (past ? ' past' : '');
    card.style.transitionDelay = `${i * 0.1}s`;

    card.innerHTML = `
      <div class="event-date-stamp">${tbd ? 'TBD' : eventDateLabel(evt) + (past ? ' · PAST' : '')}</div>
      <div class="event-card-inner">
        <span class="event-badge">${(evt.type || 'MOVIE').toUpperCase()}</span>
        <h3 class="event-title">${evt.title}</h3>
        <div class="event-meta">
          <span>📅 ${eventDateLabel(evt)}</span>
          <span>🕐 ${eventTimeLabel(evt)}</span>
        </div>
        <p class="event-desc">${evt.description || ''}</p>
        <div class="event-actions">
          ${evt.trailer ? `<button class="btn btn-primary" data-trailer="${evt.trailer}">▶ Watch Trailer</button>` : ''}
          ${past || tbd ? '' : '<button class="btn btn-outline cal-btn">📅 Add to Calendar</button>'}
        </div>
      </div>
    `;

    if (!past && !tbd) {
      card.querySelector('.cal-btn').addEventListener('click', () => downloadIcs(evt));
    }
    return card;
  }

  function buildCollectionCard(col, i, opts) {
    opts = opts || {};
    const events = sortedEvents(col.events);
    const link = document.createElement('a');
    link.className = 'event-card collection-entry' + (opts.archived ? ' past' : '');
    link.href = col.page || '#';
    link.style.transitionDelay = `${i * 0.1}s`;

    link.innerHTML = `
      <div class="event-date-stamp">${events.length} EVENTS${opts.archived ? ' · PAST' : ''}</div>
      <div class="event-card-inner">
        <span class="event-badge collection">${opts.archived ? 'ARCHIVED COLLECTION' : 'COLLECTION'}</span>
        <h3 class="event-title">${col.title}</h3>
        <div class="event-meta">
          <span>🎬 ${events.length} screening${events.length !== 1 ? 's' : ''}</span>
          <span>📅 ${collectionRange(events)}</span>
        </div>
        <p class="event-desc">${col.description || ''}</p>
        <div class="event-actions">
          <span class="btn btn-primary">▶ ${opts.archived ? 'View Archive' : 'View All Events'}</span>
        </div>
      </div>
    `;
    return link;
  }

  // ─── RENDERING ───────────────────────────────
  function renderUpcoming(items) {
    const grid = document.getElementById('events-grid');
    const empty = document.getElementById('events-empty');
    grid.innerHTML = '';

    if (!items || items.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    let i = 0;
    items.forEach(item => {
      if (item.kind === 'collection' && !(item.events || []).some(e => !isPast(e))) return;
      grid.appendChild(item.kind === 'collection' ? buildCollectionCard(item, i) : buildEventCard(item, i));
      i++;
    });
  }

  function renderArchive(data) {
    const list = document.getElementById('archive-list');
    if (!list) return;
    const empty = document.getElementById('archive-empty');
    list.innerHTML = '';

    const blocks = [];
    const standalone = [];

    (data.upcoming || []).forEach(item => {
      if (item.kind === 'collection') {
        const past = (item.events || []).filter(e => isPast(e));
        if (past.length) {
          blocks.push({ title: item.title, description: item.description, page: item.page, events: sortedEvents(past) });
        }
      } else if (isPast(item)) {
        standalone.push(item);
      }
    });

    blocks.sort((a, b) => dateKey(b.events[0]) - dateKey(a.events[0]));

    if (blocks.length === 0 && standalone.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    blocks.forEach((block, i) => {
      list.appendChild(buildCollectionCard(block, i, { archived: true }));
    });

    standalone.sort((a, b) => dateKey(b) - dateKey(a));
    standalone.forEach((evt, i) => {
      list.appendChild(buildEventCard(evt, i + blocks.length));
    });
  }

  // ─── MARQUEE ─────────────────────────────────
  function renderMarquee(events) {
    const marquee = document.getElementById('marquee');
    if (!marquee) return;
    const upcoming = events.filter(e => !isPast(e));
    const text = upcoming.map(e => `● ${e.title} — ${eventDateLabel(e)}`).join('  ');
    const full = text + '  '.repeat(3) + text;
    marquee.innerHTML = `<span>${full}</span><span>${full}</span>`;
  }

  // ─── PAGE MODES ──────────────────────────────
  function renderHome(data) {
    const allEvents = flattenEvents(data.upcoming);

    renderUpcoming(data.upcoming);
    renderArchive(data);
    renderMarquee(allEvents);
    generateHeroPixels();
    generateFooterPixels();

    const typed = document.getElementById('typed-text');
    if (typed) typeText(typed, 'HOME THEATRE SHOWTIMES');
  }

  function renderCollectionPage(data) {
    document.title = `${data.title} — Crookflix`;

    const nameEl = document.getElementById('collection-name');
    const descEl = document.getElementById('collection-desc');
    const countEl = document.getElementById('collection-count');
    if (nameEl) nameEl.textContent = data.title;
    if (descEl) descEl.textContent = data.description || '';
    if (countEl) {
      const events = data.events || [];
      const upcomingCount = events.filter(e => !isPast(e)).length;
      countEl.textContent = `${events.length} SCREENING${events.length !== 1 ? 'S' : ''} · ${upcomingCount} UPCOMING`;
    }

    renderUpcoming(sortedEvents(data.events));
    generateFooterPixels();
  }

  // ─── HERO PIXELS ─────────────────────────────
  function generateHeroPixels() {
    const container = document.getElementById('hero-pixels');
    if (!container) return;
    const colors = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--accent-5)'];
    for (let i = 0; i < 30; i++) {
      const span = document.createElement('span');
      span.style.left = Math.random() * 100 + '%';
      span.style.top = Math.random() * 100 + '%';
      span.style.background = colors[Math.floor(Math.random() * colors.length)];
      span.style.animationDelay = (Math.random() * 6) + 's';
      span.style.animationDuration = (4 + Math.random() * 4) + 's';
      span.style.width = (4 + Math.random() * 8) + 'px';
      span.style.height = span.style.width;
      container.appendChild(span);
    }
  }

  // ─── FOOTER PIXELS ───────────────────────────
  function generateFooterPixels() {
    const row = document.getElementById('footer-pixels');
    if (!row) return;
    const colors = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--accent-5)'];
    for (let i = 0; i < 12; i++) {
      const span = document.createElement('span');
      span.style.background = colors[i % colors.length];
      span.style.border = '2px solid #000';
      row.appendChild(span);
    }
  }

  // ─── TYPING EFFECT ───────────────────────────
  function typeText(element, text, speed = 50) {
    let i = 0;
    const interval = setInterval(() => {
      element.textContent = text.substring(0, i + 1);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
  }

  // ─── SCROLL ANIMATIONS ───────────────────────
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.event-card, .archive-item, .reveal, .reveal-left, .reveal-scale').forEach(el => {
      observer.observe(el);
    });
  }

  // ─── SCROLL PROGRESS ─────────────────────────
  function initProgressBar() {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      bar.style.width = progress + '%';
    }, { passive: true });
  }

  // ─── VIDEO MODAL ─────────────────────────────
  function initVideoModal() {
    const modal = document.getElementById('video-modal');
    if (!modal) return;
    const iframe = document.getElementById('modal-iframe');
    const closeBtn = document.getElementById('modal-close');

    function openTrailer(youtubeId) {
      iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('active');
      iframe.src = '';
      document.body.style.overflow = '';
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-trailer]');
      if (trigger) {
        openTrailer(trigger.dataset.trailer);
      }
      if (e.target === modal || e.target === closeBtn) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
  }

  // ─── INIT ────────────────────────────────────
  let siteData;

  async function init() {
    try {
      siteData = await loadSiteData();
    } catch(e) {
      console.error('Failed to load data:', e);
      return;
    }

    if (siteData.upcoming && Array.isArray(siteData.upcoming)) {
      renderHome(siteData);
    } else {
      renderCollectionPage(siteData);
    }

    initScrollAnimations();
    initProgressBar();
    initVideoModal();

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 1200);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
