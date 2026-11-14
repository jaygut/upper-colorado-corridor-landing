/* Graph of Life brand v1.0.0. Keystone 3D stage: real terrain, imagery lit only inside evidence support, every layer driven by scroll.
   Loaded after the flat canvas stage, which stays as the complete fallback. */
(function(){'use strict';
const KS=window.KS,S=KS.S,C=KS.C,A=KS.A,host=document.getElementById('imagery'),labels=document.getElementById('stage-labels');
const IMAGERY='https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const WORLD=[[-125,30],[-90,30],[-90,48],[-125,48],[-125,30]];
let map=null,ready=false,last={},lastReveal=-99,parcel=null,hull=null,markers={},timer=0,basinHoles=[];
const fc=f=>({type:'FeatureCollection',features:f}),feat=(g,p)=>({type:'Feature',properties:p||{},geometry:g}),poly=r=>({type:'Polygon',coordinates:r});

/* Buffer of a convex parcel by r metres: offset edges joined by arcs, in a local metre frame. */
function local(ring){const lat0=KS.EAGLE[1],lon0=KS.EAGLE[0],kx=111320*Math.cos(lat0*Math.PI/180),ky=110950;return{to:p=>[(p[0]-lon0)*kx,(p[1]-lat0)*ky],from:q=>[lon0+q[0]/kx,lat0+q[1]/ky]};}
function buffer(ring,r){const L=local(ring);let pts=ring.slice(0,-1).map(L.to);let area=0;pts.forEach((p,i)=>{const n=pts[(i+1)%pts.length];area+=p[0]*n[1]-n[0]*p[1];});if(area<0)pts=pts.reverse();
  if(r<=.5)return[...pts,pts[0]].map(L.from);const out=[],n=pts.length;
  for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n];
    const e1=[b[0]-a[0],b[1]-a[1]],e2=[c[0]-b[0],c[1]-b[1]],o1=Math.atan2(-e1[0],e1[1]),o2=Math.atan2(-e2[0],e2[1]);let s=o1,e=o2;while(e<s)e+=2*Math.PI;const steps=Math.max(2,Math.ceil((e-s)/(Math.PI/18)));
    for(let k=0;k<=steps;k++){const t=s+(e-s)*k/steps;out.push([b[0]+r*Math.cos(t),b[1]+r*Math.sin(t)]);}}
  out.push(out[0]);return out.map(L.from);}
function maskData(r){const holes=[buffer(parcel,r)];return fc([feat(poly([WORLD,...holes,...basinHoles]))]);}

function marker(id,lngLat,html,cls){const el=document.createElement('div');el.className='geo-label '+(cls||'');el.innerHTML=html;el.hidden=true;el.style.position='absolute';el.style.left='0';el.style.top='0';labels.append(el);markers[id]={el,ll:lngLat,o:0};}
function show(id,v){const m=markers[id];if(m){const o=v>.5?1:0;if(m.o!==o){m.o=o;m.el.hidden=!o;if(o)place();}}}
function place(){if(!map||!ready)return;for(const k in markers){const m=markers[k];if(!m.o)continue;const q=map.project(m.ll);m.el.style.transform='translate('+Math.round(q.x+8)+'px,'+Math.round(q.y-8)+'px) translateY(-100%)';}}

