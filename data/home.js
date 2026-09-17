// Crookflix data — home.js
// Edit this file to change site content.
//
// Collection entries reference a collection by id. The authoritative data
// (title, description, events — and the slug used for routing) lives in the
// collection's own data file under data/collections/<name>.js, loaded before
// this file, which registers itself in window.CROOKFLIX_COLLECTIONS and
// window.CROOKFLIX_COLLECTIONS_BY_SLUG. This keeps every event defined
// exactly once. A home entry may optionally override title, description,
// slug, or inline an explicit `events` array to diverge.
window.CROOKFLIX_DATA = (function() {
  'use strict';
  const registry = window.CROOKFLIX_COLLECTIONS || {};

  function resolve(col) {
    const src = registry[col.id] || {};
    return {
      kind: 'collection',
      id: col.id,
      title: col.title !== undefined ? col.title : src.title,
      description: col.description !== undefined ? col.description : src.description,
      slug: col.slug !== undefined ? col.slug : src.slug,
      events: col.events !== undefined ? col.events : (src.events || [])
    };
  }

  const upcoming = [
    {
      "kind": "event",
      "id": "evt-009",
      "title": "Inception",
      "description": "A thief who steals secrets through dream-sharing is given the inverse task: planting an idea into the mind of a C.E.O.",
      "trailer": "YoHD9XEInc0",
      "tags": ["Sci-Fi", "Thriller", "Mind-Bender"],
      "datetime": "2026-09-26T21:00:00-05:00"
    },
    {
      "kind": "collection",
      "id": "col-003"
    },
    {
      "kind": "collection",
      "id": "col-004"
    }
  ];

  return {
    upcoming: upcoming.map(function(item) {
      return item.kind === 'collection' ? resolve(item) : item;
    })
  };
})();
