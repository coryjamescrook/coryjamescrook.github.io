(function() {
  'use strict';

  // ─── DATA FETCHING ───────────────────────────
  function loadSiteData() {
    return new Promise((resolve, reject) => {
      if (typeof window.CROOKFLIX_DATA !== 'undefined' && window.CROOKFLIX_DATA != null) {
        resolve(window.CROOKFLIX_DATA);
        return;
      }
      reject(new Error('No site data found: load a data file that sets window.CROOKFLIX_DATA.'));
    });
  }

  // ─── DATE UTILITIES ──────────────────────────
  function eventDateTime(evt) {
    if (evt && evt.datetime) {
      const d = new Date(evt.datetime);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function isTBD(evt) { return !eventDateTime(evt); }

  function dateKey(evt) {
    const d = eventDateTime(evt);
    return d ? d.getTime() : Infinity;
  }

  function formatDate(d) {
    const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTime(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${mi}`;
  }

  function eventDateLabel(evt) { return eventDateTime(evt) ? formatDate(eventDateTime(evt)) : 'TBD'; }
  function eventTimeLabel(evt) { return eventDateTime(evt) ? formatTime(eventDateTime(evt)) : 'TBD'; }

  function sameDay(a, b) {
    const da = eventDateTime(a);
    const db = eventDateTime(b);
    if (!da || !db) return false;
    return da.getFullYear() === db.getFullYear()
      && da.getMonth() === db.getMonth()
      && da.getDate() === db.getDate();
  }

  function groupSameDay(items) {
    const groups = [];
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      if (item && item.kind !== 'collection' && !isTBD(item)) {
        let j = i + 1;
        while (j < items.length
          && items[j] && items[j].kind !== 'collection'
          && !isTBD(items[j]) && sameDay(item, items[j])) j++;
        if (j > i + 1) {
          groups.push({ kind: 'day-group', events: items.slice(i, j) });
          i = j;
          continue;
        }
      }
      groups.push({ kind: item && item.kind === 'collection' ? 'collection' : 'event', item });
      i++;
    }
    return groups;
  }

  function isPast(evt) {
    const d = eventDateTime(evt);
    return !!d && d < new Date();
  }

  // ─── POLYMORPHIC HELPERS ─────────────────────
  function flattenEvents(upcoming) {
    const out = [];
    (upcoming || []).forEach(item => {
      if (item.kind === 'collection') (item.events || []).forEach(e => out.push(e));
      else out.push(item);
    });
    return out;
  }

  function sortedEvents(events) {
    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');
    return (events || []).slice().sort((a, b) => {
      const at = isTBD(a), bt = isTBD(b);
      if (at !== bt) return at ? 1 : -1;
      if (at) return byTitle(a, b);
      const diff = dateKey(a) - dateKey(b);
      return diff !== 0 ? diff : byTitle(a, b);
    });
  }

  function collectionRange(events) {
    const dated = events.filter(e => eventDateTime(e));
    if (!dated.length) return 'TBD';
    const first = eventDateLabel(dated[0]);
    const last = eventDateLabel(dated[dated.length - 1]);
    return first === last ? first : first + ' — ' + last;
  }

  // ─── EXPOSE HELPERS TO components.js ─────────
  // components.js reads window.CrookflixRender lazily inside its custom elements.
  window.CrookflixRender = { isTBD, dateKey, sameDay, formatDate, formatTime, eventDateLabel, eventTimeLabel, isPast, sortedEvents, collectionRange };

  // ─── CARD BUILDERS ───────────────────────────
  function buildEventCard(evt, i) {
    const el = document.createElement('cx-event-card');
    el.event = evt;
    el.style.transitionDelay = `${Math.min(i, 5) * 0.075}s`;
    return el;
  }

  function buildDayCard(events, i) {
    const el = document.createElement('cx-day-card');
    el.events = events;
    el.style.transitionDelay = `${Math.min(i, 5) * 0.075}s`;
    return el;
  }

  function buildCollectionCard(col, i, opts) {
    opts = opts || {};
    const el = document.createElement('cx-collection-card');
    el.collection = col;
    el.archived = !!opts.archived;
    el.style.transitionDelay = `${Math.min(i, 5) * 0.075}s`;
    return el;
  }

  // ─── ROUTE ELEMENTS ─────────────────────────
  const routeEls = {
    home: document.querySelector('#view .route[data-route="home"]'),
    collection: document.querySelector('#view .route[data-route="collection"]'),
    notfound: document.querySelector('#view .route[data-route="notfound"]'),
  };

  function showRoute(name) {
    ['home', 'collection', 'notfound'].forEach(k => {
      if (routeEls[k]) routeEls[k].style.display = (k === name) ? '' : 'none';
    });
  }

  // ─── ROUTE RENDERERS ─────────────────────────
  // Routes are scoped by class; grids/empty-state live inside the route element.
  function upcomingSection(routeEl) { return routeEl && routeEl.querySelector('[data-sec="upcoming"]'); }
  function archiveSection(routeEl)  { return routeEl && routeEl.querySelector('[data-sec="archive"]'); }

  function renderUpcoming(items, routeEl) {
    const sec = upcomingSection(routeEl);
    if (!sec) return;
    const grid = sec.querySelector('.events-grid');
    const empty = sec.querySelector('[data-empty]');
    if (!grid) return;
    grid.innerHTML = '';
    if (!items || !items.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    let i = 0;
    groupSameDay(items).forEach(group => {
      if (group.kind === 'collection') {
        if (!(group.item.events || []).some(e => !isPast(e))) return;
        grid.appendChild(buildCollectionCard(group.item, i));
      } else if (group.kind === 'day-group') {
        grid.appendChild(buildDayCard(group.events, i));
      } else {
        grid.appendChild(buildEventCard(group.item, i));
      }
      i++;
    });
  }

  function renderArchive(data, routeEl) {
    const sec = archiveSection(routeEl);
    if (!sec) return;
    const list = sec.querySelector('.archive-list');
    const empty = sec.querySelector('[data-empty]');
    if (!list) return;
    list.innerHTML = '';
    const blocks = [];
    const standalone = [];
    (data.upcoming || []).forEach(item => {
      if (item.kind === 'collection') {
        const past = (item.events || []).filter(e => isPast(e));
        if (past.length) blocks.push({
          title: item.title, description: item.description,
          slug: item.slug, events: sortedEvents(past)
        });
      } else if (isPast(item)) standalone.push(item);
    });
    blocks.sort((a, b) => dateKey(b.events[0]) - dateKey(a.events[0]));
    standalone.sort((a, b) => dateKey(b) - dateKey(a));
    if (!blocks.length && !standalone.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    let i = 0;
    blocks.forEach((b) => list.appendChild(buildCollectionCard(b, i++, { archived: true })));
    groupSameDay(standalone).forEach(group => {
      if (group.kind === 'day-group') list.appendChild(buildDayCard(group.events, i++));
      else list.appendChild(buildEventCard(group.item, i++));
    });
  }

  function renderHome() {
    const all = sortedEvents(flattenEvents(siteData.upcoming).filter(e => !isPast(e)));
    const routeEl = routeEls.home;
    const marquee = routeEl && routeEl.querySelector('#marquee');
    if (marquee) {
      const text = all.map(e => '● ' + e.title + ' — ' + eventDateLabel(e)).join('  ');
      const full = text + '  '.repeat(3) + text;
      marquee.innerHTML = '<span>' + full + '</span><span>' + full + '</span>';
    }
    document.title = 'Crookflix — Home Theatre Showtimes';
    renderUpcoming(siteData.upcoming, routeEl);
    renderArchive(siteData, routeEl);
  }

  function renderCollection(collection) {
    const routeEl = routeEls.collection;
    if (collection && collection.title) document.title = collection.title + ' — Crookflix';
    const hero = routeEl && routeEl.querySelector('#collection-hero');
    if (hero && collection) hero.data = collection;
    const events = collection ? sortedEvents(collection.events) : [];
    renderUpcoming(events, routeEl);
  }

  // ─── ROUTER ─────────────────────────────────
  function parseRoute() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/c\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (m) {
      const bySlug = window.CROOKFLIX_COLLECTIONS_BY_SLUG || {};
      const col = bySlug[m[1]];
      return col
        ? { name: 'collection', slug: m[1], collection: col }
        : { name: 'notfound' };
    }
    if (hash === '#/' || hash === '' || hash === '#') return { name: 'home' };
    return { name: 'notfound' };
  }

  let siteData;

  function route() {
    const r = parseRoute();
    showRoute(r.name);
    window.scrollTo(0, 0);
    if (r.name === 'home') {
      renderHome();
    } else if (r.name === 'collection') {
      renderCollection(r.collection);
    }
    initScrollAnimations();
  }

  // Exposed for cx-nav (data-nav) → goto(anchor or target section name).
  // Accepts 'upcoming' or 'archive' (section name on the home route); anything
  // else routes home and scrolls to top.
  window.Crookflix = {
    goto(target) {
      const valid = (target === 'upcoming' || target === 'archive') ? target : null;
      const doScroll = () => {
        const homeEl = routeEls.home;
        if (!homeEl) return;
        if (valid) {
          const el = homeEl.querySelector('[data-sec="' + valid + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
      if (location.hash === '#/' || location.hash === '' || location.hash === '#') {
        doScroll();
        return;
      }
      location.hash = '#/';
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      setTimeout(doScroll, 120);
    }
  };

  // ─── SCROLL ANIMATIONS ──────────────────────
  let scrollObserver;
  function initScrollAnimations() {
    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.0125, rootMargin: '0px 0px 120px 0px' });
    const cards = document.querySelectorAll('#view .event-card, #view .reveal, #view .reveal-left, #view .reveal-scale');
    cards.forEach(el => scrollObserver.observe(el));
  }

  // ─── INIT ───────────────────────────────────
  async function init() {
    try {
      siteData = await loadSiteData();
    } catch (e) {
      console.error('Failed to load data:', e);
      return;
    }
    window.addEventListener('hashchange', route);
    route();

    // Hide loading screen only on the site's first load this session.
    try {
      if (!sessionStorage.getItem('crookflix-session-loaded')) {
        sessionStorage.setItem('crookflix-session-loaded', '1');
        setTimeout(() => {
          const l = document.getElementById('loading');
          if (l) l.classList.add('hidden');
        }, 1200);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
