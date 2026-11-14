/* Graph of Life brand v1.0.0. Figures for the unseen-engine chapter. Every mechanism and number comes from data/keystone/ecology.json, which cites its sources. */
(function(){'use strict';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs,text){const n=document.createElementNS(NS,tag);for(const k in attrs||{})n.setAttribute(k,attrs[k]);if(text!==undefined)n.textContent=text;return n;}
function svg(host,w,h,label){const s=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',role:'img','aria-label':label});s.style.maxWidth=w+'px';host.replaceChildren(s);return s;}
const width=(host,max)=>Math.max(280,Math.min(max||640,Math.floor(host.getBoundingClientRect().width)||320));
function refList(eco,ids){const wrap=document.createElement('p');wrap.className='k-prov refs';ids.forEach((id,i)=>{const r=eco.references.find(x=>x.id===id);if(!r)return;const a=document.createElement('a');a.href=r.url;a.rel='noopener';a.textContent=r.citation;if(i)wrap.append(' · ');wrap.append(a);});return wrap;}
function pressed(host,on){host.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b===on)));}
function keyAct(g,fn){g.addEventListener('click',fn);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}

/* ---------- the living network: above ground, below ground, on the wing, beyond the boundary ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function wrap(str,max){const out=[];let line='';str.split(' ').forEach(w=>{if(line&&(line+' '+w).length>max){out.push(line);line=w;}else line=line?line+' '+w:w;});if(line)out.push(line);return out;}
const STATUS={mapped:['observed','Mapped from orbit'],recorded:['observed','Recorded within 1 km'],unsampled:['pending','Never sampled here'],beyond:['pending','Recipient unnamed']};
function soil(host,eco,state,readout){const WD=eco.web,narrow=width(host,1000)<560,W=narrow?360:1000,H=narrow?760:672,ground=narrow?292:322,bx=narrow?290:792,R=narrow?12:15;
  const N=WD.nodes.map(n=>Object.assign({},n,{X:narrow?n.nx:n.x,Y:narrow?n.ny:n.y})),by=Object.fromEntries(N.map(n=>[n.id,n]));
  const s=svg(host,W,H,state==='intact'?'Conceptual network of a living forest stand. Insects and birds on the wing, plants above ground and fungi, bacteria and soil below ground are joined by flows of carbon, nutrients, water and pollen, and four of those flows cross the boundary of the stand.':state==='simplified'?'The same network with a simplified soil community. Decomposition, nutrient cycling, nutrient retention and plant diversity are marked as the functions that declined together in a grassland experiment.':'The same network after disturbance. The canopy is lost, the flows it fed have stopped, and nitrate, dissolved carbon and sediment cross the boundary toward the stream and water users.');
  s.classList.add('web');s.classList.add('state-'+state);
  /* backdrop: drawn once from a fixed seed, so the same forest appears on every visit */
  const bg=el('g',{class:'web-bg','aria-hidden':'true'}),rand=rng(20261114);
  bg.append(el('line',{x1:0,y1:ground,x2:bx,y2:ground,class:'ground'}));
  for(let x=narrow?18:24;x<bx-16;x+=(narrow?30:46)+rand()*(narrow?14:26)){const h=(narrow?46:70)+rand()*(narrow?34:60),w=h*.34,lost=state==='disturbed';let d=`M${x},${ground}V${ground-h}`;if(!lost)for(let k=0;k<4;k++){const y=ground-h+h*(.12+k*.2),ww=w*(.35+k*.22);d+=`M${x-ww},${y+ww*.7}L${x},${y}L${x+ww},${y+ww*.7}`;}bg.append(el('path',{d,class:'tree'+(lost?' lost':'')}));
    let r=`M${x},${ground}`;for(let k=0;k<3;k++){let px=x,py=ground;r+=`M${x},${ground}`;for(let q=0;q<4;q++){px+=(rand()-.5)*(narrow?26:40);py+=(narrow?9:13)+rand()*(narrow?10:14);r+=`L${px.toFixed(1)},${py.toFixed(1)}`;}}bg.append(el('path',{d:r,class:'root'}));}
  let hy='';const dots=[];for(let k=0;k<(narrow?46:90);k++){let px=14+rand()*(bx-28),py=ground+34+rand()*(H-ground-60);hy+=`M${px.toFixed(1)},${py.toFixed(1)}`;const steps=4+Math.floor(rand()*4);let ang=rand()*6.283;for(let q=0;q<steps;q++){ang+=(rand()-.5)*1.5;px+=Math.cos(ang)*(narrow?13:20);py+=Math.sin(ang)*(narrow?9:13);py=Math.max(ground+12,Math.min(H-10,py));px=Math.max(6,Math.min(bx-6,px));hy+=`L${px.toFixed(1)},${py.toFixed(1)}`;}dots.push([px,py]);}
  bg.append(el('path',{d:hy,class:'hypha'}));dots.forEach(d=>bg.append(el('circle',{cx:d[0].toFixed(1),cy:d[1].toFixed(1),r:1.6,class:'spore'})));
  bg.append(el('line',{x1:bx,y1:8,x2:bx,y2:H-8,class:'boundary'}));
  [['on the wing',16],['above ground',narrow?150:170],['below ground',ground+18]].forEach(([t,y])=>bg.append(el('text',{x:6,y,class:'tick stratum'},t)));
  bg.append(el('text',{x:bx-8,y:16,class:'tick','text-anchor':'end'},narrow?'inside the stand':'inside a forest stand'));bg.append(el('text',{x:bx+8,y:16,class:'tick'},narrow?'beyond':'beyond the boundary'));
  s.append(bg);
  const defs=el('defs');['carbon','nutrients','structure','water','animal','leak','weak'].forEach(k=>{const m=el('marker',{id:'arrow-'+k,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:narrow?8:10,markerHeight:narrow?8:10,markerUnits:'userSpaceOnUse',orient:'auto-start-reverse'});m.append(el('path',{d:'M0,0L10,5L0,10Z',class:'arrowhead '+k}));defs.append(m);});s.append(defs);
  /* links */
  const say=(parts)=>{readout.replaceChildren(...parts);},P=(cls,t)=>{const p=document.createElement('p');if(cls)p.className=cls;p.textContent=t;return p;},H3=(t,chip)=>{const h=document.createElement('h3');h.textContent=t;if(chip){const i=document.createElement('i');i.className='k-state '+chip[0];i.textContent=chip[1];h.append(' ',i);}return h;};
  const clear=()=>{s.classList.remove('focus');s.querySelectorAll('.rel,.on').forEach(n=>{n.classList.remove('rel');n.classList.remove('on');});};
  let shown=0,crossing=0,weak=0;const G={};
  WD.links.forEach(f=>{const a=by[f.from],b=by[f.to],leak=f.state==='disturbed';if(leak&&state!=='disturbed')return;const broken=state==='disturbed'&&!leak&&f.stops,faint=state==='disturbed'&&!leak&&!f.stops,soft=state==='simplified'&&!!f.simplified;
    const dx=b.X-a.X,dy=b.Y-a.Y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,pad=R+(narrow?7:9),x1=a.X+ux*pad,y1=a.Y+uy*pad,x2=b.X-ux*pad,y2=b.Y-uy*pad,bend=(f.bend!==undefined?f.bend:f.crosses?-22:18)*(narrow?.5:1),mx=(x1+x2)/2-uy*bend,my=(y1+y2)/2+ux*bend,d=`M${x1.toFixed(1)},${y1.toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    const kind=leak?'leak':soft?'weak':f.kind,g=el('g',{class:'flux '+kind+(f.kind==='animal'?' animal':'')+(broken?' broken':'')+(faint?' faint':'')+(f.bridge?' bridge':''),tabindex:broken?'-1':'0',role:broken?'presentation':'button','aria-label':broken?'':f.title,'data-link':f.id,'data-from':f.from,'data-to':f.to});
    g.append(el('path',{d,class:'hit'}));g.append(el('path',{d,class:'line','marker-end':broken?'':`url(#arrow-${kind})`,'marker-start':!broken&&f.both?`url(#arrow-${kind})`:''}));if(!broken)g.append(el('path',{d,class:'pulse'}));
    const cx=(x1+2*mx+x2)/4,cy=(y1+2*my+y2)/4;
    if(leak&&f.where)g.append(el('text',{x:cx,y:cy-8,class:'tick case','text-anchor':'middle'},f.where.split(' · ')[0]));
    if(soft)g.append(el('text',{x:cx-uy*12,y:cy+ux*12+(ux<0?10:-2),class:'tick soft','text-anchor':'middle'},f.simplified));
    if(!broken){shown++;if(f.crosses)crossing++;if(soft)weak++;const show=()=>{clear();g.classList.add('on');const parts=[H3(f.title)];if(f.where)parts.push(P('k-note',f.where));parts.push(P('',f.text));if(soft)parts.push(P('k-note','In the grassland experiment this function, '+f.simplified+', declined as the soil community was simplified. Its strength in a forest soil is unmeasured.'));parts.push(P('k-note',f.where?'A separate place and disturbance. On the Eagle parcel this flow is unmeasured.':f.crosses?'On the Eagle parcel this flow is unmeasured, and no recipient has been named.':'On the Eagle parcel this flow is unmeasured.'),refList(eco,f.refs));say(parts);};keyAct(g,show);g.addEventListener('mouseenter',show);g.addEventListener('focus',show);}
    G[f.id]=g;s.append(g);});
  /* nodes */
  N.forEach(n=>{const lost=state==='disturbed'&&n.id==='canopy',hit=state==='simplified'&&n.id==='flowers',g=el('g',{class:'web-node '+n.status+' layer-'+n.layer+(lost?' lost':'')+(hit?' hit':''),tabindex:'0',role:'button','aria-label':n.label+'. '+STATUS[n.status][1]+'.','data-node':n.id});
    g.append(el('circle',{cx:n.X,cy:n.Y,r:R+10,class:'hit'}));g.append(el('circle',{cx:n.X,cy:n.Y,r:R,class:'mark'}));if(n.status==='mapped'||n.status==='recorded')g.append(el('circle',{cx:n.X,cy:n.Y,r:R*.42,class:'core'}));
    const lines=lost?['Canopy','lost']:narrow?n.lines:wrap(n.label,17);lines.forEach((t,i)=>g.append(el('text',{x:n.X,y:n.Y+R+(narrow?13:16)+i*(narrow?12:15),'text-anchor':'middle',class:'node-label'},t)));
    if(hit)g.append(el('text',{x:n.X-R-8,y:n.Y+4,'text-anchor':'end',class:'tick soft'},'plant diversity'));
    const show=()=>{clear();s.classList.add('focus');g.classList.add('on');s.querySelectorAll(`.flux[data-from="${n.id}"],.flux[data-to="${n.id}"]`).forEach(e=>{e.classList.add('rel');const o=s.querySelector(`.web-node[data-node="${e.dataset.from===n.id?e.dataset.to:e.dataset.from}"]`);if(o)o.classList.add('rel');});
      const parts=[H3(n.label,STATUS[n.status]),P('',n.text),P('k-note','On the Eagle parcel · '+n.here)];if(hit)parts.push(P('k-note','Plant diversity was one of the functions that declined in the grassland experiment when the soil community was simplified.'));parts.push(P('k-note','How it would be observed · '+n.protocol+'.'));if(n.refs)parts.push(refList(eco,n.refs));say(parts);};
    keyAct(g,show);g.addEventListener('mouseenter',show);g.addEventListener('focus',show);s.append(g);});
  s.addEventListener('mouseleave',()=>{s.classList.remove('focus');s.querySelectorAll('.rel').forEach(n=>n.classList.remove('rel'));});
  const inside=N.filter(n=>n.layer!=='beyond'),known=inside.filter(n=>n.status==='mapped'||n.status==='recorded');
  const legend=document.createElement('p');legend.className='k-note figcap';legend.innerHTML=(state==='disturbed'?'<i class="sw k-leak"></i>flows that cross the boundary after disturbance, each from a different forest and a different disturbance, named on its arrow · dashed grey lines are flows that stopped':state==='simplified'?'<i class="sw k-weak"></i>functions that declined together when an experiment simplified the soil community of model grasslands · every other flow is drawn as before':'<i class="sw k-carbon"></i>carbon <i class="sw k-nutrients"></i>nitrogen and phosphorus <i class="sw k-structure"></i>soil structure <i class="sw k-water"></i>water <i class="sw k-animal"></i>carried by animals')+' · conceptual, from published studies';host.append(legend);
  const count=document.createElement('p');count.className='k-note figcap';count.textContent=`Filled green marks are in the public record and dashed marks have never been sampled here. Of the ${inside.length} parts of this network that lie inside the stand, the record for the Eagle parcel reaches ${known.length}, the canopy mapped from orbit and the birds recorded within 1 km.`;host.append(count);
  return{shown,crossing,weak,nodes:N.length,inside:inside.length,known:known.length};}

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
    g.append(el('circle',{cx:n.x,cy:n.y,r:27,class:'hit'}));g.append(el('circle',{cx:n.x,cy:n.y,r:n.keystone?11:8,class:'mark'}));if(n.keystone)g.append(el('text',{x:n.x,y:n.y-20,'text-anchor':'middle',class:'tick'},'stepping stone'));
    keyAct(g,()=>{if(st.removed.has(n.id))st.removed.delete(n.id);else st.removed.add(n.id);onChange();});s.append(g);});
  const cap=document.createElement('p');cap.className='k-note figcap';cap.textContent=eco.network.text;host.append(cap);
  return{groups:comps.length,linkedShare:base?linked/base:0,fullShare:base?fullPairs/base:0,live};}

