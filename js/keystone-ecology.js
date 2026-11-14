/* Graph of Life brand v1.0.0. Figures for the unseen-engine chapter. Every mechanism and number comes from data/keystone/ecology.json, which cites its sources. */
(function(){'use strict';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs,text){const n=document.createElementNS(NS,tag);for(const k in attrs||{})n.setAttribute(k,attrs[k]);if(text!==undefined)n.textContent=text;return n;}
function svg(host,w,h,label){const s=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',role:'img','aria-label':label});s.style.maxWidth=w+'px';host.replaceChildren(s);return s;}
const width=(host,max)=>Math.max(280,Math.min(max||640,Math.floor(host.getBoundingClientRect().width)||320));
function refList(eco,ids){const wrap=document.createElement('p');wrap.className='k-prov refs';ids.forEach((id,i)=>{const r=eco.references.find(x=>x.id===id);if(!r)return;const a=document.createElement('a');a.href=r.url;a.rel='noopener';a.textContent=r.citation;if(i)wrap.append(' · ');wrap.append(a);});return wrap;}
function pressed(host,on){host.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b===on)));}
function keyAct(g,fn){g.addEventListener('click',fn);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}

/* ---------- soil engine ---------- */
function soil(host,eco,state,readout){const nodes=eco.soil.nodes,by=Object.fromEntries(nodes.map(n=>[n.id,n])),W=620,H=410,narrow=width(host)<460,s=svg(host,W,H,state==='intact'?'Conceptual diagram of a living forest soil: carbon flows from canopy to roots and fungi, nitrogen and phosphorus flow back, and water leaves the parcel slowly.':'Conceptual diagram after disturbance: the canopy is lost, and nitrate, dissolved carbon and sediment cross the parcel boundary toward the stream and water users.');
  const bx=430;s.append(el('line',{x1:bx,y1:10,x2:bx,y2:H-10,class:'boundary'}));s.append(el('text',{x:bx-8,y:22,class:'tick','text-anchor':'end'},'inside a forest stand'));s.append(el('text',{x:bx+8,y:22,class:'tick'},'beyond the boundary'));
  const defs=el('defs');['carbon','nutrients','structure','water','leak'].forEach(k=>{const m=el('marker',{id:'arrow-'+k,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:10,markerHeight:10,markerUnits:'userSpaceOnUse',orient:'auto-start-reverse'});m.append(el('path',{d:'M0,0L10,5L0,10Z',class:'arrowhead '+k}));defs.append(m);});s.append(defs);
  const shown=eco.soil.fluxes.filter(f=>state==='intact'?f.state==='intact':(f.state==='disturbed'||(f.state==='intact'&&!['c-roots','c-fungi','np-up'].includes(f.id)&&!f.crosses)));
  const edges=[];eco.soil.fluxes.forEach(f=>{const a=by[f.from],b=by[f.to],on=shown.includes(f),broken=state==='disturbed'&&f.state==='intact'&&!on;if(!on&&!broken)return;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,pad=30,x1=a.x+ux*pad,y1=a.y+uy*pad,x2=b.x-ux*pad,y2=b.y-uy*pad,bend=f.id==='np-up'?-46:f.crosses?-22:18,mx=(x1+x2)/2-uy*bend,my=(y1+y2)/2+ux*bend;
    const kind=state==='disturbed'&&f.state==='disturbed'?'leak':f.kind,g=el('g',{class:'flux '+kind+(broken?' broken':''),tabindex:broken?'-1':'0',role:broken?'presentation':'button','aria-label':broken?'':f.title});
    g.append(el('path',{d:`M${x1},${y1}Q${mx},${my} ${x2},${y2}`,class:'hit'}));g.append(el('path',{d:`M${x1},${y1}Q${mx},${my} ${x2},${y2}`,class:'line','marker-end':broken?'':`url(#arrow-${kind})`}));if(!broken)g.append(el('path',{d:`M${x1},${y1}Q${mx},${my} ${x2},${y2}`,class:'pulse'}));
    if(!broken&&f.where){const short=f.where.split(' · ')[0],lab=el('text',{x:mx,y:my-(f.id==='nitrate'?10:-16),class:'tick case','text-anchor':'middle'},short);g.append(lab);}
    if(!broken){const show=()=>{host.querySelectorAll('.flux.on').forEach(n=>n.classList.remove('on'));g.classList.add('on');readout.replaceChildren();const h=document.createElement('h3');h.textContent=f.title;readout.append(h);if(f.where){const w=document.createElement('p');w.className='k-note';w.textContent=f.where;readout.append(w);}const p=document.createElement('p');p.textContent=f.text;readout.append(p);const here=document.createElement('p');here.className='k-note';here.textContent=f.where?'A separate place and disturbance. On the Eagle parcel this flow is unmeasured.':'On the Eagle parcel this flow is unmeasured.';readout.append(here,refList(eco,f.refs));};keyAct(g,show);g.addEventListener('mouseenter',show);g.addEventListener('focus',show);}
    edges.push(g);});
  edges.forEach(g=>s.append(g));
  nodes.forEach(n=>{const lost=state==='disturbed'&&n.id==='canopy',g=el('g',{class:'soil-node'+(n.beyond?' beyond':'')+(lost?' lost':'')});g.append(el('circle',{cx:n.x,cy:n.y,r:n.beyond?16:20}));const lab=el('text',{x:n.x,y:n.y+(n.beyond?34:38),'text-anchor':'middle',class:'node-label'},lost?'Canopy lost':n.label);g.append(lab);s.append(g);});
  const legend=document.createElement('p');legend.className='k-note figcap';legend.innerHTML=state==='intact'?'<i class="sw k-carbon"></i>carbon <i class="sw k-nutrients"></i>nitrogen and phosphorus <i class="sw k-structure"></i>soil structure <i class="sw k-water"></i>water · conceptual, from published studies':'<i class="sw k-leak"></i>flows that cross the boundary after disturbance, each from a different forest and a different disturbance, named on its arrow · dashed lines are flows that stopped';host.append(legend);
  return{shown:shown.length,crossing:shown.filter(f=>f.crosses).length};}

