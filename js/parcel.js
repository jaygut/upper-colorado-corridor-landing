/* ============================================================================
   js/parcel.js - the keystone tear-sheet (scene 8)
   Read-only: a hero number with its gates, credible interval, and provenance.
   Nothing recomputed. Binds the real rank-1 parcel from the run geometry so the
   card and the map agree (same id, same provenance, same p(K)).
   ========================================================================== */
(function () {
  "use strict";
  var D = window.APP_DATA || {}, host = document.getElementById("parcel-mount");
  if (!D.graph || !host) { if (host) host.style.display="none";
    window.__PARCEL={ready:false}; return; }

  var g = D.model.gates, kr = D.keystone_ratio;
  var topId = D.graph.top_parcel.id;
  // prefer the real geometry record (has ci_low/ci_high); fall back to the scalar
  var geo = (D.geo && D.geo.parcels || []).filter(function(p){return p.id===topId;})[0];
  var p = {
    id: topId,
    pk: geo ? geo.pk : D.graph.top_parcel.pk_mean,
    ks: geo ? geo.ks : D.graph.top_parcel.pk_mean,
    lo: geo ? geo.lo : null, hi: geo ? geo.hi : null,
    zone: (geo ? geo.zone : D.graph.top_parcel.zone),
    verified: geo ? geo.verified : (D.graph.top_parcel.provenance==="verified_boundary"?1:0),
    rank: geo ? geo.rank : 1
  };
  var provLabel = p.verified ? "verified boundary" : "public seed envelope";
  var hero = (p.ks!=null ? p.ks : p.pk);

  var ciBar = "";
  if (p.lo!=null && p.hi!=null){
    var toPct=function(v){ return ((v-0.3)/(0.9-0.3)*100); }; // 0.3..0.9 window
    ciBar =
      '<svg class="cro-ci" viewBox="0 0 300 34" width="100%" preserveAspectRatio="none" aria-label="90 percent credible interval">'+
        '<line x1="'+(toPct(0.5)*3)+'" y1="4" x2="'+(toPct(0.5)*3)+'" y2="30" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 3"/>'+
        '<rect x="'+(toPct(p.lo)*3)+'" y="14" width="'+((toPct(p.hi)-toPct(p.lo))*3)+'" height="6" rx="3" fill="var(--teal)" opacity="0.5"/>'+
        '<circle cx="'+(toPct(hero)*3)+'" cy="17" r="5" fill="var(--green)"/>'+
        '<text x="'+(toPct(0.5)*3)+'" y="34" fill="var(--faint)" font-family="var(--mono)" font-size="8" text-anchor="middle">prior 0.5</text>'+
      '</svg>';
  }

  // gate clearance is COMPUTED from the value, never asserted (honesty gate)
  var clearsPrior = p.lo != null && p.lo > 0.5;
  var clearsK = hero >= g.keystone, clearsI = hero >= g.investable;
  var gateSentence =
    (clearsPrior
      ? 'Clears the prior (credible-interval low ' + p.lo.toFixed(2) + ' > 0.50). '
      : 'Does not clear the prior. ') +
    (clearsK ? 'Clears' : 'Below') + ' the keystone gate (' + g.keystone.toFixed(2) + '); ' +
    (clearsI ? 'clears' : 'below') + ' the investable gate (' + g.investable.toFixed(2) + '). ' +
    'One of the ' + kr.ci_clearing.n + ' parcels (' + kr.ci_clearing.pct.toFixed(1) +
    '%) whose credible interval clears the prior, all in the Eagle headwaters.';

  // settlement-rail slot (BASIN Certificate of Ensurance) - placeholder, wired to real situs keys
  var inst = D.instruments, slot = "";
  if (inst && inst.top_parcel_slot) {
    var s = inst.top_parcel_slot;
    slot =
      '<div class="cro-slot">'+
        '<div class="cro-slot-head"><span>'+inst.settlement+'</span>'+
          '<span class="cro-slot-status">'+s.status_label+'</span></div>'+
        '<div class="cro-slot-body">situs <b>'+s.place_id+'</b> &middot; '+s.place_label+
          ', a binder-registered place ('+s.place_binder+') &middot; settlement via '+
          '<a href="'+inst.settlement_url+'" target="_blank" rel="noopener noreferrer">BASIN Natural Capital</a>'+
          ' &middot; <span class="cro-slot-addr">instrument ref pending</span></div>'+
        '<div class="cro-slot-note">Placeholder wired to the run’s real keys. An instrument appears '+
          'only once this place clears monitoring and its Certificate of Ensurance is issued. Screening-grade, not an offer to sell.</div>'+
      '</div>';
  }

  host.className = "cro";
  host.innerHTML =
    '<div class="cro-top"><div><div class="cro-title">Keystone tear-sheet'+
      '<span class="cro-id">'+p.id+' · rank '+p.rank+' of 56</span></div></div>'+
      '<div class="cro-badges"><span class="cro-badge">'+p.zone.replace(/_/g," ")+'</span>'+
      '<span class="cro-badge'+(p.verified?" verified":"")+'">'+provLabel+'</span></div></div>'+
    '<div class="cro-hero-num"><b>'+hero.toFixed(2)+'</b>'+
      '<span class="cro-unit">keystone posterior<br>90% CI '+(p.lo!=null?p.lo.toFixed(2)+' to '+p.hi.toFixed(2):'n/a')+'</span></div>'+
    ciBar+
    '<div class="cro-hero-sub">'+gateSentence+'</div>'+
    slot+
    '<div class="cro-foot">Provenance: keystone_state_space_v0_1 · Beta(2,2) prior · 2,000 to 6,000 MC draws. '+
      'No dollar-at-risk is computed for this run.</div>';

  window.__PARCEL = { ready:true, id:p.id, pk:hero, verified:!!p.verified,
    clears_keystone_gate: clearsK, clears_prior: clearsPrior };
})();