/* ---------- spillover ledger ---------- */
function ledger(host,eco,mode){host.replaceChildren();const ol=document.createElement('ol');ol.className='ledger '+mode;eco.ledger.forEach(r=>{const li=document.createElement('li'),h=document.createElement('h3'),p=document.createElement('p'),path=document.createElement('p');h.textContent=r.recipient;path.className='k-note';path.textContent=r.pathway;
    if(mode==='here'){const st=document.createElement('i');st.className='k-state pending';st.textContent='Unmeasured';h.append(' ',st);p.textContent=r.here;li.append(h,path,p);}else{const st=document.createElement('i');st.className='k-state proxy';st.textContent='Published elsewhere';h.append(' ',st);p.textContent=r.elsewhere;li.append(h,path,p,refList(eco,r.refs));}ol.append(li);});host.append(ol);return eco.ledger.length;}

/* ---------- the framework at work: public inputs, a sealed core, checkable outputs ---------- */
function framework(host){if(!host)return;const wires=host.querySelector('.fw-wires'),core=host.querySelector('.fw-core'),art=host.querySelector('#fw-art');if(!wires||!core||!art)return;
  if(!art.childNodes.length){art.setAttribute('viewBox','0 0 120 150');const rand=rng(7),pts=[];for(let k=0;k<17;k++)pts.push([10+rand()*100,10+rand()*130]);let n=0;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j];if(Math.hypot(a[0]-b[0],a[1]-b[1])<40){art.append(el('line',{x1:a[0].toFixed(1),y1:a[1].toFixed(1),x2:b[0].toFixed(1),y2:b[1].toFixed(1),class:'fw-edge'+(n++%3===0?' live':'')}));}}pts.forEach((q,i)=>art.append(el('circle',{cx:q[0].toFixed(1),cy:q[1].toFixed(1),r:i===4?4.5:2.4,class:'fw-node'+(i===4?' key':'')})));}
  const hb=host.getBoundingClientRect(),cb=core.getBoundingClientRect(),ins=[...host.querySelectorAll('.fw-in li')],outs=[...host.querySelectorAll('.fw-out li')];wires.replaceChildren();if(!hb.width)return;wires.setAttribute('viewBox',`0 0 ${hb.width.toFixed(0)} ${hb.height.toFixed(0)}`);
  if(ins.length&&cb.top>=ins[ins.length-1].getBoundingClientRect().bottom-2)return;
  const cl=cb.left-hb.left,cr=cb.right-hb.left,ct=cb.top-hb.top,ch=cb.height,wire=(x1,y1,x2,y2,cls)=>{const mx=(x1+x2)/2,d=`M${x1.toFixed(1)},${y1.toFixed(1)}C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;wires.append(el('path',{d,class:'wire '+cls}));wires.append(el('path',{d,class:'wire-pulse '+cls}));};
  ins.forEach((li,i)=>{const r=li.getBoundingClientRect();wire(r.right-hb.left+6,r.top-hb.top+r.height/2,cl,ct+ch*(i+1)/(ins.length+1),'in');});
  outs.forEach((li,i)=>{const r=li.getBoundingClientRect();wire(cr,ct+ch*(i+1)/(outs.length+1),r.left-hb.left-6,r.top-hb.top+Math.min(r.height/2,16),'out');});}

/* ---------- the dependency graph: every scene as nodes and edges, with roads across the domains ---------- */
const GSTATE={computed:['observed','Computed'],observed:['observed','Observed'],tested:['observed','Tested · held'],failed:['failed','Tested · failed'],published:['proxy','Published elsewhere'],pending:['pending','Pending']};
const HELD=['computed','observed','tested'];
function chip(st){const i=document.createElement('i');i.className='k-state '+GSTATE[st][0];i.textContent=GSTATE[st][1];return i;}
function graph(host,G,roadId,readout,eco,go){const narrow=width(host,1000)<560,W=narrow?360:1000,H=narrow?1070:672,R=narrow?10:13;
  /* narrow screens turn the columns into rows and stagger neighbours so their labels clear each other */
  const pos={},rows=G.domains.filter(d=>d.x!=null).map(d=>d.id),pitch=128;if(narrow){rows.forEach((dom,ci)=>{const list=G.nodes.filter(n=>n.domain===dom&&n.id!=='budget').sort((a,b)=>a.y-b.y||a.x-b.x);list.forEach((n,k)=>{pos[n.id]=[list.length===1?W/2:32+k*(W-64)/(list.length-1),74+ci*pitch+(k%2?46:0)];});});
    ['north','forecast','gauge','windows','budget'].forEach((id,k)=>{pos[id]=[34+k*73,74+rows.length*pitch+(k%2?46:0)];});}
  else G.nodes.forEach(n=>{pos[n.id]=[n.x,n.y];});
  const by=Object.fromEntries(G.nodes.map(n=>[n.id,n])),road=G.roads.find(r=>r.id===roadId)||null,onRoad=new Set(road?road.edges:[]),roadNodes=new Set(road?[...road.nodes,...road.edges.flatMap(e=>e.split('>'))]:[]);
  const s=svg(host,W,H,road?`Dependency graph with the ${road.label.toLowerCase()} road highlighted. ${road.note}`:`Dependency graph of the whole story, ${G.nodes.length} nodes and ${G.edges.length} edges across land, living community, ecosystem process, pathway, recipient, economic consequence, obligation and measured signal.`);s.classList.add('dgraph');if(road)s.classList.add('has-road');
  const bg=el('g',{'aria-hidden':'true'});G.domains.forEach((d,ci)=>{if(d.x==null){bg.append(el('text',narrow?{x:6,y:48+rows.length*pitch,class:'tick stratum'}:{x:170,y:616,class:'tick stratum','text-anchor':'end'},d.label));return;}if(narrow)bg.append(el('text',{x:6,y:48+ci*pitch,class:'tick stratum'},d.label));else{bg.append(el('text',{x:d.x>900?W-6:d.x<100?6:d.x,y:14,class:'tick stratum','text-anchor':d.x>900?'end':d.x<100?'start':'middle'},d.short||d.label));}});
  if(!narrow)bg.append(el('line',{x1:200,y1:556,x2:W-10,y2:556,class:'band-rule'}));s.append(bg);
  const defs=el('defs');Object.keys(GSTATE).forEach(k=>{const m=el('marker',{id:'g-arrow-'+k,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:narrow?7:9,markerHeight:narrow?7:9,markerUnits:'userSpaceOnUse',orient:'auto-start-reverse'});m.append(el('path',{d:'M0,0L10,5L0,10Z',class:'g-head '+k}));defs.append(m);});s.append(defs);
  const P=(cls,t)=>{const q=document.createElement('p');if(cls)q.className=cls;q.textContent=t;return q;},clear=()=>s.querySelectorAll('.sel').forEach(n=>n.classList.remove('sel'));
  const sceneLink=sc=>{const [c,st]=sc.split(':'),a=document.createElement('a');a.href='?chapter='+c+'&step='+st;a.className='k-btn';a.textContent='Return to its scene ↗';a.addEventListener('click',e=>{e.preventDefault();go(c,st);});return a;};
  const sources=e=>(e.refs&&e.refs.length&&eco)?[refList(eco,e.refs)]:[];
  G.edges.forEach(e=>{const a=pos[e.from],b=pos[e.to],on=onRoad.has(e.id);let d;
    if(e.id==='payer>parcel'){d=narrow?`M${a[0]+R+6},${a[1]}H${W-8}V${b[1]}H${b[0]+R+8}`:`M${a[0]},${a[1]-R-6}V40H${b[0]}V${b[1]-R-8}`;}
    else{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,pad=R+7,x1=a[0]+ux*pad,y1=a[1]+uy*pad,x2=b[0]-ux*pad,y2=b[1]-uy*pad,bend=narrow?0:({'canopy>microbes':46,'fungi>flowers':-74,'disturb>canopy':-10,'microbes>sediment':72}[e.id]||0),mx=(x1+x2)/2-uy*bend,my=(y1+y2)/2+ux*bend;d=`M${x1.toFixed(1)},${y1.toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;}
    const g=el('g',{class:'g-edge '+e.status+(on?' on':'')+(e.id==='payer>parcel'?' loop':''),tabindex:'0',role:'button','aria-label':`${by[e.from].label} to ${by[e.to].label}. ${GSTATE[e.status][1]}.`,'data-edge':e.id});
    g.append(el('path',{d,class:'hit'}));g.append(el('path',{d,class:'line','marker-end':`url(#g-arrow-${e.status})`}));if(on&&HELD.includes(e.status))g.append(el('path',{d,class:'pulse'}));
    const show=()=>{clear();g.classList.add('sel');const h=document.createElement('h3');h.textContent=by[e.from].label+' → '+by[e.to].label;h.append(' ',chip(e.status));readout.replaceChildren(h,P('',e.basis),P('k-note','Kind of dependency · '+e.kind+' · '+G.status_vocabulary[e.status]),...sources(e),sceneLink(e.scene));};
    keyAct(g,show);s.append(g);});
  G.nodes.forEach(n=>{const q=pos[n.id],g=el('g',{class:'g-node '+n.status+' d-'+n.domain+(roadNodes.has(n.id)?' on':''),tabindex:'0',role:'button','aria-label':`${n.label}. ${GSTATE[n.status][1]}.`,'data-node':n.id});
    g.append(el('circle',{cx:q[0],cy:q[1],r:R+9,class:'hit'}));g.append(n.id==='parcel'?el('rect',{x:q[0]-R,y:q[1]-R,width:2*R,height:2*R,class:'mark'}):el('circle',{cx:q[0],cy:q[1],r:R,class:'mark'}));
    const lp=narrow?'b':n.lp,lh=narrow?11:14;n.lines.forEach((t,i)=>{const at=lp==='b'?{x:q[0],y:q[1]+R+(narrow?12:15)+i*lh,'text-anchor':'middle'}:lp==='t'?{x:q[0],y:q[1]-R-8-(n.lines.length-1-i)*lh,'text-anchor':'middle'}:lp==='r'?{x:q[0]+R+8,y:q[1]+4+(i-(n.lines.length-1)/2)*lh,'text-anchor':'start'}:{x:q[0]-R-8,y:q[1]+4+(i-(n.lines.length-1)/2)*lh,'text-anchor':'end'};g.append(el('text',Object.assign(at,{class:'node-label'}),t));});
    const show=()=>{clear();g.classList.add('sel');const h=document.createElement('h3');h.textContent=n.label;h.append(' ',chip(n.status));const d=G.domains.find(x=>x.id===n.domain);readout.replaceChildren(h,P('k-note',d.label+' · chain link '+d.chain),P('',n.evidence),sceneLink(n.scene));};
    keyAct(g,show);s.append(g);});
  const tally=ids=>{const t={};ids.forEach(id=>{const e=G.edges.find(x=>x.id===id);t[e.status]=(t[e.status]||0)+1;});return t;};
  const stats={nodes:G.nodes.length,edges:G.edges.length,road:roadId||'all',tally:tally(road?road.edges:G.edges.map(e=>e.id)),first_open:null};
  if(road){const first=road.edges.map(id=>G.edges.find(x=>x.id===id)).find(e=>!HELD.includes(e.status));stats.first_open=first?first.id:null;
    const h=document.createElement('h3');h.textContent=road.label+' road';const ol=document.createElement('ol');ol.className='road';road.edges.forEach(id=>{const e=G.edges.find(x=>x.id===id),li=document.createElement('li'),b=document.createElement('b'),sp=document.createElement('span');b.textContent=by[e.from].label+' → '+by[e.to].label;sp.textContent=e.basis;li.append(b,chip(e.status),sp);ol.append(li);});
    const order=['computed','observed','tested','failed','published','pending'],sum=order.filter(k=>stats.tally[k]).map(k=>stats.tally[k]+' '+GSTATE[k][1].toLowerCase()).join(' · ');
    readout.replaceChildren(h,P('k-lede road-q',road.question),P('',road.note),P('readout mono',`${road.edges.length} links · ${sum}`+(first?` · first link yet to be shown for this parcel ${by[first.from].label} → ${by[first.to].label}`:'')),ol);}
  else{const order=['computed','observed','tested','failed','published','pending'];readout.replaceChildren(P('readout mono',`${G.nodes.length} nodes · ${G.edges.length} edges · `+order.filter(k=>stats.tally[k]).map(k=>stats.tally[k]+' '+GSTATE[k][1].toLowerCase()).join(' · ')),P('k-note','Select a node or an edge to read its evidence, or choose a road above to follow one dependency from the land to an obligation.'));}
  return stats;}

window.KSE={graph,framework,soil,forage,values,network,components,ledger};
})();