/* ---------- pollinator reach ---------- */
function forage(host,eco,d){const F=eco.forage,w=width(host,620),narrow=w<460,L=narrow?36:48,R=12,T=16,B=40,h=narrow?200:220,pctR=v=>Math.round(v*20)*5,s=svg(host,w,h,`Published decline of native pollinator visitation and richness with distance from natural habitat. Pooled fits, shown to 2 km.`),max=2,x=k=>L+k/max*(w-L-R),y=v=>T+(1-v)*(h-T-B);
  for(const v of [0,.5,1]){s.append(el('line',{x1:L,y1:y(v),x2:w-R,y2:y(v),class:'grid'}));s.append(el('text',{x:L-6,y:y(v)+4,class:'tick','text-anchor':'end'},Math.round(v*100)+'%'));}
  for(let k=0;k<=2;k++)s.append(el('text',{x:x(k),y:h-B+18,class:'tick','text-anchor':'middle'},k+' km'));s.append(el('text',{x:w-R,y:h-4,class:'tick','text-anchor':'end'},'distance from natural habitat'));
  s.append(el('rect',{x:x(F.solitary_max_m[0]/1000),y:T,width:x(F.solitary_max_m[1]/1000)-x(F.solitary_max_m[0]/1000),height:h-T-B,class:'band'}));s.append(el('text',{x:x(F.solitary_max_m[1]/1000)+4,y:T+12,class:'tick'},narrow?'solitary bees':'maximum range of solitary bees'));
  [['visitation_half_km','vis','visits'],['richness_half_km','rich','richness']].forEach(([k,cls,lab])=>{let p='';for(let i=0;i<=60;i++){const km=i/60*max;p+=(i?'L':'M')+x(km).toFixed(1)+','+y(Math.pow(.5,km/F[k])).toFixed(1);}s.append(el('path',{d:p,class:'curve '+cls}));s.append(el('text',{x:x(max)-2,y:y(Math.pow(.5,max/F[k]))-6,class:'tick '+cls,'text-anchor':'end'},lab));});
  const km=d/1000;s.append(el('line',{x1:x(km),y1:T,x2:x(km),y2:h-B,class:'cursor'}));[['visitation_half_km','vis'],['richness_half_km','rich']].forEach(([k,cls])=>s.append(el('circle',{cx:x(km),cy:y(Math.pow(.5,km/F[k])),r:5,class:'dot '+cls})));
  return{vis:Math.pow(.5,km/F.visitation_half_km),rich:Math.pow(.5,km/F.richness_half_km)};}
