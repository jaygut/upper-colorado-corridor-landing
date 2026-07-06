/* ============================================================================
   js/stage.js - the corridor stage + scroll controller
   Primary: deck.gl (WebGL data layers) composited over a MapLibre GL dark
   basemap via MapboxOverlay (non-interleaved), scrollama driving a pitched
   fly-to camera. The realism is authoritative open hydrography, not styling:
   USGS WBD HUC-8 basin frame + NHDPlus HR named stream network + reservoirs
   (window.__HYDRO), with the keystone/spillover graph (parcels, stations,
   parcel->beneficiary arcs) drawn on top. A crisp SVG overlay carries the
   parcels + 232 stations; a full d3/SVG fallback renders with no WebGL/basemap.
   Publishes window.__STAGE for headless verification.
   ========================================================================== */
(function () {
  "use strict";
  var D = window.APP_DATA || {};
  var G = (D.geo) || {};
  var H = (G.hydro) || {};
  var STAGE = window.__STAGE = {
    ready:false, mode:"init", scene:0, nScenes:0, errors:[], viewState:null, emphasis:null, time:0
  };
  var reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---- house colours -------------------------------------------------- */
  var css = getComputedStyle(document.documentElement);
  function tok(n, f){ var v=(css.getPropertyValue(n)||"").trim(); return v||f; }
  var C = {
    teal:  tok("--teal","#1AA89B"),  tealB: tok("--teal-bright","#2fd4c4"),
    green: tok("--green","#3AD6A3"), coral: tok("--coral","#E8694D"),
    amber: tok("--amber","#F2A24E"), muted: tok("--muted","#8fa3ad")
  };
  function rgb(hex){ hex=hex.replace("#",""); if(hex.length===3) hex=hex.replace(/./g,"$&$&");
    return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]; }
  var ZONECOL = {
    source_headwaters: C.tealB, connector_mainstem: C.teal,
    demand_valley_canyon: C.amber, appendix_transect: C.muted
  };
  function benefColor(k){
    return ({transmountain:C.tealB, mainstem:C.teal, municipal:C.green,
      grandvalley:C.amber, moab:C.coral, recreation:C.muted})[k] || C.teal;
  }

  /* ---- bind headline numbers ------------------------------------------ */
  function set(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
  function bindNumbers(){
    set("n-length", D.corridor.length_km);   set("n-catch", D.corridor.catchments);
    set("n-huc8", D.corridor.huc8);           set("n-parcels", D.corridor.parcels);
    set("n-benef", D.beneficiaries.count);    set("n-stations", D.validation.stations);
    set("n-fwd", D.graph.forward);            set("n-rev", D.graph.reverse);
    set("n-both", D.graph.both);
    set("n-topk", D.graph.top_parcel.pk_mean.toFixed(2));
    set("n-topid", D.graph.top_parcel.id);
    set("n-ci-pct", D.keystone_ratio.ci_clearing.pct.toFixed(1));
    set("n-ci-n", D.keystone_ratio.ci_clearing.n);
    set("n-cut-pct", D.keystone_ratio.score_cutoff.pct.toFixed(1));
    set("n-base-r2", "+" + D.validation.oof[0].r2.toFixed(3));
    set("n-verdict", D.validation.verdict.replace(/_/g," "));
    set("n-modeled", D.data_spine.evidence_mode.modeled_overlay);
    set("n-envelope", D.corridor.parcel_provenance.public_seed_envelope);
    set("n-verified", D.corridor.parcel_provenance.verified_boundary);
    set("n-rivers", (H.streams||[]).length);
  }

  function hydrateDOM(){
    var bg = document.getElementById("benef-grid");
    if (bg) D.beneficiaries.classes.forEach(function(c){
      var row = document.createElement("div"); row.className="benef-row";
      row.innerHTML = '<span class="k" style="background:'+benefColor(c.k)+'"></span>'+
        '<span><span class="cls">'+c.cls+'</span><br><span class="ent">'+c.entities+'</span></span>';
      bg.appendChild(row);
    });
    var sr = document.getElementById("spine-rail");
    if (sr) D.data_spine.sources.forEach(function(s){
      var chip=document.createElement("span"); chip.className="spine-chip";
      chip.innerHTML="<b>"+s.src+"</b>"; chip.title=s.gives+"  ("+s.role+")";
      sr.appendChild(chip);
    });
    var ml = document.getElementById("mech-list");
    if (ml){ var nm=D.model.mechanisms.length;
      D.model.mechanisms.forEach(function(m){
        // bar length encodes ORDER only (rank 1 longest), decoupled from the real weights
        var frac = 1 - (m.rank-1)/(nm-1) * 0.5;   // 1.0 .. 0.5, even steps
        var row=document.createElement("div"); row.className="mech";
        row.innerHTML='<span>'+m.key.replace(/_/g," ")+'</span>'+
          '<span class="bar"><i style="width:'+(frac*100)+'%"></i></span>';
        ml.appendChild(row);
      });
    }
    var lg=document.getElementById("map-legend");
    if(lg) lg.innerHTML =
      '<div class="lg"><span class="sw line" style="background:'+C.tealB+'"></span>NHDPlus HR stream (Colorado + tributaries)</div>'+
      '<div class="lg"><span class="sw" style="border:1px solid '+C.teal+';background:transparent"></span>HUC-8 watershed frame</div>'+
      '<div class="lg"><span class="sw" style="background:'+C.tealB+'"></span>verified-boundary parcel, size = p(K)</div>'+
      '<div class="lg"><span class="sw hollow"></span>seed-envelope parcel (candidate)</div>'+
      '<div class="lg"><span class="sw" style="background:'+C.coral+'"></span>WQP / NWIS monitoring station</div>';
  }

  /* ---- SCENES: camera + emphasis vector -------------------------------- */
  var SCENES = [
    { v:{ longitude:-108.05, latitude:39.05, zoom:6.9, pitch:46, bearing:-10 }, corridor:1, zones:.5, parcels:.5, arcs:.3, stations:0, focus:0 }, // 0 hook
    { v:{ longitude:-108.05, latitude:39.05, zoom:7.0, pitch:44, bearing:-6 },  corridor:.9, zones:.4, parcels:.3, arcs:.2, stations:0, focus:0 }, // 1 blind spot
    { v:{ longitude:-108.2,  latitude:39.05, zoom:7.15,pitch:52, bearing:-8 },  corridor:.75,zones:.35,parcels:.75,arcs:.95,stations:0, focus:.3 },// 2 why a graph
    { v:{ longitude:-107.55, latitude:39.32, zoom:7.7, pitch:56, bearing:-12 }, corridor:.6, zones:.5, parcels:1,  arcs:.35,stations:0, focus:.75 },// 3 keystone polygon
    { v:{ longitude:-107.9,  latitude:39.1,  zoom:7.0, pitch:54, bearing:-12 }, corridor:1, zones:1,  parcels:.6, arcs:.2, stations:0, focus:0 }, // 4 geography
    { v:{ longitude:-108.55,latitude:39.05,zoom:8.3, pitch:52, bearing:6 },   corridor:.75,zones:.5, parcels:.7, arcs:1,  stations:0, focus:.5 },
    { v:{ longitude:-108.0, latitude:39.0, zoom:6.7, pitch:44, bearing:0 },   corridor:1, zones:.4, parcels:.8, arcs:.3, stations:.3, focus:0 },
    { v:{ longitude:-106.9, latitude:39.42,zoom:7.8, pitch:58, bearing:-16 }, corridor:.7, zones:.5, parcels:1,  arcs:.2, stations:0, focus:.4 },
    { v:{ longitude:-106.44,latitude:39.51,zoom:9.2, pitch:60, bearing:-18 }, corridor:.6, zones:.4, parcels:1,  arcs:.25,stations:0, focus:1 },
    { v:{ longitude:-108.1, latitude:39.0, zoom:6.4, pitch:38, bearing:0 },   corridor:.85,zones:.3, parcels:.35,arcs:0,  stations:1, focus:0 },
    { v:{ longitude:-106.7, latitude:39.4, zoom:8.0, pitch:54, bearing:-14 }, corridor:.6, zones:.4, parcels:.9, arcs:.2, stations:.4, focus:.8 },
    { v:{ longitude:-108.0, latitude:39.0, zoom:6.5, pitch:34, bearing:0 },   corridor:.9, zones:.4, parcels:.5, arcs:.3, stations:.3, focus:0 }, // 11 ledger
    { v:{ longitude:-108.0, latitude:39.0, zoom:6.6, pitch:36, bearing:0 },   corridor:.85,zones:.3, parcels:.5, arcs:.35,stations:.25,focus:0 }, // 12 read by people and machines
    { v:{ longitude:-108.0, latitude:39.0, zoom:6.7, pitch:42, bearing:-6 },  corridor:.8, zones:.35,parcels:.85,arcs:.5, stations:.2, focus:.3 }, // 13 from diligence to distribution
    { v:{ longitude:-108.0, latitude:39.0, zoom:6.6, pitch:48, bearing:-8 },  corridor:1, zones:.5, parcels:.6, arcs:.5, stations:.2, focus:0 }  // 14 the ask
  ];
  STAGE.nScenes = SCENES.length;
  var target = SCENES[0];

  /* ==================================================================== *
   *  RENDERER A - MapLibre basemap + deck.gl MapboxOverlay               *
   * ==================================================================== */
  var map=null, overlay=null, WMV=null;
  var CARTO = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  var BLANK = { version:8, sources:{}, glyphs:"https://basemaps.cartocdn.com/gl/dark-matter-gl-style/{fontstack}/{range}.pbf",
    layers:[{ id:"bg", type:"background", paint:{ "background-color":"#08203a" } }] };

  function webglOk(){
    try{ var c=document.createElement("canvas");
      return !!(c.getContext("webgl2")||c.getContext("webgl")||c.getContext("experimental-webgl")); }
    catch(e){ return false; }
  }

  function buildDeckLayers(em){
    var d=window.deck, L=[];
    // basin frame (HUC-8 union)
    if (H.basin && H.basin.length) L.push(new d.PolygonLayer({ id:"basin", data:H.basin,
      getPolygon:function(o){return o;}, stroked:true, filled:true, extruded:false,
      getFillColor:function(){ var c=rgb(C.teal); return [c[0],c[1],c[2], 10*em.corridor]; },
      getLineColor:function(){ var c=rgb(C.teal); return [c[0],c[1],c[2], 90*em.corridor]; },
      getLineWidth:1.4, lineWidthUnits:"pixels", lineWidthMinPixels:1, pickable:false }));
    // zone strata (source / conveyance / demand)
    var polys=[]; Object.keys(G.zone_hull||{}).forEach(function(z){ polys.push({polygon:G.zone_hull[z], z:z}); });
    L.push(new d.PolygonLayer({ id:"zones", data:polys, getPolygon:function(o){return o.polygon;},
      getFillColor:function(o){ var c=rgb(ZONECOL[o.z]||C.teal); return [c[0],c[1],c[2], 20*em.zones]; },
      getLineColor:function(o){ var c=rgb(ZONECOL[o.z]||C.teal); return [c[0],c[1],c[2], 60*em.zones]; },
      getLineWidth:1, lineWidthUnits:"pixels", stroked:true, filled:true, pickable:false }));
    // reservoirs
    if (H.reservoirs && H.reservoirs.length) L.push(new d.PolygonLayer({ id:"reservoirs", data:H.reservoirs,
      getPolygon:function(o){return o.r;}, stroked:true, filled:true,
      getFillColor:function(){ var c=rgb(C.teal); return [c[0],c[1],c[2], 150*em.corridor]; },
      getLineColor:function(){ var c=rgb(C.tealB); return [c[0],c[1],c[2], 200*em.corridor]; },
      getLineWidth:1, lineWidthUnits:"pixels", pickable:false }));
    // streams: NHDPlus HR named network, styled by Strahler class
    var STY = { trunk:{col:C.tealB, w:3.0, a:255}, major:{col:C.teal, w:1.5, a:180}, minor:{col:C.teal, w:0.75, a:90} };
    L.push(new d.PathLayer({ id:"streams", data:H.streams||[], getPath:function(o){return o.p;},
      getColor:function(o){ var s=STY[o.c]||STY.minor, c=rgb(s.col); return [c[0],c[1],c[2], s.a*em.corridor]; },
      getWidth:function(o){ return (STY[o.c]||STY.minor).w; }, widthUnits:"pixels",
      widthMinPixels:0.45, widthMaxPixels:5.5, capRounded:true, jointRounded:true, pickable:false }));
    // parcel -> beneficiary spillover arcs (3-D bezier)
    L.push(new d.ArcLayer({ id:"arcs", data:G.arcs||[],
      getSourcePosition:function(o){return [o.sx,o.sy];}, getTargetPosition:function(o){return [o.tx,o.ty];},
      getSourceColor:function(o){ var c=rgb(ZONECOL[o.zone]||C.teal); return [c[0],c[1],c[2], 130*em.arcs]; },
      getTargetColor:function(o){ var c=rgb(benefColor(o.bk)); return [c[0],c[1],c[2], 26*em.arcs]; },
      getWidth:function(o){ return .4+o.w*1.6; }, widthMinPixels:.5, widthMaxPixels:3,
      getHeight:.5, greatCircle:false, pickable:false }));
    return L;
  }

  function initMap(){
    map = new maplibregl.Map({
      container:"stage", style:CARTO, center:[SCENES[0].v.longitude, SCENES[0].v.latitude],
      zoom:SCENES[0].v.zoom, pitch:SCENES[0].v.pitch, bearing:SCENES[0].v.bearing,
      interactive:false, attributionControl:false, maxPitch:75, dragRotate:false, fadeDuration:120
    });
    STAGE.mode="map";
    WMV = window.deck.WebMercatorViewport;
    var loaded=false;
    // watchdog: if the basemap style never loads (blocked), swap to a blank dark style
    var watch = setTimeout(function(){ if(!loaded){ try{ map.setStyle(BLANK); }catch(e){ fallbackToSvg("style timeout"); } } }, 4500);
    map.on("style.load", function(){ /* keep */ });
    map.on("load", function(){
      loaded=true; clearTimeout(watch);
      try{
        // DEM hillshade for real terrain relief (public Terrarium tiles), under the labels
        try{
          if(!map.getSource("dem")){
            map.addSource("dem",{ type:"raster-dem", encoding:"terrarium", tileSize:256, maxzoom:13,
              tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"] });
            var lyrs=map.getStyle().layers||[], firstSym=null;
            for(var li=0;li<lyrs.length;li++){ if(lyrs[li].type==="symbol"){ firstSym=lyrs[li].id; break; } }
            map.addLayer({ id:"hillshade", type:"hillshade", source:"dem",
              paint:{ "hillshade-exaggeration":0.5, "hillshade-shadow-color":"#04101c",
                "hillshade-highlight-color":"#1b4a63", "hillshade-accent-color":"#0b2a44" } }, firstSym);
          }
        }catch(he){ STAGE.errors.push("hillshade: "+(he&&he.message||he)); }
        overlay = new window.deck.MapboxOverlay({ interleaved:false, layers: buildDeckLayers(target) });
        map.addControl(overlay);
        buildOverlay(); applyEmphasisOverlay(target); projectOverlay();
        STAGE.ready = true;
        // guard against init-sizing races (container measured before layout settles):
        // force the canvas to the true viewport a few times, and on any container resize.
        function sync(){ try{ map.resize(); projectOverlay(); }catch(_){ } }
        sync(); requestAnimationFrame(sync); setTimeout(sync, 250); setTimeout(sync, 900);
        if (window.ResizeObserver){ try{ new ResizeObserver(sync).observe(document.getElementById("stage")); }catch(_){ } }
      }catch(e){ fallbackToSvg("overlay init: "+(e&&e.message||e)); }
    });
    map.on("render", projectOverlay);
    map.on("error", function(e){ /* tile errors are non-fatal; navy bg shows */
      if(e && e.error && String(e.error).indexOf("style")>=0 && !loaded){ try{ map.setStyle(BLANK); }catch(_){}} });
  }
  function goMap(i){
    target = SCENES[i]; STAGE.scene = i; STAGE.viewState = target.v;
    var v = target.v;
    if (reduce) map.jumpTo({ center:[v.longitude,v.latitude], zoom:v.zoom, pitch:v.pitch, bearing:v.bearing });
    else map.flyTo({ center:[v.longitude,v.latitude], zoom:v.zoom, pitch:v.pitch, bearing:v.bearing,
      duration:2300, curve:1.4, essential:true });
    applyEmphasisMap(target);
  }
  function applyEmphasisMap(em){ STAGE.emphasis=em;
    if(overlay) overlay.setProps({ layers: buildDeckLayers(em) });
    applyEmphasisOverlay(em); }

  /* ---- crisp SVG overlay for parcels + stations, synced to map camera -- */
  var fx, fxG={}, fxParcels=[], fxStations=[], fxFocus=null;
  function svgEl(tag,attrs){ var e=document.createElementNS("http://www.w3.org/2000/svg",tag);
    for(var k in attrs) e.setAttribute(k,attrs[k]); return e; }
  function buildOverlay(){
    var host=document.getElementById("stage");
    fx=svgEl("svg",{id:"stage-fx", width:"100%", height:"100%",
      style:"position:absolute;inset:0;pointer-events:none;z-index:5"});
    host.appendChild(fx);
    ["st","pc","fo"].forEach(function(k){ fxG[k]=svgEl("g",{}); fx.appendChild(fxG[k]); });
    var top=D.graph.top_parcel.id;
    (G.stations||[]).forEach(function(o){
      var c=svgEl("circle",{r:2.1, fill:C.coral, "fill-opacity":.85});
      c.__ll=[o.x,o.y]; fxG.st.appendChild(c); fxStations.push(c);
    });
    (G.parcels||[]).forEach(function(o){
      var isTop=o.id===top, rad=2.6+Math.max(0,(o.pk-0.45))*24;
      var col=isTop?C.green:(ZONECOL[o.zone]||C.teal);
      var c=svgEl("circle",{r:rad, fill:o.verified?col:"none",
        "fill-opacity":o.verified?.6:0, stroke:col, "stroke-opacity":.95,
        "stroke-width":isTop?2:1.2});
      c.__ll=[o.x,o.y]; fxG.pc.appendChild(c); fxParcels.push(c);
      if(isTop){ fxFocus=svgEl("circle",{r:rad+10, fill:"none", stroke:C.green,
        "stroke-opacity":.85, "stroke-width":1.8}); fxFocus.__ll=[o.x,o.y]; fxG.fo.appendChild(fxFocus); }
    });
  }
  function projectOverlay(){
    if(!fx || !map) return;
    var W=window.innerWidth, H2=window.innerHeight;
    function place(c){ var p=map.project({lng:c.__ll[0], lat:c.__ll[1]});
      if(p && p.x>-70 && p.x<W+70 && p.y>-70 && p.y<H2+70){
        c.setAttribute("cx",p.x.toFixed(1)); c.setAttribute("cy",p.y.toFixed(1)); c.style.display=""; }
      else c.style.display="none";
    }
    for(var i=0;i<fxStations.length;i++) place(fxStations[i]);
    for(var j=0;j<fxParcels.length;j++) place(fxParcels[j]);
    if(fxFocus) place(fxFocus);
  }
  function applyEmphasisOverlay(em){
    if(!fxG.pc) return;
    fxG.st.setAttribute("opacity", em.stations);
    fxG.pc.setAttribute("opacity", Math.max(.35,em.parcels));
    fxG.fo.setAttribute("opacity", em.focus);
  }

  /* ==================================================================== *
   *  RENDERER B - d3 / SVG fallback (single-transform pan + zoom)        *
   * ==================================================================== */
  var svg, world, groups={}, sBase=1, WW=0, WH=0, Z0=6.3, refX=0, refY=0;
  var ease = (window.d3 && d3.easeCubicInOut) || function(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; };
  var cur = Object.assign({}, SCENES[0].v), from=null, t0=0, DUR=2200;
  function nowT(){ return (window.performance&&performance.now)?performance.now():+new Date(); }
  function lerp(a,b,e){ return a+(b-a)*e; }
  function mercY(lat){ return Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360)); }
  function projW(lon,lat){ return [ (lon-refX)*sBase, (refY-mercY(lat))*sBase ]; }
  function fit(){
    WW=window.innerWidth; WH=window.innerHeight;
    var bb=G.bbox||[-109.75,38.2,-106.05,39.95];
    refX=bb[0]; refY=mercY(bb[3]); sBase=(0.92*WW)/(bb[2]-bb[0]);
    if(svg) svg.setAttribute("viewBox","0 0 "+WW+" "+WH);
  }
  function el(tag,attrs){ var e=document.createElementNS("http://www.w3.org/2000/svg",tag);
    for(var k in attrs) e.setAttribute(k,attrs[k]); return e; }
  function initSvg(){
    var host=document.getElementById("stage");
    svg=el("svg",{preserveAspectRatio:"xMidYMid slice"}); host.appendChild(svg);
    fit(); world=el("g",{}); svg.appendChild(world);
    ["ba","zn","fl","ar","st","pc","fo"].forEach(function(k){ groups[k]=el("g",{id:"g-"+k}); world.appendChild(groups[k]); });
    // basin frame
    (H.basin||[]).forEach(function(ring){
      var pts=ring.map(function(c){return projW(c[0],c[1]).join(",");}).join(" ");
      groups.ba.appendChild(el("polygon",{points:pts, fill:C.teal, "fill-opacity":.03, stroke:C.teal,
        "stroke-opacity":.32, "stroke-width":1, "vector-effect":"non-scaling-stroke"}));
    });
    // zone hulls
    Object.keys(G.zone_hull||{}).forEach(function(z){
      var pts=(G.zone_hull[z]||[]).map(function(c){return projW(c[0],c[1]).join(",");}).join(" ");
      groups.zn.appendChild(el("polygon",{points:pts, fill:ZONECOL[z]||C.teal, "fill-opacity":.05}));
    });
    // real streams (by class)
    var SW={trunk:[C.tealB,.9,1.8], major:[C.teal,.5,.8], minor:[C.teal,.28,.5]};
    (H.streams||[]).forEach(function(o){
      var s=SW[o.c]||SW.minor;
      var dpath="M"+o.p.map(function(c){return projW(c[0],c[1]).join(",");}).join("L");
      groups.fl.appendChild(el("path",{d:dpath, fill:"none", stroke:s[0], "stroke-opacity":s[1],
        "stroke-width":s[2], "stroke-linecap":"round","stroke-linejoin":"round","vector-effect":"non-scaling-stroke"}));
    });
    // arcs
    (G.arcs||[]).forEach(function(o){
      var s=projW(o.sx,o.sy), t=projW(o.tx,o.ty);
      var mx=(s[0]+t[0])/2, my=(s[1]+t[1])/2 - Math.hypot(t[0]-s[0],t[1]-s[1])*.16;
      groups.ar.appendChild(el("path",{d:"M"+s[0]+","+s[1]+"Q"+mx+","+my+" "+t[0]+","+t[1],
        fill:"none", stroke:ZONECOL[o.zone]||C.teal, "stroke-opacity":.28,
        "stroke-width":(.4+o.w*1.3), "vector-effect":"non-scaling-stroke"}));
    });
    // stations
    (G.stations||[]).forEach(function(o){ var p=projW(o.x,o.y);
      groups.st.appendChild(el("circle",{cx:p[0],cy:p[1],r:2.1,fill:C.coral,"fill-opacity":.85})); });
    // parcels
    var top=D.graph.top_parcel.id;
    (G.parcels||[]).forEach(function(o){ var p=projW(o.x,o.y);
      var rad=2.4+Math.max(0,(o.pk-0.45))*22, isTop=o.id===top;
      groups.pc.appendChild(el("circle",{cx:p[0],cy:p[1],r:rad,
        fill:o.verified?(ZONECOL[o.zone]||C.teal):"none", "fill-opacity":o.verified?.55:0,
        stroke:isTop?C.green:(ZONECOL[o.zone]||C.teal), "stroke-opacity":.9,
        "stroke-width":isTop?2:1, "vector-effect":"non-scaling-stroke"}));
      if(isTop) groups.fo.appendChild(el("circle",{cx:p[0],cy:p[1],r:rad+9,fill:"none",
        stroke:C.green,"stroke-opacity":.7,"stroke-width":1.6,"vector-effect":"non-scaling-stroke"}));
    });
    STAGE.mode="svg"; STAGE.ready=true;
    var fn=document.getElementById("fallback-note"); if(fn) fn.style.display="block";
    requestAnimationFrame(frameSvg);
  }
  function goSvg(i){ STAGE.scene=i; from=Object.assign({},cur); target=SCENES[i]; t0=nowT();
    if(reduce){ cur=Object.assign({},target.v); from=null; }
    applyEmphasisSvg(target); }
  function frameSvg(){
    if(from){ var k=Math.min(1,(nowT()-t0)/DUR), e=ease(k);
      cur={ longitude:lerp(from.longitude,target.v.longitude,e), latitude:lerp(from.latitude,target.v.latitude,e),
        zoom:lerp(from.zoom,target.v.zoom,e), pitch:lerp(from.pitch,target.v.pitch,e), bearing:lerp(from.bearing,target.v.bearing,e) };
      if(k>=1) from=null; }
    STAGE.viewState=cur;
    var ratio=Math.pow(2, cur.zoom - Z0), wc=projW(cur.longitude, cur.latitude);
    if(world) world.setAttribute("transform","translate("+(WW/2)+","+(WH/2)+") scale("+ratio+") translate("+(-wc[0])+","+(-wc[1])+")");
    requestAnimationFrame(frameSvg);
  }
  function applyEmphasisSvg(em){ STAGE.emphasis=em;
    if(!groups.fl) return;
    groups.ba.setAttribute("opacity", em.corridor);
    groups.fl.setAttribute("opacity", em.corridor);
    groups.zn.setAttribute("opacity", em.zones);
    groups.pc.setAttribute("opacity", Math.max(.25,em.parcels));
    groups.ar.setAttribute("opacity", em.arcs);
    groups.st.setAttribute("opacity", em.stations);
    groups.fo.setAttribute("opacity", em.focus);
  }
  function fallbackToSvg(reason){
    STAGE.errors.push("map->svg: "+reason);
    try{ if(map){ map.remove(); } }catch(e){}
    var host=document.getElementById("stage"); if(host) host.innerHTML="";
    fx=null; fxG={}; fxParcels=[]; fxStations=[]; fxFocus=null;
    initSvg(); goSvg(STAGE.scene||0);
  }

  /* ---- scene HUD wiring ------------------------------------------------ */
  function sceneUI(i){
    document.querySelectorAll(".step").forEach(function(s){ s.classList.remove("active"); });
    var step=document.querySelector('.step[data-scene="'+i+'"]'); if(step) step.classList.add("active");
    var lg=document.getElementById("map-legend"); if(lg) lg.classList.toggle("show", i>=2 && i<=10);
    var zh=document.getElementById("zone-hud"); if(zh){ zh.classList.toggle("show", i===4);
      zh.querySelectorAll(".z").forEach(function(z){ z.classList.toggle("on", i===4); }); }
  }
  function go(i){ if(STAGE.mode==="map") goMap(i); else goSvg(i); sceneUI(i); }

  /* ---- boot ------------------------------------------------------------ */
  function boot(){
    bindNumbers(); hydrateDOM();
    if(D._geo_missing){ STAGE.errors.push("geometry bundle (__GEO) missing"); }
    var forceSvg = /[?&]svg\b/.test(location.search);
    var useMap = !forceSvg && !!(window.maplibregl && window.deck && window.deck.MapboxOverlay)
      && webglOk() && !D._geo_missing;
    try {
      if(useMap) initMap(); else initSvg();
    } catch(e){ STAGE.errors.push("stage init: "+(e&&e.message||e));
      try{ if(STAGE.mode!=="svg") initSvg(); }catch(e2){ STAGE.errors.push("svg init: "+e2); } }

    // Card REVEAL is decoupled from the camera. A dedicated observer marks any
    // step scrolled into view (.in-view), so a scene is always readable even when
    // scrollama never fires its onStepEnter for it: stale trigger offsets on a slow
    // cold load, the last-step edge case, or momentum scroll. scrollama below still
    // drives the camera and HUD; this only governs opacity.
    if(window.IntersectionObserver){
      var revealObs=new IntersectionObserver(function(es){ es.forEach(function(en){
        en.target.classList.toggle("in-view", en.isIntersecting && en.intersectionRatio>=0.4); }); },
        { threshold:[0,0.25,0.4,0.55,0.75,1] });
      document.querySelectorAll(".step").forEach(function(s){ revealObs.observe(s); });
    }

    if(window.scrollama){
      var sc=scrollama();
      sc.setup({ step:".step", offset:0.6 }).onStepEnter(function(r){ go(r.index); });
      addEventListener("resize", function(){ sc.resize();
        if(STAGE.mode==="map" && map){ map.resize(); projectOverlay(); }
        else if(STAGE.mode==="svg"){ fit(); } });
      // recalc trigger offsets once late-loading content (fonts, map tiles, the
      // tall credentials block) has reflowed, so the camera keeps step with reveal.
      addEventListener("load", function(){ try{ sc.resize(); }catch(_){} });
      setTimeout(function(){ try{ sc.resize(); }catch(_){} }, 1400);
    } else {
      // no scrollama: reveal observer above handles opacity; this drives the camera
      var obs=new IntersectionObserver(function(es){ es.forEach(function(en){
        if(en.isIntersecting){ go(+en.target.getAttribute("data-scene")); } }); }, {threshold:.55});
      document.querySelectorAll(".step").forEach(function(s){ obs.observe(s); });
    }
    addEventListener("scroll", function(){ var h=document.documentElement;
      var i=document.querySelector("#prog i");
      if(i) i.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+"%";
      // bottom-of-page safety net: unambiguously guarantee the final scene's camera
      // and active state even if scrollama's last trigger sits past reachable scroll.
      if(h.scrollTop + h.clientHeight >= h.scrollHeight - 2){
        var last=STAGE.nScenes-1; if(last>=0 && STAGE.scene!==last){ go(last); } }
    }, {passive:true});
    sceneUI(0);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
