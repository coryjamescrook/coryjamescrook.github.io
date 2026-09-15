// Crookflix data — home.js
// Edit this file to change site content.
//
// Collection entries reference a collection by id. The authoritative data
// (title, description, events) lives in the collection's own data file
// (data/collections/<name>.js), loaded before this file in index.html, which
// registers itself in window.CROOKFLIX_COLLECTIONS. This keeps every event
// defined exactly once. A home entry may optionally override title,
// description, or inline an explicit `events` array to diverge.
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
      page: col.page,
      events: col.events !== undefined ? col.events : (src.events || [])
    };
  }

  const upcoming = [
    {
      "kind": "event",
      "id": "evt-009",
      "title": "Inception",
      "date": "2026-09-26",
      "time": "21:00",
      "description": "A thief who steals secrets through dream-sharing is given the inverse task: planting an idea into the mind of a C.E.O.",
      "trailer": "YoHD9XEInc0"
    },
    {
      "kind": "collection",
      "id": "col-003",
      "page": "collections/midnight-screams-2025.html"
    },
    {
      "kind": "collection",
      "id": "col-004",
      "page": "collections/midnight-screams-2026.html"
    }
  ];

  return {
    upcoming: upcoming.map(function(item) {
      return item.kind === 'collection' ? resolve(item) : item;
    })
  };
})();
