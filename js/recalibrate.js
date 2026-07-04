/* ============================================================================
   js/recalibrate.js - the honest what-if (scene 10), computed live
   The engine's real calibration (validation/coloradoriver/calibrated_likelihood.py):
   a precision-weighted Gaussian update in logit space, with observation noise
   tied to the mechanism's measured out-of-sample skill. This widget recomputes
   the posterior LIVE from those parameters as the reader widens the noise from
   the synthetic (overconfident) value to the skill-calibrated value. It is not
   an interpolation; it is the same arithmetic the model uses.
   ========================================================================== */
(function () {
  "use strict";
  var R = (window.APP_DATA||{}).validation && window.APP_DATA.validation.recal,
      host = document.getElementById("recal-mount");
  if (!R || !host) { if (host) host.style.display="none"; window.__RECAL={ready:false}; return; }

  var prior_p = R.prior_p, prior_sd = R.prior_sd, mech = R.mech_value,
      synth_sd = R.synth_sd, calib_sd = R.calib_sd;

  function logit(p){ p = Math.max(0.02, Math.min(0.98, p)); return Math.log(p/(1-p)); }
  function expit(z){ return 1/(1+Math.exp(-z)); }
  var pm = logit(prior_p), om = logit(mech);
  // precision-weighted posterior mean (probability space) as a function of obs noise
  function posterior(obs_sd){
    var wp = 1/(prior_sd*prior_sd), wo = 1/(obs_sd*obs_sd);
    return expit((pm*wp + om*wo) / (wp + wo));
  }
  var synth_p = posterior(synth_sd), calib_p = posterior(calib_sd);

  function pos(v){ return ((v - 0.50) / (0.70 - 0.50)) * 100; } // 0.50..0.70 -> 0..100%

  host.innerHTML =
    '<div class="gh-sub">Observation noise on a good <b>'+R.mechanism.replace(/_/g," ")+
      '</b> parcel: <b style="color:var(--amber)">synthetic</b> (overconfident) to '+
      '<b style="color:var(--green)">calibrated</b> (tied to the mechanism’s measured '+
      'out-of-sample skill). The posterior is recomputed live by the engine’s own '+
      'precision-weighted Bayesian update, not interpolated.</div>'+
    '<div class="gh-dial"><b class="gh-state" id="recal-v"></b>'+
      '<span class="cro-unit">posterior p(K)<br><span id="recal-sd"></span></span></div>'+
    '<div class="gh-track" id="recal-track">'+
      '<svg viewBox="0 0 300 44" width="100%" height="44" preserveAspectRatio="none" aria-hidden="true">'+
        '<line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,.1)" stroke-width="1"/>'+
        '<line x1="'+(pos(prior_p)*3)+'" y1="8" x2="'+(pos(prior_p)*3)+'" y2="38" stroke="var(--muted)" stroke-dasharray="3 3"/>'+
        '<text x="'+(pos(prior_p)*3)+'" y="6" fill="var(--faint)" font-family="var(--mono)" font-size="8" text-anchor="middle">prior '+prior_p.toFixed(2)+'</text>'+
        '<circle cx="'+(pos(synth_p)*3)+'" cy="30" r="4" fill="var(--amber)" opacity="0.4"/>'+
        '<text x="'+(pos(synth_p)*3)+'" y="44" fill="var(--amber)" font-family="var(--mono)" font-size="8" text-anchor="middle">'+synth_p.toFixed(3)+'</text>'+
        '<circle cx="'+(pos(calib_p)*3)+'" cy="30" r="4" fill="var(--green)" opacity="0.4"/>'+
        '<circle id="recal-dot" cx="'+(pos(synth_p)*3)+'" cy="30" r="6.5" fill="var(--green)"/>'+
      '</svg>'+
    '</div>'+
    '<input class="gh-slider" id="recal-s" type="range" min="0" max="100" value="0" '+
      'aria-label="Observation noise, synthetic to calibrated">'+
    '<div class="gh-scale"><span>synthetic obs_sd '+synth_sd.toFixed(2)+'</span><span>calibrated obs_sd '+calib_sd.toFixed(2)+'</span></div>'+
    '<div class="gh-foot">Prior '+prior_p.toFixed(2)+'. Widening the observation noise shrinks the '+
      'likelihood’s weight, so the posterior mean slides back toward the prior. With near-zero '+
      'measured skill (out-of-sample R² ≈ '+R.oof_r2.toFixed(1)+'), a falsely-confident '+
      synth_p.toFixed(3)+' becomes '+calib_p.toFixed(3)+'; it cannot move the other way, toward '+
      'confidence the data does not support.</div>';

  var s=document.getElementById("recal-s"), v=document.getElementById("recal-v"),
      dot=document.getElementById("recal-dot"), sd=document.getElementById("recal-sd");
  function draw(){
    var t = +s.value/100;
    var obs_sd = synth_sd + (calib_sd - synth_sd) * t;  // widen the noise...
    var p = posterior(obs_sd);                          // ...posterior recomputed live
    v.textContent = p.toFixed(3);
    if (sd) sd.textContent = "obs_sd " + obs_sd.toFixed(2);
    v.classList.toggle("deg", t > 0.35);
    if (dot) dot.setAttribute("cx", pos(p) * 3);
  }
  s.addEventListener("input", draw); draw();

  window.__RECAL = { ready:true, computed_live:true, from:synth_p, to:calib_p, prior:prior_p,
    monotone_toward_prior: (calib_p <= synth_p) && (calib_p >= prior_p) };
})();
