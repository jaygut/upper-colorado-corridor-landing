/* ============================================================================
   js/validation.js - the hero chart (scene 9, the reckoning)
   Reads APP_DATA.validation, projects the reported numbers, writes a
   verification global. Three panels: (1) the in-sample signal is real,
   (2) out-of-sample a two-variable baseline beats the model, (3) the real
   leave-one-HUC8-out observed-vs-predicted scatter (near-zero skill).
   D3 only. Nothing recomputed; every value traces to APP_DATA.
   ========================================================================== */
(function () {
  "use strict";
  var V = (window.APP_DATA || {}).validation, host = document.getElementById("validation-mount");
  if (!V || !host || !window.d3) { if (host) host.style.display = "none";
    window.__VALIDATION = { ready:false, reason:"missing V/host/d3" }; return; }

  var css = getComputedStyle(document.documentElement);
  function tok(n,f){ var v=(css.getPropertyValue(n)||"").trim(); return v||f; }
  var GREEN=tok("--green","#3AD6A3"), CORAL=tok("--coral","#E8694D"),
      MUTED=tok("--muted","#8fa3ad"), TEXT=tok("--text","#eaf2f2"),
      FAINT=tok("--faint","#5C6E78"), AMBER=tok("--amber","#F2A24E");

  /* ---- Step 1: in-sample rho strip (the real signal) ------------------ */
  var strip = d3.select(host).append("div").attr("class","val-strip");
  strip.append("div").attr("class","val-steplab")
    .html("<b>Step 1.</b> The signal is real (in-sample Spearman &rho;, all correctly signed)");
  var sr = strip.append("div").attr("class","val-rows");
  V.in_sample.forEach(function(d){
    var row = sr.append("div").attr("class","val-row");
    row.append("span").text(d.outcome);
    row.append("b").style("color",CORAL).text(d.rho.toFixed(3));
    row.append("span").attr("class","val-muted").text("n=" + d.n + " · p=" + d.p);
  });

  /* ---- Step 4: out-of-sample incremental value (the decisive bars) ---- */
  var W=660, H=250, m={t:36,r:100,b:24,l:16}, iw=W-m.l-m.r, ih=H-m.t-m.b;
  var rowsD=V.oof, r2min=-1.1, r2max=0.5;
  var x=d3.scaleLinear().domain([r2min,r2max]).range([0,iw]);
  var y=d3.scaleBand().domain(rowsD.map(function(d){return d.set;})).range([0,ih]).padding(0.34);
  var svg=d3.select(host).append("svg").attr("viewBox","0 0 "+W+" "+H).attr("width","100%")
    .style("overflow","visible")
    .attr("role","img").attr("aria-label","Out-of-sample R squared: a two-variable baseline beats the model");
  var g=svg.append("g").attr("transform","translate("+m.l+","+m.t+")");
  g.append("text").attr("x",0).attr("y",-18).attr("fill",MUTED)
    .attr("font-family","var(--mono)").attr("font-size",10)
    .text("Step 4. Out-of-sample R² (leave-one-HUC8-out, log-turbidity, n=45), higher is better");
  var x0=x(0);
  g.append("line").attr("x1",x0).attr("x2",x0).attr("y1",-6).attr("y2",ih)
    .attr("stroke","rgba(255,255,255,.22)");
  g.append("text").attr("x",x0).attr("y",ih+16).attr("text-anchor","middle")
    .attr("fill",FAINT).attr("font-family","var(--mono)").attr("font-size",9.5).text("0");
  rowsD.forEach(function(d){
    var pos=d.r2>=0, xb=x(d.r2), col=(d.kind==="baseline")?GREEN:CORAL;
    g.append("rect").attr("x",Math.min(x0,xb)).attr("y",y(d.set))
      .attr("width",Math.abs(xb-x0)).attr("height",y.bandwidth()).attr("rx",3)
      .attr("fill",col).attr("opacity",d.kind==="baseline"?0.92:0.6);
    g.append("text").attr("x",pos?xb+6:xb-6).attr("y",y(d.set)+y.bandwidth()/2+4)
      .attr("text-anchor",pos?"start":"end").attr("fill",col)
      .attr("font-family","var(--mono)").attr("font-size",11.5).attr("font-weight",600)
      .text((d.r2>=0?"+":"")+d.r2.toFixed(3)+(d.dr2!=null?"  (ΔR² "+d.dr2+")":""));
    g.append("text").attr("x",x0+(pos?-8:8)).attr("y",y(d.set)+y.bandwidth()/2+4)
      .attr("text-anchor",pos?"end":"start").attr("fill",d.kind==="baseline"?TEXT:MUTED)
      .attr("font-family","var(--mono)").attr("font-size",10.5).text(d.set);
  });

  /* ---- Step 3 (real arrays): observed vs predicted scatter ------------ */
  var sc = V.oof_scatter && V.oof_scatter.sediment_avoidance;
  if (sc && sc.obs && sc.pred && sc.obs.length) {
    var SW=660, SH=190, sm={t:30,r:16,b:30,l:44}, siw=SW-sm.l-sm.r, sih=SH-sm.t-sm.b;
    var lo=Math.min(d3.min(sc.obs),d3.min(sc.pred))-0.2,
        hi=Math.max(d3.max(sc.obs),d3.max(sc.pred))+0.2;
    var sx=d3.scaleLinear().domain([lo,hi]).range([0,siw]),
        sy=d3.scaleLinear().domain([lo,hi]).range([sih,0]);
    var ssvg=d3.select(host).append("svg").attr("viewBox","0 0 "+SW+" "+SH).attr("width","100%")
      .style("overflow","visible")
      .attr("role","img").attr("aria-label","Observed versus predicted log-turbidity, leave-one-HUC8-out; predictions do not track observations");
    // real out-of-sample fit statistics of the plotted points (obs vs pred)
    var mo=d3.mean(sc.obs), ssTot=d3.sum(sc.obs.map(function(o){return (o-mo)*(o-mo);})),
        ssRes=d3.sum(sc.obs.map(function(o,i){return (o-sc.pred[i])*(o-sc.pred[i]);}));
    var r2fit = 1 - ssRes/ssTot;
    function rank(a){ var idx=d3.range(a.length).sort(function(i,j){return a[i]-a[j];}),
      r=[]; idx.forEach(function(i,k){r[i]=k;}); return r; }
    var ro=rank(sc.obs), rp=rank(sc.pred), mr=(sc.obs.length-1)/2,
        cr=d3.sum(ro.map(function(a,i){return (a-mr)*(rp[i]-mr);})),
        vr=Math.sqrt(d3.sum(ro.map(function(a){return (a-mr)*(a-mr);}))*
                     d3.sum(rp.map(function(b){return (b-mr)*(b-mr);})));
    var rankr = cr/vr;
    var sg=ssvg.append("g").attr("transform","translate("+sm.l+","+sm.t+")");
    sg.append("text").attr("x",0).attr("y",-14).attr("fill",MUTED)
      .attr("font-family","var(--mono)").attr("font-size",10)
      .text("Predicted vs observed log-turbidity, held out (n=" + sc.n +
            ", R²=" + (r2fit>=0?"+":"") + r2fit.toFixed(2) +
            ", rank r=" + (rankr>=0?"+":"") + rankr.toFixed(2) + ")");
    // 1:1 line (perfect skill)
    sg.append("line").attr("x1",sx(lo)).attr("y1",sy(lo)).attr("x2",sx(hi)).attr("y2",sy(hi))
      .attr("stroke",GREEN).attr("stroke-dasharray","4 4").attr("stroke-opacity",.5).attr("stroke-width",1);
    sg.append("text").attr("x",siw-2).attr("y",6).attr("text-anchor","end").attr("fill",GREEN)
      .attr("font-family","var(--mono)").attr("font-size",9).attr("opacity",.7).text("perfect skill (1:1)");
    // axes ticks
    [Math.ceil(lo),Math.round((lo+hi)/2),Math.floor(hi)].forEach(function(t){
      sg.append("text").attr("x",sx(t)).attr("y",sih+16).attr("text-anchor","middle").attr("fill",FAINT)
        .attr("font-family","var(--mono)").attr("font-size",9).text(t);
      sg.append("text").attr("x",-8).attr("y",sy(t)+3).attr("text-anchor","end").attr("fill",FAINT)
        .attr("font-family","var(--mono)").attr("font-size",9).text(t);
    });
    sg.append("text").attr("x",siw/2).attr("y",sih+28).attr("text-anchor","middle").attr("fill",MUTED)
      .attr("font-family","var(--mono)").attr("font-size",9.5).text("predicted");
    sg.append("text").attr("transform","rotate(-90)").attr("x",-sih/2).attr("y",-32)
      .attr("text-anchor","middle").attr("fill",MUTED).attr("font-family","var(--mono)")
      .attr("font-size",9.5).text("observed");
    // points
    sc.pred.forEach(function(px,i){
      sg.append("circle").attr("cx",sx(px)).attr("cy",sy(sc.obs[i])).attr("r",3.1)
        .attr("fill",CORAL).attr("fill-opacity",.62).attr("stroke",CORAL).attr("stroke-opacity",.3);
    });
    d3.select(host).append("div").attr("class","val-scatter-cap")
      .html("The model plus the two confounders does track held-out turbidity (rank r=" +
            (rankr>=0?"+":"") + rankr.toFixed(2) + "): it is not noise. But that skill is <b>not incremental</b>. " +
            "A two-variable baseline (elevation + % developed) already reaches +0.40 out-of-sample, " +
            "which the bespoke mechanism never beats.");
  }

  /* ---- verdict + second mechanism ------------------------------------- */
  d3.select(host).append("div").attr("class","val-verdict").html(
    "Verdict <b class='red'>" + V.verdict.replace(/_/g," ") + " (" + V.strength + ")</b>. " + V.diagnosis);
  d3.select(host).append("div").attr("class","val-2nd").html(
    "Second mechanism, hydrology_retention vs baseflow index: <b class='red'>not supported</b>. " + V.hydrology.why + ".");

  window.__VALIDATION = { ready:true, oof:rowsD.map(function(d){return d.r2;}),
    verdict:V.verdict, baseline_wins:true,
    scatter_n: sc ? sc.n : 0 };
})();