function set(layer,prop,v){const k=layer+prop;if(last[k]!==undefined&&Math.abs(last[k]-v)<.004)return;last[k]=v;if(map.getLayer(layer))map.setPaintProperty(layer,prop,v);}
function apply(){if(!map||!ready||!S.view)return;const v=S.view,L=S.L;
  map.jumpTo({center:v.center,zoom:v.zoom,pitch:v.pitch,bearing:v.bearing,padding:v.padding});
  const rq=Math.round(L.reveal/20)*20;if(rq!==lastReveal){lastReveal=rq;map.getSource('mask').setData(maskData(rq));}
  set('basin-veil','fill-opacity',1-L.revealBasins);set('veil','fill-opacity',L.dim*(1-A.node));
  const fade=L.dim>0?1-L.dim*(1-A.node):1;
  set('rivers','line-opacity',L.rivers*fade);set('padus','fill-opacity',L.padus*A.node);set('nwi','fill-opacity',L.nwi*A.div);set('nwi-line','line-opacity',L.nwi);
  set('cells','fill-opacity',S.lens==='canopy'?L.cells:0);set('landcover','fill-opacity',S.lens==='landcover'?L.cells:0);set('cells-line','line-opacity',S.lens==='imagery'?0:L.cells);
  const wm=S.webMode||'water',ww=L.web||0,wf=wm==='flight'?A.node:1,fl=Math.max(L.forage,ww*(wm==='water'?0:1));
  set('web4','line-opacity',ww*wf);set('web5','line-opacity',ww*wf);set('web6','line-opacity',ww*(wm==='flight'?A.node:A.div));set('web7','line-opacity',ww*(wm==='flight'?A.edge:A.div));set('webnodes','circle-opacity',ww*(wm==='water'?A.div:1));
  if(last.wm!==wm&&map.getLayer('webnodes')){last.wm=wm;map.setPaintProperty('webnodes','circle-color',wm==='water'?['match',['get','c'],4,C.coral,5,C.green,6,C.teal,C.sand]:['case',['<=',['get','d'],600],C.green,['<=',['get','d'],1500],C.teal,C.muted]);map.setPaintProperty('webnodes','circle-radius',wm==='water'?['match',['get','c'],4,3.2,1.5]:['case',['<=',['get','d'],600],2.8,['<=',['get','d'],1500],2,1.2]);}
  show('f600',ww>.6&&wm!=='water'?1:0);show('f1500',ww>.6&&wm!=='water'?1:0);
  set('forage','line-opacity',fl);set('forageuser','line-opacity',L.forage);show('forageLabel',L.forage>.6?1:0);
  set('ring500','line-opacity',L.ring500);set('ring1k','line-opacity',L.ring1k);
  set('basins','line-opacity',L.basins*fade);set('networks','line-opacity',L.basins*fade);set('fire','fill-opacity',S.fire?L.fire*A.node:0);set('fire-line','line-opacity',S.fire?L.fire:0);
  set('stations','circle-opacity',Math.min(1,L.stations)*fade);set('stations','circle-stroke-opacity',Math.min(1,L.stations)*fade);set('transit','line-opacity',L.transit*A.div);
  const k=S.pinCell>=0?S.pinCell:S.hoverCell;if(last.hi!==k){last.hi=k;if(map.getLayer('cell-hi'))map.setFilter('cell-hi',['==',['get','i'],k]);}
  set('flow','line-opacity',L.flow);set('flowuser','line-opacity',L.flow);set('sampling','circle-opacity',L.sampling*A.div);set('sampling','circle-stroke-opacity',L.sampling);set('transect','line-opacity',S.sampling.poll?L.sampling:0);
  place();
  show('parcel',Math.max(L.parcelLabel*(L.rivers>.5||L.transit>.5?1:0),0));show('r500',L.ring500>.6?1:0);show('r1k',L.ring1k>.6&&L.rivers<.5?1:0);show('eagleRiver',L.rivers>.8&&L.transit<.2?1:0);
  show('north',L.stations>.5&&L.transit<.5&&L.dim<.5?1:0);show('east',L.stations>.5&&L.transit<.5&&L.dim<.5?1:0);show('grand',L.transit>.5?1:0);show('glenwood',L.transit>.5?1:0);show('nolink',L.transit>.5?1:0);show('nwiLabel',L.nwi>.8?1:0);show('frame',L.frame>.6?1:0);}