function values(host,eco){host.replaceChildren();eco.value.forEach(v=>{const d=document.createElement('div');d.innerHTML='<b class="mono"></b><span></span>';d.children[0].textContent=v.figure;d.children[1].textContent=v.text;d.append(refList(eco,v.refs));host.append(d);});}

/* ---------- stepping-stone network ---------- */
function components(nodes,reach,removed){const live=nodes.filter(n=>!removed.has(n.id)),seen=new Set(),out=[];for(const n of live){if(seen.has(n.id))continue;const comp=[],stack=[n];seen.add(n.id);while(stack.length){const a=stack.pop();comp.push(a);for(const b of live)if(!seen.has(b.id)&&Math.hypot(a.x-b.x,a.y-b.y)<=reach){seen.add(b.id);stack.push(b);}}out.push(comp);}return out;}
function network(host,eco,st,onChange){const N=eco.network.nodes,W=600,H=300,s=svg(host,W,H,'Illustrative habitat network. Circles are patches and lines are gaps a disperser can cross.'),comps=components(N,st.reach,st.removed),live=N.length-st.removed.size,pairs=live*(live-1)/2,linked=comps.reduce((a,c)=>a+c.length*(c.length-1)/2,0),full=components(N,st.reach,new Set()),fullPairs=full.reduce((a,c)=>a+c.length*(c.length-1)/2,0),base=N.length*(N.length-1)/2;
  const colour=new Map();comps.sort((a,b)=>b.length-a.length).forEach((c,i)=>c.forEach(n=>colour.set(n.id,i)));
  for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const a=N[i],b=N[j];if(st.removed.has(a.id)||st.removed.has(b.id))continue;if(Math.hypot(a.x-b.x,a.y-b.y)<=st.reach)s.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'net-edge'}));}
  N.forEach(n=>{const gone=st.removed.has(n.id),g=el('g',{class:'net-node'+(n.keystone?' keystone':'')+(gone?' gone':'')+(colour.get(n.id)>0?' cut':''),tabindex:'0',role:'button','aria-pressed':String(gone),'aria-label':(n.keystone?'Stepping-stone patch':'Habitat patch')+(gone?', removed. Select to restore.':'. Select to remove.')});
    g.append(el('circle',{cx:n.x,cy:n.y,r:22,class:'hit'}));g.append(el('circle',{cx:n.x,cy:n.y,r:n.keystone?11:8,class:'mark'}));if(n.keystone)g.append(el('text',{x:n.x,y:n.y-20,'text-anchor':'middle',class:'tick'},'stepping stone'));
    keyAct(g,()=>{if(st.removed.has(n.id))st.removed.delete(n.id);else st.removed.add(n.id);onChange();});s.append(g);});
  const cap=document.createElement('p');cap.className='k-note figcap';cap.textContent=eco.network.text;host.append(cap);
  return{groups:comps.length,linkedShare:base?linked/base:0,fullShare:base?fullPairs/base:0,live};}

/* ---------- spillover ledger ---------- */
function ledger(host,eco,mode){host.replaceChildren();const ol=document.createElement('ol');ol.className='ledger '+mode;eco.ledger.forEach(r=>{const li=document.createElement('li'),h=document.createElement('h3'),p=document.createElement('p'),path=document.createElement('p');h.textContent=r.recipient;path.className='k-note';path.textContent=r.pathway;
    if(mode==='here'){const st=document.createElement('i');st.className='k-state pending';st.textContent='Unmeasured';h.append(' ',st);p.textContent=r.here;li.append(h,path,p);}else{const st=document.createElement('i');st.className='k-state proxy';st.textContent='Published elsewhere';h.append(' ',st);p.textContent=r.elsewhere;li.append(h,path,p,refList(eco,r.refs));}ol.append(li);});host.append(ol);return eco.ledger.length;}

window.KSE={soil,forage,values,network,components,ledger};
})();
