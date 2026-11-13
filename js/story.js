/* Graph of Life brand v1.0.0 · token-derived map and story. Actual geometry, no synthetic delivery edges. */
(function(){
'use strict';
const query=new URLSearchParams(location.search);
// Preserve every previously shared evidence URL; the immersive story owns chapter=.
if(query.has('scene')||query.has('forecastCase')){location.replace('evidence.html'+location.search+location.hash);return;}
const ids=['polygon','dependency','fire','evidence','decision','next'];
const chapters=ids.map(id=>document.getElementById(id));
const rail=[...document.querySelectorAll('.chapter-rail a')];
const mobile=()=>matchMedia('(max-width:800px)').matches;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const S=window.__STORY={chapter:'polygon',index:0,mode:'svg',ready:false,explore:false,candidate:false,fire:true,camera:null,errors:[],cameraTransitions:0};
const svg=document.getElementById('geography'),NS='http://www.w3.org/2000/svg';
const H=window.__HYDRO||{streams:[]};
let parcel=null,fire=null,map=null,native=false,renderFrame=0,scrollFrame=0,initializing=true,focusReturn=null,fireRequested=false;
const C=getComputedStyle(document.documentElement);const tok=n=>C.getPropertyValue('--gol-'+n).trim();
const sizes={s1:parseFloat(tok('s1')),s2:parseFloat(tok('s2')),s3:parseFloat(tok('s3')),s4:parseFloat(tok('s4'))};
const titles=['Red Cliff / Eagle · legacy candidate','Eagle River · cartographic context','Grand Lake · separate measurement case','North / East Inlet · held-out evidence','Glenwood · separate decision test','Red Cliff / Eagle · next evidence'];
const points={north:[-105.799722,40.2575],east:[-105.797778,40.236389],glenwood:[-107.2908874,39.5588711],candidate:[-106.37816031844216,39.47973419683995]};
function merc(p){const lat=Math.max(-85,Math.min(85,p[1]))*Math.PI/180;return[(p[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat/2))/Math.PI)/2];}
function unmerc(p){return[p[0]*360-180,Math.atan(Math.sinh(Math.PI*(1-2*p[1])))*180/Math.PI];}
function camera(i){const w=innerWidth,h=innerHeight,m=mobile();let p,z,targetX=m?.5:(i%2?.28:.68),targetY=m?.29:.48;
 if(i===0||i===5){p=points.candidate;z=m?14.9:15.6;}
 else if(i===1){p=[-106.43,39.48];z=m?10.8:11.6;}
 else if(i===2){p=[-105.99,40.32];z=m?8.8:9.7;targetX=m?.5:.69;}
 else if(i===3){p=[-105.80,40.247];z=m?11.9:12.0;}
 else {p=points.glenwood;z=m?11.6:12.2;}
 const scale=512*Math.pow(2,z),o=merc(p);const c=unmerc([o[0]-(targetX-.5)*w/scale,o[1]-(targetY-.5)*h/scale]);
 return{center:c,zoom:z,bearing:0,pitch:0,target:p};}
function project(p){if(native&&map){const v=map.project(p);return[v.x,v.y];}const v=merc(p),c=merc(S.camera.center),scale=512*Math.pow(2,S.camera.zoom);return[(v[0]-c[0])*scale+innerWidth/2,(v[1]-c[1])*scale+innerHeight/2];}
function element(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function visible(p){return p[0]>-100&&p[0]<innerWidth+100&&p[1]>-100&&p[1]<innerHeight+100;}
function line(coords,cls){const p=coords.map(project);if(!p.some(visible))return;const d=p.map((v,i)=>(i?'L':'M')+v[0].toFixed(2)+','+v[1].toFixed(2)).join(' ');svg.appendChild(element('path',{d,class:cls}));}
function polygons(j,cls){if(!j)return;for(const f of j.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys)for(const ring of poly)line(ring,cls);}}
function label(p,name,cls,dy=0){const v=project(p);if(!visible(v))return;const t=element('text',{x:v[0]+sizes.s3,y:v[1]+dy,class:cls||'map-label'},name);svg.appendChild(t);const width=t.getComputedTextLength();if(v[0]+sizes.s3+width>innerWidth-sizes.s3){t.setAttribute('text-anchor','end');t.setAttribute('x',Math.min(innerWidth-sizes.s3,v[0]-sizes.s3));}if(t.getBoundingClientRect().left<sizes.s3){t.setAttribute('text-anchor','start');t.setAttribute('x',sizes.s3);}}
function draw(){renderFrame=0;if(!S.camera)return;svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.replaceChildren();
 const i=S.index;
 // These are retained NHDPlus HR cartographic stream arrays. No display arcs are used.
 const streams=(H.streams||[]).filter(r=>i===2||i===3?(/North Inlet|East Inlet/.test(r.n)):(i===0||i===5?(/Eagle River|Homestake Creek/.test(r.n)):true));
 for(const r of streams)line(r.p,'context-river');
 if((i===0||i===1||i===5)&&parcel){polygons(parcel,'parcel-outline');const path=svg.querySelector('.parcel-outline');if(path){path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-label','Inspect the actual Eagle County candidate boundary');path.style.pointerEvents='stroke';path.style.cursor='pointer';path.addEventListener('click',openCandidate);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCandidate();}});}
  if(i===1){const p=project(points.candidate);svg.appendChild(element('circle',{cx:p[0],cy:p[1],r:sizes.s1,class:'candidate-node'}));label(points.candidate,'Eagle candidate');}
  else label(points.candidate,'220531300003','coordinate-label',mobile()?-sizes.s4:-sizes.s4);
 }
 if(i===2&&S.fire)polygons(fire,'fire-outline');
 const stations=i===2||i===3?[['north','North Inlet'],['east','East Inlet']]:i===4?[['glenwood','Glenwood · 09071750']]:[];
 for(const[id,name]of stations){const p=project(points[id]);svg.appendChild(element('circle',{cx:p[0],cy:p[1],r:sizes.s1+sizes.s1/2,class:'station-dot'}));label(points[id],name,'map-label',id==='east'?sizes.s3:-sizes.s2);}
 if(!native){const text=S.candidate||i>1?'Flat geographic view · same source coordinates':'Loading checked parcel geometry…';svg.appendChild(element('text',{x:sizes.s4,y:innerHeight-sizes.s4*3,class:'coordinate-label'},text));}
}
function requestDraw(){if(!renderFrame)renderFrame=requestAnimationFrame(draw);}
function updateState(){const caption=document.querySelector('.candidate-callout b');if(caption)caption.textContent=native?(S.imageryStatus==='unavailable'?'Imagery unavailable · actual boundary retained':'USGS imagery mosaic · not event-time imagery'):'Flat geographic view · imagery not displayed';const short=['Eagle County · screening candidate','Eagle River · mapped context','Grand Lake · separate case','North / East · held-out evidence','Glenwood · separate case','Eagle County · next evidence'];document.getElementById('map-state').textContent=(mobile()?short[S.index]:titles[S.index])+(S.explore?' · explore':native?'':' · flat view')+((S.index===0||S.index===5)&&S.imageryStatus==='unavailable'?' · imagery unavailable':S.index!==0&&S.index!==5&&S.terrainStatus==='unavailable'?' · relief unavailable':'');}
function updateBase(){if(!native||!map)return;const close=S.index===0||S.index===5;if(map.getLayer('story-imagery'))map.setLayoutProperty('story-imagery','visibility',close&&S.imageryStatus!=='unavailable'?'visible':'none');if(map.getLayer('story-relief'))map.setLayoutProperty('story-relief','visibility',close?'none':'visible');}
function setCamera(c,cut=false){S.camera=c;S.cameraTransitions++;S.lastTransition=(reduced||cut)?'cut':'ease';if(map&&native){map.stop();const opts={center:c.center,zoom:c.zoom,bearing:c.bearing,pitch:c.pitch};if(reduced||cut)map.jumpTo(opts);else map.easeTo({...opts,duration:1250,essential:false});}requestDraw();}
function setScene(i,{url=true,cut=false}={}){i=Math.max(0,Math.min(ids.length-1,i));S.index=i;S.chapter=ids[i];chapters.forEach((e,j)=>e.classList.toggle('is-active',i===j));rail.forEach((e,j)=>{if(i===j)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
 if(!S.explore)setCamera(camera(i),cut||i===2||i===4); // Explicit geographic cuts; never imply a connecting river route.
 updateBase();if(i===2)loadFire();if(i!==1){document.getElementById('dependency-test').hidden=true;document.getElementById('trace-dependency').setAttribute('aria-expanded','false');}
 if(url){const u=new URL(location.href);u.searchParams.set('chapter',ids[i]);u.hash='';history.replaceState(null,'',u);}updateState();requestDraw();}
function activeFromScroll(){scrollFrame=0;if(initializing||S.explore)return;let best=0,dist=Infinity;chapters.forEach((e,i)=>{const r=e.getBoundingClientRect();const d=Math.abs(r.top+r.height/2-innerHeight/2);if(d<dist){dist=d;best=i;}});if(best!==S.index)setScene(best);}
function toChapter(i,smooth=true){setExplore(false);setScene(i);chapters[i].scrollIntoView({behavior:reduced||!smooth?'instant':'smooth',block:'start'});}
function setExplore(value){S.explore=value;document.body.classList.toggle('exploring',value);const b=document.getElementById('explore-map');b.setAttribute('aria-pressed',String(value));b.textContent=value?'Return to story':'Explore map';if(native&&map){for(const k of ['dragPan','touchZoomRotate','doubleClickZoom','keyboard'])map[k][value?'enable':'disable']();map.scrollZoom.disable();if(!value)setCamera(camera(S.index),true);else{map.getCanvas().setAttribute('tabindex','0');map.getCanvas().focus();}}else if(value){document.getElementById('landscape').setAttribute('tabindex','0');document.getElementById('landscape').focus();}else setCamera(camera(S.index),true);updateState();}
function openCandidate(e){focusReturn=e?.currentTarget||document.activeElement;const dialog=document.getElementById('candidate-dialog');if(!dialog.open)dialog.showModal();}
async function loadFire(){if(fireRequested)return;fireRequested=true;try{const r=await fetch('data/mtbs-final-perimeters.geojson');if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();fire={type:'FeatureCollection',features:j.features.filter(f=>f.properties.fire_id==='CO4020310623920201014')};requestDraw();}catch(e){S.errors.push('Fire footprint unavailable: '+e.message);document.getElementById('fire-toggle').disabled=true;document.getElementById('fire-toggle').textContent='Fire geometry unavailable';}}
function fallback(reason){const stale=map;map=null;if(stale){try{stale.remove();}catch(_){}}native=false;S.mode='svg';S.ready=true;if(reason)S.errors.push(reason);document.getElementById('story-map').replaceChildren();setCamera(camera(S.index),true);updateState();}
function startMap(){if(query.get('svg')==='1'||!window.maplibregl){fallback();return;}
 try{const c=camera(S.index);map=new maplibregl.Map({container:'story-map',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',center:c.center,zoom:c.zoom,pitch:0,bearing:0,interactive:false,attributionControl:false,fadeDuration:0});const activeMap=map;let loaded=false;const timer=setTimeout(()=>{if(!loaded&&map===activeMap)fallback('Basemap unavailable; checked SVG geometry retained');},6500);
 map.on('load',()=>{if(map!==activeMap)return;loaded=true;clearTimeout(timer);native=true;S.mode='map';S.ready=true;try{map.addSource('story-dem',{type:'raster-dem',encoding:'terrarium',tileSize:256,maxzoom:13,tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']});const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol');map.addLayer({id:'story-relief',type:'hillshade',source:'story-dem',paint:{'hillshade-exaggeration':.55,'hillshade-shadow-color':tok('abyss'),'hillshade-highlight-color':tok('muted'),'hillshade-accent-color':tok('navy')}},firstLabel?.id);}catch(e){S.errors.push('Terrain: '+e.message);}try{map.addSource('story-imagery',{type:'raster',tileSize:256,maxzoom:16,tiles:['https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'],attribution:'USDA, USGS The National Map: Orthoimagery'});map.addLayer({id:'story-imagery',type:'raster',source:'story-imagery',paint:{'raster-fade-duration':0}});}catch(e){S.errors.push('Imagery: '+e.message);}updateBase();setCamera(camera(S.index),true);updateState();});map.on('move',requestDraw);map.on('moveend',()=>{if(map)S.actualCamera={center:map.getCenter().toArray(),zoom:map.getZoom()};});map.on('resize',requestDraw);map.on('error',e=>{if(map!==activeMap)return;const message=e.error?.message||'Source unavailable';if(!loaded&&message.includes('style')){clearTimeout(timer);fallback('Basemap blocked; checked SVG geometry retained');return;}if(loaded){if(e.sourceId==='story-imagery'||message.includes('USGSImageryOnly'))S.imageryStatus='unavailable';else if(e.sourceId==='story-dem'||message.includes('terrarium'))S.terrainStatus='unavailable';S.errors.push(message);updateBase();updateState();}});
 }catch(e){fallback('Map initialization: '+e.message);}}
// Flat-map exploration preserves actual coordinates and the same deterministic reset.
const landscape=document.getElementById('landscape');let drag=null;
landscape.addEventListener('pointerdown',e=>{if(native||!S.explore)return;drag={x:e.clientX,y:e.clientY,center:merc(S.camera.center)};landscape.setPointerCapture(e.pointerId);});
landscape.addEventListener('pointermove',e=>{if(!drag||native||!S.explore)return;const scale=512*Math.pow(2,S.camera.zoom);S.camera={...S.camera,center:unmerc([drag.center[0]-(e.clientX-drag.x)/scale,drag.center[1]-(e.clientY-drag.y)/scale])};requestDraw();});
landscape.addEventListener('pointerup',()=>{drag=null;});landscape.addEventListener('pointercancel',()=>{drag=null;});
landscape.addEventListener('wheel',e=>{if(native||!S.explore)return;e.preventDefault();S.camera={...S.camera,zoom:Math.max(6,Math.min(17,S.camera.zoom+(e.deltaY<0?.3:-.3)))};requestDraw();},{passive:false});
landscape.addEventListener('keydown',e=>{if(native||!S.explore)return;const shift={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(shift){e.preventDefault();const c=merc(S.camera.center),scale=512*Math.pow(2,S.camera.zoom);S.camera={...S.camera,center:unmerc([c[0]+shift[0]*sizes.s4*3/scale,c[1]+shift[1]*sizes.s4*3/scale])};requestDraw();}else if(e.key==='+'||e.key==='-'){e.preventDefault();S.camera={...S.camera,zoom:Math.max(6,Math.min(17,S.camera.zoom+(e.key==='+'?.5:-.5)))};requestDraw();}});
// Each geometry source is local and public. Failed geometry is never substituted.
fetch('data/keystone-candidate.geojson').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(j=>{parcel=j;S.candidate=true;requestDraw();}).catch(e=>{S.errors.push('Parcel geometry unavailable: '+e.message);document.querySelectorAll('.candidate-callout span:last-child').forEach(e=>e.textContent='Parcel geometry unavailable · open source record');requestDraw();});
for(const a of document.querySelectorAll('a[href^="#"]')){const target=a.getAttribute('href').slice(1),i=ids.indexOf(target);if(i>=0)a.addEventListener('click',e=>{e.preventDefault();toChapter(i);});}
for(const b of document.querySelectorAll('[data-inspect]'))b.addEventListener('click',openCandidate);
const dialog=document.getElementById('candidate-dialog');document.getElementById('close-candidate').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{if(focusReturn?.isConnected)focusReturn.focus();});
document.getElementById('trace-dependency').addEventListener('click',function(){const open=this.getAttribute('aria-expanded')!=='true';this.setAttribute('aria-expanded',String(open));document.getElementById('dependency-test').hidden=!open;this.textContent=open?'Close the dependency test':'Test the connection →';});
document.getElementById('fire-toggle').addEventListener('click',function(){S.fire=!S.fire;this.setAttribute('aria-pressed',String(S.fire));this.textContent=S.fire?'Hide fire footprint':'Show fire footprint';requestDraw();});
document.getElementById('explore-map').addEventListener('click',()=>setExplore(!S.explore));document.getElementById('reset-story').addEventListener('click',()=>{S.fire=true;const b=document.getElementById('fire-toggle');b.setAttribute('aria-pressed','true');b.textContent='Hide fire footprint';toChapter(0,false);});
document.getElementById('flat-map').addEventListener('click',function(){const u=new URL(location.href);u.searchParams.set('svg',1);u.searchParams.set('chapter',S.chapter);this.href=u.href;});
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(activeFromScroll);},{passive:true});addEventListener('resize',()=>{if(!S.explore)setCamera(camera(S.index),true);requestDraw();});
addEventListener('keydown',e=>{if(dialog.open||S.explore||/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName))return;if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();toChapter(Math.min(5,S.index+1));}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();toChapter(Math.max(0,S.index-1));}});
const initial=ids.indexOf(query.get('chapter')||location.hash.slice(1));setScene(initial<0?0:initial,{url:false,cut:true});startMap();requestAnimationFrame(()=>{chapters[S.index].scrollIntoView({behavior:'instant',block:'start'});initializing=false;requestDraw();});
})();