function addData(key){if(!map||!ready)return;const d=S.data[key];if(!d)return;const src=(id,data)=>{if(map.getSource(id))map.getSource(id).setData(data);};
  if(key==='eagle'){src('cells',fc(d.cells.map((c,i)=>feat(poly([c.r]),{v:c.v,i}))));src('landcover',fc(d.landcover.map(c=>feat(poly([c.r]),{code:c.code}))));src('nwi',fc(d.inventory.nwi.rings.map(r=>feat(poly([r])))));src('padus',fc(d.inventory.padus.rings.map(r=>feat(poly([r])))));
    const stops=[];for(let t=0;t<=1.001;t+=.25)stops.push(d.vmin+(d.vmax-d.vmin)*t,KS.ramp(t));map.setPaintProperty('cells','fill-color',['interpolate',['linear'],['get','v'],...stops]);
    const c=d.inventory.nwi.rings[0],mid=c[Math.floor(c.length/2)];if(!markers.nwiLabel)marker('nwiLabel',mid,'mapped wetland','teal');}
  if(key==='rivers'){src('rivers',fc(d.streams.map(s=>feat({type:'LineString',coordinates:s.p},{o:s.o,n:s.n}))));const er=d.streams.filter(s=>s.n==='Eagle River').flatMap(s=>s.p).filter(p=>p[0]<-106.42&&p[0]>-106.6);if(er.length&&!markers.eagleRiver)marker('eagleRiver',er[Math.floor(er.length/2)],'Eagle River','teal');}
  if(key==='basins'){src('basins',d);basinHoles=d.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates[0]]:f.geometry.coordinates.map(p=>p[0]));lastReveal=-99;}
  if(key==='burn')src('fire',d);
  if(key==='networks')src('networks',fc(d.flatMap(n=>n.features)));
  last={};apply();}

