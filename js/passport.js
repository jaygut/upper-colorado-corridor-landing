/* Graph of Life brand v1.0.0 · candidate file workbench. Renders data/keystone/*.json. No number on the page is typed here. */
(function () {
  'use strict';

  var KEY = 'keystone-file-v1';
  var FILES = {
    passport: 'data/keystone/passport.json',
    eagle: 'data/keystone/eagle.json',
    sources: 'data/keystone/sources.json'
  };
  var UNAVAILABLE = {
    passport: 'Passport data unavailable. No substitute values are shown.',
    eagle: 'Parcel geometry and bird record data unavailable. No substitute values are shown.',
    sources: 'Source hash data unavailable. No substitute values are shown.'
  };
  var ACRES_PER_HA = 2.4710538;
  var PASSPORT_STATUS = 'Descriptive source context. Field validation pending.';
  var RECORD_STATUS = 'Review draft. Proposed action only. No observation completed, no outcome verified, no obligation created.';
  var ACTION_STATUS = 'Proposed action. Not a completed observation.';
  var BUDGET_BASIS = 'Your assumption. No price is supplied by this site.';
  var COST_EMPTY = 'Cost not entered. The draft will record the budget as unknown.';
  var NOT_RECORDED = 'Not recorded';
  var MRV_FIELDS = [
    ['question', 'Question', 'textarea', true],
    ['support', 'Geographic support', 'textarea', false],
    ['indicator', 'Indicator', 'textarea', false],
    ['method', 'Method', 'textarea', true],
    ['timing', 'Timing', 'input', false],
    ['role', 'Responsible role', 'input', false],
    ['access', 'Access prerequisite', 'textarea', false],
    ['decision', 'Decision the result could change', 'textarea', false]
  ];
  var ITEM_FIELDS = [
    ['evidence_class', 'Evidence class'],
    ['source', 'Source'],
    ['vintage', 'Vintage'],
    ['period', 'Observation period'],
    ['availability', 'Availability'],
    ['uncertainty', 'Uncertainty'],
    ['license', 'Licence'],
    ['allowed_use', 'Allowed use'],
    ['living_meaning', 'What it says about the living system'],
    ['mechanism_link', 'Link to a mechanism'],
    ['decision_link', 'Link to a decision'],
    ['gap', 'What a field visit would resolve']
  ];
  var MECH_FIELDS = [
    ['input', 'Input'],
    ['hypothesis', 'Hypothesis'],
    ['recipient', 'Possible recipient'],
    ['supporting', 'Supporting evidence today'],
    ['alternative', 'Alternative explanation'],
    ['adverse', 'The other side of the record']
  ];
  var OB_GROUPS = [
    ['rights', 'Rights and consent'],
    ['payer', 'Payer of record'],
    ['performance', 'Performance terms']
  ];
  var WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  var SVGNS = 'http://www.w3.org/2000/svg';

  var D = { passport: null, eagle: null, sources: null };
  var failed = {};
  var pendingMechanism = null;
  var state = restore();
  window.__FILE = state;

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      });
    }
    add(n, kids);
    return n;
  }

  function add(n, kids) {
    if (kids === null || kids === undefined) return n;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    });
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  /* Wrap numbers, units and dates found in authored prose in the mono face. */
  var NUM_RE = /(\d[\d,.:\-]*\d|\d)(\s?%|\s?°C|\s(?:ha|km|m)\b)?/g;
  function rich(text) {
    var frag = document.createDocumentFragment();
    var s = String(text);
    var last = 0;
    var m;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      frag.appendChild(el('span', { class: 'mono', text: m[0] }));
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    return frag;
  }

  function recorded(v) { return v === null || v === undefined || String(v).trim() === '' ? NOT_RECORDED : String(v); }

  function stateClass(status) {
    var s = String(status || '');
    if (/observed/i.test(s)) return 'observed';
    if (/proxy/i.test(s) || /mapped inventory/i.test(s) || /completed query/i.test(s)) return 'proxy';
    if (/private/i.test(s)) return 'private';
    return 'pending';
  }

  function ext(href, text) {
    return el('a', { href: href, rel: 'noopener', text: text });
  }

  function stamp() { return new Date().toISOString(); }
  function dateTag() { return stamp().slice(0, 10).replace(/-/g, ''); }

  /* ---------- state ---------- */

  function blank() {
    return {
      v: 1,
      mechanism: null,
      mrv: {},
      mrv_edited: false,
      budget: { visits: '', cost: '', setup: '' },
      review: { recipient: '', decision: '', reviewer: '' },
      obligation: {},
      chain: null
    };
  }

  function restore() {
    var s = blank();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.v === 1) {
          ['mechanism', 'mrv_edited', 'chain'].forEach(function (k) { if (k in p) s[k] = p[k]; });
          ['mrv', 'budget', 'review', 'obligation'].forEach(function (k) {
            if (p[k] && typeof p[k] === 'object') Object.keys(p[k]).forEach(function (f) { s[k][f] = p[k][f]; });
          });
        }
      }
    } catch (e) { /* storage unavailable or unreadable: start clean */ }
    return s;
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* page works without storage */ }
  }

  function mechById(id) {
    if (!D.passport) return null;
    return D.passport.mechanisms.filter(function (m) { return m.id === id; })[0] || null;
  }

  function urlMechanism() {
    try { return new URLSearchParams(window.location.search).get('mechanism'); } catch (e) { return null; }
  }

  function syncUrl(remove) {
    try {
      var u = new URL(window.location.href);
      if (remove) u.searchParams.delete('mechanism');
      else u.searchParams.set('mechanism', state.mechanism);
      if (u.href !== window.location.href) window.history.replaceState(null, '', u.href);
    } catch (e) { /* history unavailable */ }
  }

  function loadDefaults(id) {
    var m = mechById(id);
    state.mechanism = id;
    state.mrv = {};
    MRV_FIELDS.forEach(function (f) { state.mrv[f[0]] = m.mrv[f[0]] || ''; });
    state.budget.visits = String(m.mrv.visits);
    state.mrv_edited = false;
  }

  function applyMechanism(id) {
    loadDefaults(id);
    pendingMechanism = null;
    save();
    syncUrl();
    syncMechanism();
    fillObservation();
  }

  function requestMechanism(id, fromUser) {
    if (!mechById(id)) return;
    if (id === state.mechanism) { dismissMechConfirm(false); return; }
    if (!state.mrv_edited) { dismissMechConfirm(false); applyMechanism(id); return; }
    pendingMechanism = id;
    syncMechanism();
    var target = mechById(id);
    showConfirm($('mechanism-confirm'),
      'You have edited the observation draft. Switching to "' + target.label + '" replaces those fields with its starting draft.',
      'Replace my edits', 'Keep my edits',
      function () {
        applyMechanism(id);
        focusRadio();
      },
      function () {
        pendingMechanism = null;
        syncUrl();
        focusRadio();
      }, fromUser);
  }

  function dismissMechConfirm(restoreUrl) {
    pendingMechanism = null;
    var c = $('mechanism-confirm');
    if (c) clear(c);
    if (restoreUrl) syncUrl();
  }

  function focusRadio() {
    var r = document.querySelector('input[name="mechanism"]:checked');
    if (r) r.focus();
  }

  function showConfirm(host, message, yes, no, onYes, onNo, takeFocus) {
    if (!host) return;
    clear(host);
    var yesBtn = el('button', { type: 'button', class: 'k-btn-solid', text: yes, 'data-confirm': 'yes', onclick: function () { clear(host); onYes(); } });
    var noBtn = el('button', { type: 'button', class: 'k-btn', text: no, 'data-confirm': 'no', onclick: function () { clear(host); onNo(); } });
    host.appendChild(el('div', { class: 'pf-confirm', role: 'group', 'aria-label': 'Confirm this change' }, [
      el('p', { text: message }),
      el('div', { class: 'pf-confirm-actions' }, [yesBtn, noBtn])
    ]));
    if (takeFocus) yesBtn.focus();
  }

  /* ---------- budget ---------- */

  function parseMoney(raw) {
    var s = String(raw === null || raw === undefined ? '' : raw).trim();
    if (s === '') return { empty: true };
    if (/^-/.test(s)) return { error: 'Enter zero or a positive amount.' };
    if (/^\d+\.\d{3,}$/.test(s)) return { error: 'Use at most 2 decimal places.' };
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return { error: 'Enter digits only, for example 250 or 250.50.' };
    var parts = s.split('.');
    var cents = parseInt(parts[0], 10) * 100 + (parts[1] ? parseInt((parts[1] + '0').slice(0, 2), 10) : 0);
    if (!Number.isSafeInteger(cents)) return { error: 'This amount is too large to total.' };
    return { cents: cents };
  }

  function parseVisits(raw) {
    var s = String(raw === null || raw === undefined ? '' : raw).trim();
    if (!/^\d+$/.test(s) || parseInt(s, 10) < 1 || !Number.isSafeInteger(parseInt(s, 10))) {
      return { error: 'Enter a whole number of visits, 1 or more.' };
    }
    return { n: parseInt(s, 10) };
  }

  function formatUSD(cents) {
    var whole = Math.floor(cents / 100);
    var frac = String(cents % 100);
    if (frac.length < 2) frac = '0' + frac;
    return 'USD ' + String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + frac;
  }

  function budget() {
    var v = parseVisits(state.budget.visits);
    var c = parseMoney(state.budget.cost);
    var f = parseMoney(state.budget.setup);
    var out = {
      status: 'entered',
      visits: v.error ? null : v.n,
      cost_cents: c.cents === undefined ? null : c.cents,
      setup_cents: f.cents === undefined ? null : f.cents,
      total_cents: null,
      errors: { visits: v.error || '', cost: c.error || '', setup: f.error || '' }
    };
    var errs = [];
    if (v.error) errs.push('Visits. ' + v.error);
    if (c.error) errs.push('Cost per visit. ' + c.error);
    if (f.error) errs.push('Fixed setup cost. ' + f.error);
    if (errs.length) {
      out.status = 'invalid';
      out.error = errs.join(' ');
      return out;
    }
    if (c.empty) { out.status = 'unknown'; return out; }
    var total = v.n * c.cents + (f.cents || 0);
    if (!Number.isSafeInteger(total)) {
      out.status = 'invalid';
      out.error = 'The total is too large to compute exactly.';
      return out;
    }
    out.total_cents = total;
    return out;
  }

  function budgetExport() {
    var b = budget();
    var o = {
      basis: BUDGET_BASIS,
      currency: 'USD',
      status: b.status,
      visits: b.visits,
      cost_per_visit_usd: b.cost_cents === null ? null : b.cost_cents / 100,
      fixed_setup_usd: b.setup_cents === null ? null : b.setup_cents / 100,
      total_usd: b.total_cents === null ? null : b.total_cents / 100,
      total_cents: b.total_cents,
      total_display: b.total_cents === null ? null : formatUSD(b.total_cents),
      as_entered: { visits: state.budget.visits, cost_per_visit: state.budget.cost, fixed_setup: state.budget.setup }
    };
    if (b.status === 'unknown') o.note = COST_EMPTY;
    if (b.status === 'invalid') o.budget_error = b.error;
    return o;
  }

  /* ---------- data loading ---------- */

  function fetchOne(name) {
    return fetch(FILES[name]).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (j) {
      D[name] = j;
      delete failed[name];
    }).catch(function () {
      D[name] = null;
      failed[name] = true;
    });
  }

  function load(names) {
    return Promise.all(names.map(fetchOne)).then(function () {
      initState();
      renderAll();
    });
  }

  function retry() {
    var names = Object.keys(failed);
    if (names.length) load(names);
  }

  function unavailable(name) {
    return el('div', { class: 'pf-unavailable', role: 'alert', 'data-unavailable': name }, [
      el('p', { text: UNAVAILABLE[name] }),
      el('button', { type: 'button', class: 'k-btn', text: 'Retry', onclick: retry })
    ]);
  }

  function initState() {
    if (!D.passport) return;
    var mechs = D.passport.mechanisms;
    var wanted = urlMechanism();
    if (!mechById(state.mechanism)) {
      loadDefaults(mechById(wanted) ? wanted : mechs[0].id);
      save();
    }
    if (!D.passport.chain.some(function (c) { return c.id === state.chain; })) state.chain = D.passport.chain[0].id;
    var known = {};
    obFields().forEach(function (f) { known[f.key] = true; });
    Object.keys(state.obligation).forEach(function (k) { if (!known[k]) delete state.obligation[k]; });
  }

  /* ---------- identity ---------- */

  function renderParcel() {
    var host = clear($('parcel-figure'));
    if (!D.eagle) { host.appendChild(unavailable('eagle')); return; }
    var ring = D.eagle.candidate.ring;
    var cells = D.eagle.cells;
    var lats = ring.map(function (p) { return p[1]; });
    var lons = ring.map(function (p) { return p[0]; });
    var lat0 = (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2;
    var lon0 = (Math.min.apply(null, lons) + Math.max.apply(null, lons)) / 2;
    var M_PER_DEG = 111320;
    var kx = Math.cos(lat0 * Math.PI / 180) * M_PER_DEG;
    function proj(p) { return [(p[0] - lon0) * kx, -(p[1] - lat0) * M_PER_DEG]; }
    function path(r) {
      return r.map(function (p, i) { var q = proj(p); return (i ? 'L' : 'M') + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }).join('') + 'Z';
    }
    var pts = ring.map(proj);
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var pad = 12;
    var x0 = Math.min.apply(null, xs) - pad;
    var y0 = Math.min.apply(null, ys) - pad;
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs) + pad * 2;
    var h = Math.max.apply(null, ys) - Math.min.apply(null, ys) + pad * 2;
    var vals = cells.map(function (c) { return c.v; });
    var lo = Math.min.apply(null, vals);
    var hi = Math.max.apply(null, vals);
    function colour(t) {
      t = Math.max(0, Math.min(1, t));
      if (t < 0.5) return 'color-mix(in srgb, var(--gol-navy) ' + ((1 - t * 2) * 100).toFixed(1) + '%, var(--gol-teal))';
      return 'color-mix(in srgb, var(--gol-teal) ' + ((2 - t * 2) * 100).toFixed(1) + '%, var(--gol-green))';
    }
    var year = D.eagle.structure && D.eagle.structure.source_year;
    var label = 'True-shape outline of the candidate parcel with ' + cells.length + ' clipped canopy cells. Canopy cover per cell runs from ' + lo + '% to ' + hi + '%.';
    var s = svg('svg', { viewBox: [x0, y0, w, h].map(function (n) { return n.toFixed(1); }).join(' '), role: 'img', 'aria-label': label, id: 'parcel-svg' });
    cells.forEach(function (c) {
      var p = svg('path', { d: path(c.r), class: 'pf-cell' });
      p.style.fill = colour(hi === lo ? 1 : (c.v - lo) / (hi - lo));
      s.appendChild(p);
    });
    s.appendChild(svg('path', { d: path(ring), class: 'pf-outline' }));
    var bx = x0 + w - pad - 100;
    var by = y0 + h - pad / 2;
    s.appendChild(svg('path', { d: 'M' + bx.toFixed(1) + ' ' + (by - 4).toFixed(1) + 'V' + by.toFixed(1) + 'H' + (bx + 100).toFixed(1) + 'V' + (by - 4).toFixed(1), class: 'pf-scalebar' }));
    host.appendChild(s);

    var ramp = el('span', { class: 'pf-legend-ramp', 'aria-hidden': 'true' });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      var i = el('i');
      i.style.background = colour(t);
      ramp.appendChild(i);
    });
    host.appendChild(el('figcaption', null, [
      el('p', { class: 'k-note' }, ['Tree canopy cover in each clipped ', el('span', { class: 'mono', text: '30 m' }), ' cell' + (year ? ', ' : ''), year ? el('span', { class: 'mono', text: String(year) }) : null, '. North is up. The bracket at lower right spans ', el('span', { class: 'mono', text: '100 m' }), '.']),
      el('div', { class: 'pf-scale-note' }, [
        el('span', { class: 'pf-legend' }, [el('span', { text: lo + '%' }), ramp, el('span', { text: hi + '%' })]),
        el('span', { class: 'pf-legend' }, [el('span', { class: 'pf-key-outline', 'aria-hidden': 'true' }), 'County parcel boundary'])
      ])
    ]));
  }

  function renderFacts() {
    var host = clear($('candidate-facts'));
    var limits = clear($('claim-limits'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    var c = D.passport.candidate;
    var dl = el('dl');
    function row(k, v, small) {
      dl.appendChild(el('dt', { text: k }));
      dl.appendChild(el('dd', null, [v, small ? el('small', { text: small }) : null]));
    }
    row('Candidate', c.id);
    row('County parcel', c.parcel_id);
    row('Area', Number(c.area_ha).toFixed(3) + ' ha · ' + (Number(c.area_ha) * ACRES_PER_HA).toFixed(2) + ' acres');
    row('Place', recorded(c.place));
    row('Boundary source', recorded(c.boundary_source));
    row('Status', recorded(c.status));
    row('Rights', recorded(c.rights));
    var score = c.historical_screening_score || {};
    row('Archived screening score', recorded(score.value), score.note || '');
    host.appendChild(dl);

    limits.appendChild(el('h2', { text: 'What this file does not establish' }));
    limits.appendChild(el('ul', null, D.passport.claim_limits.map(function (t) { return el('li', { text: t }); })));
  }

  /* ---------- passport ---------- */

  function renderPassport() {
    var host = clear($('passport-body'));
    if (!D.passport) host.appendChild(unavailable('passport'));
    else {
      D.passport.dimensions.forEach(function (dim) {
        var sec = el('section', { class: 'pf-dim', 'data-dimension': dim.id, 'aria-labelledby': 'dim-' + dim.id });
        sec.appendChild(el('div', { class: 'pf-dim-head' }, [
          el('h3', { id: 'dim-' + dim.id, text: dim.label }),
          el('div', null, [
            el('p', { class: 'pf-dim-q', text: dim.question }),
            el('p', { class: 'pf-dim-state', text: dim.state })
          ])
        ]));
        dim.items.forEach(function (it) { sec.appendChild(itemRow(it)); });
        if (dim.id === 'composition') sec.appendChild(el('div', { id: 'bird-slot' }));
        host.appendChild(sec);
      });
    }
    var slot = $('bird-slot') || host.appendChild(el('div', { id: 'bird-slot' }));
    renderBirds(slot);
  }

  function itemRow(it) {
    var value = el('span', { class: 'pf-item-value' }, [el('b', { text: recorded(it.value) }), it.unit ? it.unit : null]);
    var summary = el('summary', null, [
      el('span', { class: 'pf-item-label', text: it.label }),
      value,
      el('span', { class: 'k-state ' + stateClass(it.status), text: recorded(it.status) }),
      el('span', { class: 'pf-item-support' }, rich(recorded(it.support)))
    ]);
    var dl = el('dl', { class: 'pf-fields' });
    ITEM_FIELDS.forEach(function (f) {
      var raw = it[f[0]];
      var empty = recorded(raw) === NOT_RECORDED;
      dl.appendChild(el('dt', { text: f[1] }));
      var dd = el('dd', { class: empty ? 'pf-empty' : null });
      if (empty) dd.textContent = NOT_RECORDED;
      else if (f[0] === 'source' && it.source_url) dd.appendChild(ext(it.source_url, raw));
      else dd.appendChild(rich(raw));
      dl.appendChild(dd);
    });
    return el('details', { class: 'pf-item', 'data-item': it.id }, [summary, el('div', { class: 'pf-item-body' }, dl)]);
  }

  function renderBirds(host) {
    clear(host);
    if (!D.eagle) { host.appendChild(unavailable('eagle')); return; }
    var birds = D.eagle.birds;
    var groups = birds.groups.slice().sort(function (a, b) { return a.y0 - b.y0 || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
    var range = (birds.cohort && birds.cohort.observed_year_range) || [
      Math.min.apply(null, groups.map(function (g) { return g.y0; })),
      Math.max.apply(null, groups.map(function (g) { return g.y1; }))
    ];
    var a = range[0];
    var span = Math.max(1, range[1] - range[0]);
    function pct(y) { return ((y - a) / span * 100).toFixed(3) + '%'; }
    var total = groups.reduce(function (n, g) { return n + g.n; }, 0);

    var fig = el('figure', { class: 'pf-birds', id: 'bird-chart' });
    fig.appendChild(el('h4', null, ['Provider species-name groups by year of record, ', el('span', { class: 'mono', text: groups.length + ' groups · ' + total + ' records' })]));

    var axisTrack = el('span', { class: 'pf-bird-track' });
    var step = span > 10 ? 5 : 1;
    for (var y = a; y <= range[1]; y += step) {
      var t = el('span', { text: String(y) });
      t.style.left = pct(y);
      axisTrack.appendChild(t);
    }
    fig.appendChild(el('div', { class: 'pf-bird-axis', 'aria-hidden': 'true' }, [el('span', { text: 'Provider name' }), el('span', { text: 'Years' }), axisTrack, el('span', { class: 'pf-bird-n', text: 'n' })]));

    var list = el('ol', { class: 'pf-bird-rows' });
    var anyFlag = false;
    groups.forEach(function (g) {
      var syn = (g.status || []).indexOf('SYNONYM') !== -1;
      var fuzzy = !!(g.flags && g.flags.TAXON_MATCH_FUZZY);
      anyFlag = anyFlag || syn || fuzzy;
      var bar = el('span', { class: 'pf-bird-bar' + (g.y0 === g.y1 ? ' pf-dot' : '') });
      bar.style.left = pct(g.y0);
      if (g.y0 !== g.y1) bar.style.width = ((g.y1 - g.y0) / span * 100).toFixed(3) + '%';
      var years = g.y0 === g.y1 ? String(g.y0) : g.y0 + '–' + g.y1;
      list.appendChild(el('li', { class: 'pf-bird-row', 'data-bird-row': g.key, 'data-n': g.n }, [
        el('span', { class: 'pf-bird-name' }, [
          ext(g.url, g.name),
          syn ? el('span', { class: 'pf-bird-flag', text: 'SYN', title: 'Provider status is synonym' }) : null,
          fuzzy ? el('span', { class: 'pf-bird-flag', text: 'FUZZY', title: 'Provider flag is fuzzy taxon match' }) : null
        ]),
        el('span', { class: 'pf-bird-years', text: years }),
        el('span', { class: 'pf-bird-track', 'aria-hidden': 'true' }, bar),
        el('span', { class: 'pf-bird-n' }, [el('span', { class: 'vh', text: 'records ' }), String(g.n)])
      ]));
    });
    fig.appendChild(list);
    var cap = el('figcaption', null, [
      el('p', { class: 'k-note', text: 'Provider-reported names in the 1 km neighbourhood. Coordinates are withheld. Year range only.' })
    ]);
    if (anyFlag) {
      cap.appendChild(el('p', { class: 'k-note pf-bird-key' }, [
        el('span', { class: 'pf-bird-flag', text: 'SYN' }), ' marks a name the provider lists as a synonym. ',
        el('span', { class: 'pf-bird-flag', text: 'FUZZY' }), ' marks a fuzzy taxon match reported by the provider.'
      ]));
    }
    fig.appendChild(cap);

    var cites = el('div', { class: 'pf-cites' });
    (birds.attribution || []).forEach(function (c) {
      cites.appendChild(el('div', { class: 'pf-cite', 'data-citation': '' }, [
        el('p', { class: 'pf-cite-text', text: c.citation }),
        el('p', null, ['Licence ', ext(c.license_url, c.license), c.doi_url ? ' · ' : null, c.doi_url ? ext(c.doi_url, c.doi_url.replace(/^https?:\/\//, '')) : null]),
        el('p', { text: c.changes }),
        el('p', { text: c.endorsement })
      ]));
    });
    fig.appendChild(cites);
    host.appendChild(fig);
  }

  /* ---------- chain ---------- */

  function dotmark(kind) {
    var s = svg('svg', { viewBox: '0 0 22 22', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(svg('circle', { cx: 11, cy: 11, r: 8, class: 'pf-dotmark ' + kind }));
    return s;
  }

  function renderChain() {
    var host = clear($('chain-body'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    var chain = D.passport.chain;
    var held = chain.filter(function (c) { return c.state === 'observed'; }).length;
    function word(n) { return WORDS[n] || String(n); }
    $('chain-title').textContent = word(chain.length) + ' links. ' + word(held) + (held === 1 ? ' holds.' : ' hold.');

    host.appendChild(el('ul', { class: 'pf-chain-key', 'aria-label': 'Key to link states' }, [
      el('li', null, [dotmark('observed'), 'Observed']),
      el('li', null, [dotmark('proxy'), 'Proxy or hypothesis']),
      el('li', null, [dotmark('pending'), 'Pending'])
    ]));
    var list = el('ol', { class: 'pf-chain' });
    chain.forEach(function (c) {
      list.appendChild(el('li', null, el('button', {
        type: 'button', class: 'pf-node', 'data-link': c.id, 'data-state': c.state,
        'aria-pressed': String(c.id === state.chain), 'aria-controls': 'chain-readout',
        onclick: function () { state.chain = c.id; save(); syncChain(); }
      }, [
        dotmark(c.state),
        el('span', { class: 'pf-node-label', text: c.label }),
        el('span', { class: 'pf-node-eagle' }, [el('span', { class: 'vh', text: c.state + '. ' }), c.eagle])
      ])));
    });
    host.appendChild(list);
    host.appendChild(el('div', { class: 'pf-readout', id: 'chain-readout', 'aria-live': 'polite' }));
    syncChain();
  }

  function syncChain() {
    var out = $('chain-readout');
    if (!out || !D.passport) return;
    var c = D.passport.chain.filter(function (x) { return x.id === state.chain; })[0];
    Array.prototype.forEach.call(document.querySelectorAll('.pf-node'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-link') === state.chain));
    });
    clear(out);
    if (!c) return;
    out.appendChild(el('h3', null, [c.label, el('span', { class: 'k-state ' + c.state, text: c.state })]));
    out.appendChild(el('p', { id: 'chain-detail' }, rich(c.detail)));
    out.appendChild(el('p', { id: 'chain-next' }, [el('span', { class: 'pf-next-label', text: 'Next' }), rich(c.next)]));
  }

  /* ---------- mechanism ---------- */

  function renderMechanism() {
    var host = clear($('mechanism-body'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    var set = el('fieldset', { class: 'pf-mech-set' }, el('legend', { class: 'vh', text: 'Mechanism to test' }));
    D.passport.mechanisms.forEach(function (m) {
      set.appendChild(el('label', { class: 'pf-radio' }, [
        el('input', { type: 'radio', name: 'mechanism', value: m.id, onchange: function () { requestMechanism(m.id, true); } }),
        el('span', null, [
          el('span', { class: 'pf-radio-label', text: m.label }),
          el('span', { class: 'pf-radio-kind', text: m.kind })
        ])
      ]));
    });
    set.appendChild(el('div', { id: 'mechanism-confirm' }));
    host.appendChild(el('div', { class: 'pf-mech-grid' }, [set, el('div', { class: 'pf-mech-detail', id: 'mechanism-detail', 'aria-live': 'polite' })]));
    syncMechanism();
  }

  function syncMechanism() {
    var m = mechById(state.mechanism);
    Array.prototype.forEach.call(document.querySelectorAll('input[name="mechanism"]'), function (r) {
      r.checked = r.value === state.mechanism;
    });
    var out = $('mechanism-detail');
    if (!out || !m) return;
    clear(out);
    out.setAttribute('data-mechanism', m.id);
    out.appendChild(el('h3', { text: m.label }));
    var dl = el('dl', { class: 'pf-fields' });
    MECH_FIELDS.forEach(function (f) {
      dl.appendChild(el('dt', { text: f[1] }));
      dl.appendChild(el('dd', { 'data-mech-field': f[0] }, rich(recorded(m[f[0]]))));
    });
    out.appendChild(dl);
  }

  /* ---------- observation ---------- */

  function field(id, label, control) {
    control.id = id;
    control.classList.add('k-input');
    return el('label', { class: 'k-field', for: id }, [el('span', { text: label }), control]);
  }

  function renderObservation() {
    var host = clear($('observation-body'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    var form = el('div', { class: 'pf-form' });
    form.appendChild(el('p', { class: 'pf-form-for', id: 'observation-for' }));
    MRV_FIELDS.forEach(function (f) {
      var control = f[2] === 'textarea' ? el('textarea', { rows: f[3] ? 4 : 3 }) : el('input', { type: 'text', autocomplete: 'off' });
      control.setAttribute('data-mrv', f[0]);
      control.addEventListener('input', function () {
        state.mrv[f[0]] = control.value;
        state.mrv_edited = true;
        save();
      });
      var wrap = field('mrv-' + f[0], f[1], control);
      if (f[3]) wrap.classList.add('pf-wide');
      form.appendChild(wrap);
    });
    host.appendChild(form);

    var b = el('div', { class: 'pf-budget' });
    b.appendChild(el('h3', { text: 'Budget assumption' }));
    b.appendChild(el('p', { class: 'k-note', id: 'budget-basis', text: BUDGET_BASIS }));
    var grid = el('div', { class: 'pf-budget-grid' });
    [['visits', 'Visits', 'numeric', true], ['cost', 'Cost per visit, USD', 'decimal', false], ['setup', 'Fixed setup cost, USD', 'decimal', false]].forEach(function (f) {
      var input = el('input', { type: 'text', inputmode: f[2], autocomplete: 'off', 'aria-describedby': 'budget-' + f[0] + '-error budget-basis' });
      input.addEventListener('input', function () {
        state.budget[f[0]] = input.value;
        if (f[3]) state.mrv_edited = true;
        save();
        syncBudget();
      });
      var wrap = el('div', null, [field('budget-' + f[0], f[1] + (f[0] === 'setup' ? ' (optional)' : ''), input), el('p', { class: 'pf-error', id: 'budget-' + f[0] + '-error', role: 'alert' })]);
      grid.appendChild(wrap);
    });
    b.appendChild(grid);
    b.appendChild(el('p', { class: 'pf-total', 'aria-live': 'polite' }, [
      el('span', { class: 'pf-total-label', text: 'Total' }),
      el('span', { class: 'pf-total-value', id: 'budget-total' }),
      el('span', { class: 'pf-total-formula', id: 'budget-formula' })
    ]));
    host.appendChild(b);
    fillObservation();
  }

  function fillObservation() {
    var m = mechById(state.mechanism);
    var forLine = $('observation-for');
    if (!forLine || !m) return;
    clear(forLine);
    add(forLine, ['Drafted for ', el('b', { text: m.label })]);
    MRV_FIELDS.forEach(function (f) {
      var c = $('mrv-' + f[0]);
      if (c) c.value = state.mrv[f[0]] === undefined ? '' : state.mrv[f[0]];
    });
    ['visits', 'cost', 'setup'].forEach(function (k) {
      var c = $('budget-' + k);
      if (c) c.value = state.budget[k];
    });
    syncBudget();
  }

  function syncBudget() {
    var total = $('budget-total');
    if (!total) return;
    var b = budget();
    ['visits', 'cost', 'setup'].forEach(function (k) {
      var input = $('budget-' + k);
      var err = $('budget-' + k + '-error');
      err.textContent = b.errors[k];
      input.classList.toggle('pf-input-bad', !!b.errors[k]);
      if (b.errors[k]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    var formula = $('budget-formula');
    total.className = 'pf-total-value';
    formula.textContent = '';
    if (b.status === 'invalid') {
      total.classList.add('pf-invalid');
      total.textContent = b.errors.visits || b.errors.cost || b.errors.setup ? 'Correct the marked field. The draft will record no total.' : b.error;
    } else if (b.status === 'unknown') {
      total.classList.add('pf-unknown');
      total.textContent = COST_EMPTY;
    } else {
      total.textContent = formatUSD(b.total_cents);
      formula.textContent = b.visits + ' × ' + formatUSD(b.cost_cents) + (b.setup_cents ? ' + ' + formatUSD(b.setup_cents) : '');
    }
  }

  /* ---------- obligation ---------- */

  function obFields() {
    if (!D.passport) return [];
    var out = [];
    OB_GROUPS.forEach(function (g) {
      (D.passport.obligation[g[0]] || []).forEach(function (name) {
        out.push({ group: g[0], group_label: g[1], field: name, key: g[0] + '|' + name });
      });
    });
    return out;
  }

  function obEntry(key) {
    var def = D.passport.obligation.statuses[0];
    var e = state.obligation[key] || {};
    var valid = D.passport.obligation.statuses.indexOf(e.status) !== -1;
    return { status: valid ? e.status : def, note: e.note || '', asserted_utc: valid && e.status !== def ? e.asserted_utc || null : null };
  }

  function pendingCount() {
    var def = D.passport.obligation.statuses[0];
    return obFields().filter(function (f) { return obEntry(f.key).status === def; }).length;
  }

  function renderObligation() {
    var host = clear($('obligation-body'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    var ob = D.passport.obligation;
    var top = el('div', { class: 'pf-form' });
    [['recipient', 'Recipient hypothesis', 'Unidentified'], ['decision', 'Operating decision this could inform', ''], ['reviewer', 'Reviewer or accountable owner', '']].forEach(function (f) {
      var input = el('input', { type: 'text', autocomplete: 'off', placeholder: f[2] || null });
      input.value = state.review[f[0]] || '';
      input.addEventListener('input', function () { state.review[f[0]] = input.value; save(); });
      var wrap = field('review-' + f[0], f[1], input);
      if (f[0] === 'recipient') wrap.classList.add('pf-wide');
      top.appendChild(wrap);
    });
    host.appendChild(top);

    var n = 0;
    OB_GROUPS.forEach(function (g) {
      var sec = el('section', { class: 'pf-group', 'data-ob-group': g[0] }, el('h3', { text: g[1] }));
      (ob[g[0]] || []).forEach(function (name) {
        var key = g[0] + '|' + name;
        var id = 'ob-' + (n++);
        var e = obEntry(key);
        var select = el('select', { id: id + '-status', class: 'k-input', 'data-ob': key });
        ob.statuses.forEach(function (s) { select.appendChild(el('option', { value: s, text: s })); });
        select.value = e.status;
        select.setAttribute('data-set', String(e.status !== ob.statuses[0]));
        var note = el('input', { type: 'text', id: id + '-note', class: 'k-input', placeholder: 'Optional note', autocomplete: 'off', 'data-ob-note': key });
        note.value = e.note;
        select.addEventListener('change', function () {
          var cur = state.obligation[key] || (state.obligation[key] = { note: '' });
          cur.status = select.value;
          if (select.value === ob.statuses[0]) delete cur.asserted_utc;
          else cur.asserted_utc = stamp();
          select.setAttribute('data-set', String(select.value !== ob.statuses[0]));
          save();
          syncPending();
        });
        note.addEventListener('input', function () {
          var cur = state.obligation[key] || (state.obligation[key] = { status: ob.statuses[0] });
          cur.note = note.value;
          save();
        });
        sec.appendChild(el('div', { class: 'pf-ob-row' }, [
          el('label', { for: id + '-status', text: name }),
          el('div', { class: 'pf-select' }, select),
          el('div', { class: 'pf-ob-notefield' }, [el('label', { class: 'vh', for: id + '-note', text: 'Note for ' + name }), note])
        ]));
      });
      host.appendChild(sec);
    });
    host.appendChild(el('p', { class: 'pf-ob-note', text: ob.note }));
    host.appendChild(el('p', { class: 'pf-ob-summary', id: 'pending-summary', role: 'status', 'aria-live': 'polite' }));
    syncPending();
  }

  function syncPending() {
    var out = $('pending-summary');
    if (!out) return;
    out.textContent = pendingCount() + ' of ' + obFields().length + ' fields pending';
  }

  /* ---------- layers ---------- */

  function renderLayers() {
    var host = clear($('layers-body'));
    if (!D.passport) { host.appendChild(unavailable('passport')); return; }
    [['included', 'Included'], ['excluded', 'Excluded']].forEach(function (g) {
      var rows = D.passport.layer_inventory.filter(function (l) { return l.use === g[0]; });
      host.appendChild(el('section', { class: 'pf-layer-group pf-' + g[0], 'data-layer-group': g[0] }, [
        el('h3', null, [g[1] + ' · ', el('span', { class: 'mono', text: String(rows.length) })]),
        el('ul', null, rows.map(function (l) {
          return el('li', null, [el('span', { text: l.layer }), el('span', null, rich(l.reason))]);
        }))
      ]));
    });
  }

  /* ---------- export ---------- */

  function sourceHashes() {
    return { file: FILES.sources, inputs_sha256: D.sources.inputs_sha256, outputs_sha256: D.sources.outputs_sha256 };
  }

  function buildPassport() {
    var p = D.passport;
    return {
      schema: 'keystone-ecological-passport-export/1',
      status: PASSPORT_STATUS,
      generated_utc: stamp(),
      release: p.release,
      candidate: p.candidate,
      claim_limits: p.claim_limits,
      dimensions: p.dimensions,
      chain: p.chain,
      layer_inventory: p.layer_inventory,
      attribution: p.attribution,
      sources: sourceHashes()
    };
  }

  function buildDraft() {
    var p = D.passport;
    var m = mechById(state.mechanism);
    var mrv = {};
    MRV_FIELDS.forEach(function (f) { mrv[f[0]] = state.mrv[f[0]] || ''; });
    var groups = OB_GROUPS.map(function (g) {
      return {
        id: g[0],
        label: g[1],
        fields: (p.obligation[g[0]] || []).map(function (name) {
          var e = obEntry(g[0] + '|' + name);
          var o = { field: name, status: e.status, note: e.note };
          if (e.status !== p.obligation.statuses[0]) o.asserted_utc = e.asserted_utc;
          return o;
        })
      };
    });
    return {
      schema: 'keystone-review-draft/1',
      record_status: RECORD_STATUS,
      generated_utc: stamp(),
      candidate_id: p.candidate.id,
      candidate: { id: p.candidate.id, parcel_id: p.candidate.parcel_id, area_ha: p.candidate.area_ha, status: p.candidate.status, rights: p.candidate.rights },
      mechanism: m,
      mrv_action: { status: ACTION_STATUS, edited_by_reviewer: !!state.mrv_edited, fields: mrv },
      budget: budgetExport(),
      recipient_hypothesis: state.review.recipient.trim() || 'Unidentified',
      operating_decision: state.review.decision.trim() || null,
      reviewer: state.review.reviewer.trim() || null,
      obligation: { note: p.obligation.note, pending_count: pendingCount(), field_count: obFields().length, groups: groups },
      claim_limits: p.claim_limits,
      sources: sourceHashes()
    };
  }

  function draftMarkdown(d) {
    var L = [];
    function kv(k, v) { L.push('- ' + k + ': ' + (v === null || v === undefined || v === '' ? NOT_RECORDED : String(v).replace(/\s*\n\s*/g, ' '))); }
    L.push('# Eagle candidate review draft', '');
    L.push('> ' + d.record_status, '');
    kv('Candidate', d.candidate.id);
    kv('County parcel', d.candidate.parcel_id);
    kv('Area, ha', Number(d.candidate.area_ha).toFixed(3));
    kv('Candidate status', d.candidate.status);
    kv('Rights', d.candidate.rights);
    kv('Generated, UTC', d.generated_utc);
    L.push('', '## Mechanism to test', '');
    kv('Mechanism', d.mechanism.label);
    kv('Kind', d.mechanism.kind);
    MECH_FIELDS.forEach(function (f) { kv(f[1], d.mechanism[f[0]]); });
    L.push('', '## Next observation', '', d.mrv_action.status, '');
    MRV_FIELDS.forEach(function (f) { kv(f[1], d.mrv_action.fields[f[0]]); });
    kv('Edited by reviewer', d.mrv_action.edited_by_reviewer ? 'Yes' : 'No');
    L.push('', '## Budget assumption', '', d.budget.basis, '');
    kv('Visits', d.budget.visits);
    kv('Cost per visit, USD', d.budget.cost_per_visit_usd === null ? null : formatUSD(Math.round(d.budget.cost_per_visit_usd * 100)));
    kv('Fixed setup cost, USD', d.budget.fixed_setup_usd === null ? null : formatUSD(Math.round(d.budget.fixed_setup_usd * 100)));
    kv('Total', d.budget.total_display === null ? 'Unknown' : d.budget.total_display);
    if (d.budget.note) kv('Note', d.budget.note);
    if (d.budget.budget_error) kv('Budget error', d.budget.budget_error);
    L.push('', '## Evidence to obligation', '');
    kv('Recipient hypothesis', d.recipient_hypothesis);
    kv('Operating decision this could inform', d.operating_decision);
    kv('Reviewer or accountable owner', d.reviewer);
    kv('Fields pending', d.obligation.pending_count + ' of ' + d.obligation.field_count);
    L.push('', d.obligation.note);
    d.obligation.groups.forEach(function (g) {
      L.push('', '### ' + g.label, '', '| Field | Status | Asserted, UTC | Note |', '| --- | --- | --- | --- |');
      g.fields.forEach(function (f) {
        L.push('| ' + [f.field, f.status, f.asserted_utc || '', f.note || ''].map(function (c) { return String(c).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' '); }).join(' | ') + ' |');
      });
    });
    L.push('', '## What this file does not establish', '');
    d.claim_limits.forEach(function (c) { L.push('- ' + c); });
    L.push('', '## Source hashes', '', 'From ' + d.sources.file + '. SHA-256.', '', '### Inputs', '');
    Object.keys(d.sources.inputs_sha256).forEach(function (k) { L.push('- `' + k + '` `' + d.sources.inputs_sha256[k] + '`'); });
    L.push('', '### Outputs', '');
    Object.keys(d.sources.outputs_sha256).forEach(function (k) { L.push('- `' + k + '` `' + d.sources.outputs_sha256[k] + '`'); });
    L.push('');
    return L.join('\n');
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name, hidden: true });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    var out = $('export-status');
    out.textContent = '';
    setTimeout(function () { out.textContent = 'Started the download of ' + name + '.'; }, 30);
  }

  function exportsReady() { return !!(D.passport && D.sources); }

  function syncExport() {
    var ok = exportsReady();
    ['export-passport', 'export-draft-json', 'export-draft-md'].forEach(function (id) { $(id).disabled = !ok; });
    var explain = clear($('export-explain'));
    if (ok) {
      explain.textContent = 'Nothing is sent anywhere. Each file is built in this browser.';
    } else {
      explain.appendChild(el('span', { class: 'k-fail', text: 'Exports are disabled because source data did not load. No partial file is offered. ' }));
      explain.appendChild(el('button', { type: 'button', class: 'k-btn', text: 'Retry', onclick: retry }));
    }
  }

  function bindExport() {
    $('export-passport').addEventListener('click', function () {
      if (!exportsReady()) return;
      download('eagle-ecological-passport-' + dateTag() + '.json', JSON.stringify(buildPassport(), null, 2) + '\n', 'application/json');
    });
    $('export-draft-json').addEventListener('click', function () {
      if (!exportsReady()) return;
      download('eagle-review-draft-' + dateTag() + '.json', JSON.stringify(buildDraft(), null, 2) + '\n', 'application/json');
    });
    $('export-draft-md').addEventListener('click', function () {
      if (!exportsReady()) return;
      download('eagle-review-draft-' + dateTag() + '.md', draftMarkdown(buildDraft()), 'text/markdown');
    });
    $('reset-file').addEventListener('click', function () {
      showConfirm($('reset-confirm'),
        'Resetting clears every entry you made in this file. Downloads you already saved are unaffected.',
        'Clear my entries', 'Keep my entries',
        function () {
          try { window.localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ }
          state = blank();
          window.__FILE = state;
          pendingMechanism = null;
          syncUrl(true);
          initState();
          renderForms();
          $('export-status').textContent = 'File reset. Every entry is cleared.';
          $('reset-file').focus();
        },
        function () { $('reset-file').focus(); }, true);
    });
  }

  /* ---------- orchestration ---------- */

  function renderForms() {
    renderChain();
    renderMechanism();
    renderObservation();
    renderObligation();
  }

  function renderAll() {
    renderParcel();
    renderFacts();
    renderPassport();
    renderForms();
    renderLayers();
    syncExport();
    if (D.passport) {
      var wanted = urlMechanism();
      if (wanted && wanted !== state.mechanism && mechById(wanted)) requestMechanism(wanted, false);
    }
  }

  window.addEventListener('popstate', function () {
    if (!D.passport) return;
    var wanted = urlMechanism();
    if (wanted && mechById(wanted)) requestMechanism(wanted, false);
  });

  function start() {
    bindExport();
    load(['passport', 'eagle', 'sources']).then(function () {
      window.__FILE_READY = true;
      if (window.location.hash.length > 1) {
        var target = document.getElementById(window.location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
