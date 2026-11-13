/* Graph of Life brand v1.0.0 · stable entry to the existing checked monitoring workflow. */
(function(){
'use strict';
const q=new URLSearchParams(location.search);
if(q.get('desk')!=='monitoring'||q.get('scene')!=='decision')return;
let finished=false,interacted=false;
const expected=q.get('forecastCase')==='glenwood'?'glenwood':'north';
for(const name of ['wheel','touchstart','pointerdown'])addEventListener(name,()=>{interacted=true;},{passive:true,once:true});
const controls=document.getElementById('monitoring-controls');
function settle(){if(finished||controls.hidden)return;finished=true;observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{const state=window.__HEADWATERS_APP?.state;if(interacted||!state||state.scene!=='decision'||state.forecastCase!==expected)return;document.documentElement.style.scrollBehavior='auto';const header=document.querySelector('.site-head').getBoundingClientRect().height;const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gol-s3'));const target=document.getElementById('monitoring-desk');window.scrollTo({top:scrollY+target.getBoundingClientRect().top-header-gap,behavior:'instant'});window.__EVIDENCE_ENTRY={settled:true,case_id:expected};}));}
const observer=new MutationObserver(settle);observer.observe(controls,{attributes:true,attributeFilter:['hidden']});settle();
setTimeout(()=>observer.disconnect(),15000);
})();