function start(){if(map||!window.maplibregl||!S.imageryWanted)return;const ring=S.parcelRing;if(!ring)return;parcel=ring;
  let m;try{m=new maplibregl.Map({container:host,interactive:false,attributionControl:false,fadeDuration:0,maxPitch:70,pixelRatio:Math.min(window.devicePixelRatio||1,S.W<760?1.5:2),center:KS.EAGLE,zoom:15,style:{version:8,
    sources:{imagery:{type:'raster',tiles:[IMAGERY],tileSize:256,maxzoom:16},dem:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:13,encoding:'terrarium'},shade:{type:'raster-dem',tiles:[DEM],tileSize:256,maxzoom:13,encoding:'terrarium'},
      mask:{type:'geojson',data:maskData(0)},world:{type:'geojson',data:fc([feat(poly([WORLD]))])},parcel:{type:'geojson',data:fc([feat(poly([ring]))])},
      r500:{type:'geojson',data:fc([feat({type:'LineString',coordinates:buffer(ring,500)})])},r1k:{type:'geojson',data:fc([feat({type:'LineString',coordinates:buffer(ring,1000)})])},
      cells:{type:'geojson',data:fc([])},landcover:{type:'geojson',data:fc([])},nwi:{type:'geojson',data:fc([])},padus:{type:'geojson',data:fc([])},rivers:{type:'geojson',data:fc([])},basins:{type:'geojson',data:fc([])},networks:{type:'geojson',data:fc([])},fire:{type:'geojson',data:fc([])},
      forage:{type:'geojson',data:fc([])},forageuser:{type:'geojson',data:fc([])},
      web:{type:'geojson',data:fc([])},webnodes:{type:'geojson',data:fc([])},flow:{type:'geojson',data:fc([])},flowuser:{type:'geojson',data:fc([])},flowdots:{type:'geojson',data:fc([])},sampling:{type:'geojson',data:fc([])},transect:{type:'geojson',data:fc([])},
      stations:{type:'geojson',data:fc(KS.STATIONS.map(s=>feat({type:'Point',coordinates:s.p},{id:s.id})))},transit:{type:'geojson',data:fc(KS.STATIONS.filter(s=>s.id!=='09013500').map(s=>feat({type:'LineString',coordinates:[KS.EAGLE,s.p]})))}},
    layers:[{id:'ground',type:'background',paint:{'background-color':C.abyss}},{id:'imagery',type:'raster',source:'imagery',paint:{'raster-fade-duration':0,'raster-saturation':-.15}},
      {id:'mask',type:'fill',source:'mask',paint:{'fill-color':C.abyss,'fill-antialias':false}},{id:'basin-veil',type:'fill',source:'basins',paint:{'fill-color':C.abyss,'fill-opacity':1}},{id:'veil',type:'fill',source:'world',paint:{'fill-color':C.abyss,'fill-opacity':0}},
      {id:'shade',type:'hillshade',source:'shade',paint:{'hillshade-shadow-color':C.abyss,'hillshade-highlight-color':C.teal,'hillshade-accent-color':C.navy,'hillshade-exaggeration':['interpolate',['linear'],['zoom'],7,.1,10,.2,12,.27],'hillshade-illumination-direction':315}},
      {id:'padus',type:'fill',source:'padus',paint:{'fill-color':C.sand,'fill-opacity':0}},{id:'rivers',type:'line',source:'rivers',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.teal,'line-width':['interpolate',['linear'],['zoom'],7,['case',['>=',['get','o'],6],1.4,.6],12,['case',['>=',['get','o'],6],2.6,1.4]],'line-opacity':0}},
      {id:'networks',type:'line',source:'networks',paint:{'line-color':C.teal,'line-width':1.4,'line-opacity':0}},{id:'fire',type:'fill',source:'fire',paint:{'fill-color':C.coral,'fill-opacity':0}},{id:'fire-line',type:'line',source:'fire',paint:{'line-color':C.coral,'line-width':1.6,'line-opacity':0}},
      {id:'basins',type:'line',source:'basins',paint:{'line-color':C.sand,'line-width':1.6,'line-dasharray':[3,2],'line-opacity':0}},
      {id:'nwi',type:'fill',source:'nwi',paint:{'fill-color':C.teal,'fill-opacity':0}},{id:'nwi-line',type:'line',source:'nwi',paint:{'line-color':C.green,'line-width':1.6,'line-opacity':0}},
      {id:'landcover',type:'fill',source:'landcover',paint:{'fill-color':['match',['get','code'],42,KS.ramp(.5),41,KS.ramp(1),C.sand],'fill-opacity':0}},{id:'cells',type:'fill',source:'cells',paint:{'fill-color':C.teal,'fill-opacity':0}},{id:'cells-line',type:'line',source:'cells',paint:{'line-color':C.abyss,'line-width':1,'line-opacity':0}},{id:'cell-hi',type:'line',source:'cells',filter:['==',['get','i'],-1],paint:{'line-color':C.paper,'line-width':2.5}},
      {id:'ring500',type:'line',source:'r500',paint:{'line-color':C.sand,'line-width':1.4,'line-dasharray':[4,3],'line-opacity':0}},{id:'ring1k',type:'line',source:'r1k',paint:{'line-color':C.sand,'line-width':1.4,'line-dasharray':[4,3],'line-opacity':0}},
      {id:'transit',type:'line',source:'transit',paint:{'line-color':C.sand,'line-width':1,'line-dasharray':[1,4],'line-opacity':0}},
      {id:'forage',type:'line',source:'forage',paint:{'line-color':C.sand,'line-width':1.2,'line-dasharray':[2,3],'line-opacity':0}},{id:'forageuser',type:'line',source:'forageuser',paint:{'line-color':C.green,'line-width':2.5,'line-opacity':0}},
      {id:'web7',type:'line',source:'web',filter:['==',['get','c'],7],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.sand,'line-width':['match',['get','b'],1,.8,2,1.3,3,2,2.8],'line-opacity':0}},{id:'web6',type:'line',source:'web',filter:['==',['get','c'],6],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.teal,'line-width':['match',['get','b'],1,.8,2,1.3,3,2,2.8],'line-opacity':0}},{id:'web5',type:'line',source:'web',filter:['==',['get','c'],5],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.green,'line-width':['match',['get','b'],1,.9,2,1.5,3,2.3,3.2],'line-opacity':0}},{id:'web4',type:'line',source:'web',filter:['==',['get','c'],4],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.coral,'line-width':2.4,'line-opacity':0}},{id:'webnodes',type:'circle',source:'webnodes',paint:{'circle-radius':1.6,'circle-color':C.teal,'circle-stroke-color':C.abyss,'circle-stroke-width':0,'circle-opacity':0,'circle-stroke-opacity':0}},{id:'flow',type:'line',source:'flow',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.green,'line-width':['interpolate',['linear'],['zoom'],9,2.5,13,4],'line-opacity':0}},{id:'flowuser',type:'line',source:'flowuser',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':C.paper,'line-width':2,'line-opacity':0}},{id:'flowdots',type:'circle',source:'flowdots',paint:{'circle-radius':3.5,'circle-color':C.paper,'circle-opacity':0}},
      {id:'transect',type:'line',source:'transect',paint:{'line-color':C.paper,'line-width':1.5,'line-dasharray':[2,2],'line-opacity':0}},{id:'sampling',type:'circle',source:'sampling',paint:{'circle-radius':['match',['get','kind'],'soil',5,8],'circle-color':C.abyss,'circle-stroke-width':2,'circle-stroke-color':['match',['get','kind'],'birds',C.teal,'soil',C.sand,C.paper],'circle-opacity':0,'circle-stroke-opacity':0}},
      {id:'parcel',type:'line',source:'parcel',layout:{'line-join':'miter'},paint:{'line-color':C.coral,'line-width':['interpolate',['linear'],['zoom'],8,5,12,3,15,2.5]}},
      {id:'stations',type:'circle',source:'stations',paint:{'circle-radius':5.5,'circle-color':C.green,'circle-stroke-color':C.abyss,'circle-stroke-width':2,'circle-opacity':0,'circle-stroke-opacity':0}}]}});}catch(e){KS.setImagery('off','WebGL unavailable');return;}
  map=m;let errors=0;
  m.on('load',()=>{try{m.setTerrain({source:'dem',exaggeration:S.W<760?1.15:1.35});}catch(e){}try{if(m.setSky)m.setSky({'sky-color':C.abyss,'horizon-color':C.navy,'fog-color':C.abyss,'fog-ground-blend':.6,'horizon-fog-blend':.6,'sky-horizon-blend':.8,'atmosphere-blend':0});}catch(e){}
    ready=true;const north=KS.STATIONS[0],east=KS.STATIONS[1],glen=KS.STATIONS[2];
    marker('parcel',KS.EAGLE,'Eagle candidate');marker('r500',buffer(ring,500)[0],'500 m context','sand');marker('r1k',buffer(ring,1000)[0],'1 km neighbourhood','sand');
    marker('north',north.p,'North Inlet','teal');marker('east',east.p,'East Inlet','teal');marker('grand',north.p,`North and East Inlet<small>${Math.round(KS.km(KS.EAGLE,north.p))} km in a straight line</small>`,'teal');marker('glenwood',glen.p,`Glenwood<small>${Math.round(KS.km(KS.EAGLE,glen.p))} km in a straight line</small>`,'teal');
    marker('nolink',[(KS.EAGLE[0]+north.p[0])/2,(KS.EAGLE[1]+north.p[1])/2],'no delivery link','sand');marker('frame',buffer(ring,1000)[Math.floor(buffer(ring,1000).length/2)],'no measurement in the reviewed record','sand');
    const b6=buffer(ring,600),b15=buffer(ring,1500);marker('f600',b6[Math.floor(b6.length*.56)],'0.6 km<small>pooled visits halve</small>','sand');marker('f1500',b15[Math.floor(b15.length*.8)],'1.5 km<small>pooled richness halves</small>','sand');
    ['eagle','rivers','basins','burn','networks'].forEach(addData);setFlow();setWeb();setSampling();setForage();apply();});
  m.on('idle',()=>{place();if(map===m&&ready&&S.imagery!=='off'&&m.areTilesLoaded()){clearTimeout(timer);if(S.imagery!=='ready')KS.setImagery('ready');}});
  m.on('error',()=>{errors++;if(errors>=8&&S.imagery!=='ready')stop('Imagery or terrain service unavailable');});
  m.getCanvas().addEventListener('webglcontextlost',e=>{e.preventDefault();stop('WebGL context lost');});
  timer=setTimeout(()=>{if(S.imagery==='pending')stop('Imagery timed out');},16000);}
