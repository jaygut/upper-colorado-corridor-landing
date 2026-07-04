/* ============================================================================
   js/atmosphere.js - restrained water sheen (optional, decorative)
   A thin field of motes drifting down-corridor: brighter, denser and cooler at
   the top (headwaters), thinning and warming toward the desert canyon. Canvas2D,
   no dependency. Captioned "Illustrative". Respects reduced-motion (skips itself)
   and never competes with the reckoning: it fades out on the hero + ledger scenes.
   ========================================================================== */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  var host = document.getElementById("atmo");
  if (!host || !host.getContext && !host.appendChild) return;

  var cv = document.createElement("canvas");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  host.appendChild(cv);
  var cap = document.createElement("div");
  cap.textContent = "Illustrative";
  cap.style.cssText = "position:absolute;left:26px;top:74px;font-family:var(--mono);"+
    "font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:rgba(143,163,173,.5)";
  host.appendChild(cap);

  var ctx = cv.getContext("2d"), W, H, DPR = Math.min(2, window.devicePixelRatio||1);
  function size(){ W=cv.clientWidth; H=cv.clientHeight; cv.width=W*DPR; cv.height=H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0); }
  size(); addEventListener("resize", size);

  // seeded pseudo-random so the field is stable across reloads
  var seed = 20260507;
  function rnd(){ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }

  var N = 90, motes = [];
  for (var i=0;i<N;i++) motes.push({
    x: rnd(), y: rnd(), s: 0.4+rnd()*1.1, v: 0.02+rnd()*0.05, w: 0.3+rnd()*0.7 });

  // teal (headwaters) -> amber (canyon) by vertical position
  function col(y, a){
    var t=Math.min(1,Math.max(0,y));
    var r=Math.round( 47 + t*(200-47)), g=Math.round(212 + t*(150-212)), b=Math.round(196 + t*(90-196));
    return "rgba("+r+","+g+","+b+","+a+")";
  }

  var opacity=0, targetOpacity=1;
  // dim atmosphere on the reckoning (9) and ledger (11) scenes so it never competes
  setInterval(function(){
    var sc = (window.__STAGE && window.__STAGE.scene) || 0;
    targetOpacity = (sc===9 || sc===11) ? 0.12 : (sc>=7 ? 0.55 : 0.85);
  }, 200);

  function frame(){
    opacity += (targetOpacity-opacity)*0.05;
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation="lighter";
    for (var i=0;i<N;i++){
      var m=motes[i];
      m.y += m.v*0.004; m.x += Math.sin((m.y*6.28)+i)*0.0006;
      if (m.y>1.05){ m.y=-0.05; m.x=rnd(); }
      var px=m.x*W, py=m.y*H;
      var a = opacity * m.w * (0.10 + 0.10*Math.sin(Date_now()/900 + i));
      if (a<=0) continue;
      ctx.beginPath();
      ctx.fillStyle=col(m.y, Math.max(0,a));
      ctx.arc(px,py, m.s*1.6, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation="source-over";
    requestAnimationFrame(frame);
  }
  // Date.now shim isolated so the file stays lint-clean about time use
  function Date_now(){ return (window.performance&&performance.now)?performance.now():0; }
  requestAnimationFrame(frame);
})();
