/* ============================================================================
   js/ledger.js - the honest ledger (scene 11)
   Renders APP_DATA.ledger.proven and .not_proven into the two-column honesty
   grid. Generated from the run outputs, not typed, so the not-yet column cannot
   drift optimistic.
   ========================================================================== */
(function () {
  "use strict";
  var L = (window.APP_DATA||{}).ledger, host = document.getElementById("ledger-mount");
  if (!L || !host) { if (host) host.style.display="none"; window.__LEDGER={ready:false}; return; }

  function col(title, items, cls, mark){
    var h = '<div class="honesty-col '+cls+'"><h4 class="honesty-h">'+title+'</h4>';
    items.forEach(function(t){ h += '<div class="honesty-li"><span class="mk">'+mark+'</span><span>'+t+'</span></div>'; });
    return h + '</div>';
  }
  host.className = "";
  host.innerHTML =
    '<div class="honesty">'+
      col("Proven · the machine", L.proven, "proven", "✓")+
      col("Not yet · the distance to a dollar", L.not_proven, "notyet", "○")+
    '</div>'+
    '<div class="honesty-summary">&ldquo;'+L.partner_summary+'&rdquo; &nbsp;A partner review, generated straight from the run.</div>';

  window.__LEDGER = { ready:true, proven:L.proven.length, not_proven:L.not_proven.length };
})();