function stop(why){clearTimeout(timer);const old=map;map=null;ready=false;last={};lastReveal=-99;for(const k in markers){markers[k].el.remove();}markers={};if(old){try{old.remove();}catch(e){}}KS.setImagery('off',why);}
function cellAt(x,y){if(!map||!ready||S.L.cells<.6||S.lens!=='canopy')return-1;try{const f=map.queryRenderedFeatures([x,y],{layers:['cells']});return f.length?f[0].properties.i:-1;}catch(e){return-1;}}
function setForage(){if(!map||!ready||!parcel)return;map.getSource('forage').setData(fc([600,1500].map(r=>feat({type:'LineString',coordinates:buffer(parcel,r)}))));const ring=buffer(parcel,S.forageM);map.getSource('forageuser').setData(fc([feat({type:'LineString',coordinates:ring})]));if(markers.forageLabel){markers.forageLabel.ll=ring[Math.floor(ring.length*.62)];markers.forageLabel.el.textContent=(S.forageM/1000).toFixed(2)+' km from the parcel';}else marker('forageLabel',ring[Math.floor(ring.length*.62)],(S.forageM/1000).toFixed(2)+' km from the parcel','teal');last={};apply();}
function setWeb(){if(!map||!ready||!S.web)return;const w=S.web;map.getSource('web').setData(fc(w.lines.map(l=>feat({type:'LineString',coordinates:l.p},{c:l.c,b:l.b}))));map.getSource('webnodes').setData(fc(w.nodes.map(n=>feat({type:'Point',coordinates:[n[0],n[1]]},{c:n[2],d:n[3]}))));last={};apply();}
function setFlow(){if(!map||!ready)return;const P=S.flowPaths||[];map.getSource('flow').setData(fc(P[0]?[feat({type:'LineString',coordinates:P[0]})]:[]));map.getSource('flowuser').setData(fc(P[1]?[feat({type:'LineString',coordinates:P[1]})]:[]));}
function setDots(pts){if(map&&ready)map.getSource('flowdots').setData(fc(pts.map(p=>feat({type:'Point',coordinates:p}))));}
function setSampling(){if(!map||!ready||!S.samplingPts)return;map.getSource('sampling').setData(fc(S.samplingPts.filter(f=>S.sampling[f.kind]!==false).map(f=>feat({type:'Point',coordinates:f.p},{kind:f.kind}))));if(S.transectLine)map.getSource('transect').setData(fc([feat({type:'LineString',coordinates:S.transectLine})]));last={};apply();}
function project(ll){if(!map||!ready)return null;const q=map.project(ll);return[q.x,q.y];}
function unproject(x,y){if(!map||!ready)return null;const p=map.unproject([x,y]);return[p.lng,p.lat];}
KS.gl={project,setForage,setFlow,setWeb,setDots,setSampling,unproject,start,stop,apply,addData,cellAt,resize(){if(map){try{map.resize();}catch(e){}}},active:()=>!!map&&ready,map:()=>map};
})();
