"""Build a compact presentation adapter from the frozen public scientific release.
No model fitting, new selection, resampling or outcome exclusion.
"""
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
load=lambda p:json.loads((ROOT/p).read_text())
n=load('data/forecast-round2.json');g=load('data/monitoring-glenwood.json')
paths=['data/keystone-candidate.geojson','data/hydro.js','data/stations.geojson','data/context/nldi_associated_basins.geojson','data/context/north_upstream.geojson','data/context/east_upstream.geojson','data/context/burn_basin_intersections.geojson','data/mtbs-final-perimeters.geojson','data/events/measured-20210730-20210804.json','data/forecast-round2.json','data/monitoring-north-windows.json','data/monitoring-glenwood.json','data/monitoring-glenwood-windows.json','data/finance-evidence-ledger.json']
bindings={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
assert bindings[paths[0]]=='dc5c013b6a94cc4844f080a4f25abbf46650adcab671a52775527c7e7c46cf91'
result={'schema':'keystone-experience/3.0','purpose':'Presentation adapter only; frozen R1/R2 science unchanged','sources_sha256':bindings,'scenes':[
 {'id':'polygon','designation':'checked provider geometry; legacy screening candidate','source':paths[0],'unit':'ha; lon/lat degrees','limit':'No validated rank, treatment effect, land rights or recipient established'},
 {'id':'dependency','designation':'cartographic context','source':paths[1],'unit':'lon/lat degrees','limit':'Simplified retained NHDPlus HR geography; no verified delivery route or travel time'},
 {'id':'fire','designation':'separate Grand Lake associated-basin context','sources':paths[2:8],'unit':'lon/lat degrees; km²','limit':'Whole associated NHDPlusV2 COMID basins, exact station split unresolved. Final revised MTBS context, not fire progression, soil severity, or as-issued model evidence'},
 {'id':'observation','designation':'observed historical replay','source':paths[8],'unit':'rain inches per 5min; Q ft³/s; turbidity FNU','limit':'July30-Aug4 2021 example; native timestamps and gaps retained; separate from 2023-24 final forecast test; no sediment mass or causal treatment claim'},
 {'id':'evidence','designation':'retrospective frozen evaluation','source':paths[9],'unit':'log1p(FNU) absolute error; FNU bands','limit':'Untouched at freeze, now consumed. Corrected archives and assumed 30-minute latency, not verified real-time issuance'},
 {'id':'decision','designation':'historical monitoring proposals','sources':paths[9:13],'unit':'proposed 6h monitoring windows','limit':'All accepted slots including unknown outcomes. Nonnested policy sets. Neither learned policy qualified for promotion; no placed order or benefit claim'},
 {'id':'next','designation':'human review workflow','source':paths[13],'unit':'USD only if user supplies unit cost','limit':'No contracted buyer, lab quote, treatment effect, financing approval, payout or credit'}],
 'imagery':{'url':'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer','credit':'USDA / USGS The National Map','meaning':'Current public orthoimagery mosaic; no event-date inference','metadata_checked':'2026-11-13','service_refresh':'June2024','CONUS_vintages':'2017-2021 NAIP'},
 'basin_sources':{'provider':'USGS NLDI','url':'https://api.water.usgs.gov/nldi/linked-data/comid','fabric':'NHDPlusV2','support':'whole upstream basin associated with COMID1234473/1234493, exact station split failed'},
 'north':{k:n[k] for k in ['station_id','baseline_model_id','selected_model_id','primary_comparison','external_transfer','allocation_metrics','forecast_examples','provenance','monitoring_policy']},
 'glenwood':{k:g[k] for k in ['station_id','baseline_model_id','selected_model_id','primary_business_comparison','allocation_metrics','provenance','monitoring_policy']},'schedules':{}}
for name,case in [('north',n),('glenwood',g)]:
 rows=load('data/monitoring-'+name+'-windows.json');threshold=case['monitoring_policy']['target_threshold_fnu'];slots=[]
 for r in rows:
  for p in r['predictions']:
   if p['alert_issued']:
    slots.append({k:r[k] for k in ['window_id','station_id','issue_time','target_end','outcome_evaluable','observed_max_fnu']}|{'model_id':p['model_id'],'outcome':'unknown' if not r['outcome_evaluable'] else 'high' if r['observed_max_fnu']>threshold else 'nonhigh'})
 result['schedules'][name]={'slots':slots,'range':[rows[0]['issue_time'],rows[-1]['target_end']],'threshold_fnu':threshold,'threshold_kind':'station-specific development 90th percentile, not regulatory standard','allocation_rule':case['monitoring_policy']['policy_description']}
 for a in case['allocation_metrics']:
  actual=[s for s in slots if s['model_id']==a['model_id']]; assert len(actual)==a['accepted_alerts']; assert sum(s['outcome']=='high' for s in actual)==a['true_positive_accepted']; assert sum(s['outcome']=='unknown' for s in actual)==a['accepted_alerts_unknown_outcome']
base={s['window_id'] for s in result['schedules']['glenwood']['slots'] if s['model_id']==g['baseline_model_id']}; model={s['window_id'] for s in result['schedules']['glenwood']['slots'] if s['model_id']==g['selected_model_id']}
result['schedules']['glenwood']['set_overlap']={'shared':len(base&model),'baseline_only':len(base-model),'classifier_only':len(model-base),'nested':False};assert(len(base&model),len(base-model),len(model-base))==(7,1,3)
(ROOT/'data/experience-evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print('Experience adapter:',len(bindings),'source hashes; all',sum(len(s['slots']) for s in result['schedules'].values()),'policy allocations retained.')

# Embed the checked local parcel so its actual geometry is available before any network.
p=ROOT/'index.html'
html=p.read_text()
parcel=load('data/keystone-candidate.geojson')
payload=json.dumps(parcel,separators=(',',':'),ensure_ascii=True).replace('<','\\u003c')
block='<script id="embedded-parcel" type="application/json">'+payload+'</script>'
import re
if 'id="embedded-parcel"' in html:
 html=re.sub(r'<script id="embedded-parcel" type="application/json">.*?</script>',lambda _:block,html,flags=re.S)
else:
 html=html.replace('<script defer src="js/story.js"></script>',block+'<script defer src="js/story.js"></script>')
p.write_text(html)

# Static no-script outline uses a Web-Mercator projection of the exact source ring.
import math
ring=parcel['features'][0]['geometry']['coordinates'][0]
def merc(p):
 a=math.radians(p[1]);return ((p[0]+180)/360,(1-math.log(math.tan(math.pi/4+a/2))/math.pi)/2)
pts=[merc(c) for c in ring]
c=merc([-106.37816031844216,39.47973419683995]);scale=320/(max(v[1] for v in pts)-min(v[1] for v in pts))
outline=' '.join(('M' if i==0 else 'L')+f'{500+(v[0]-c[0])*scale:.5f},{480+(v[1]-c[1])*scale:.5f}' for i,v in enumerate(pts))+' Z'
html=p.read_text();html=re.sub(r'(<path id="initial-parcel" class="parcel" d=")[^"]*("/>)',lambda m:m[1]+outline+m[2],html);p.write_text(html)

# Token-derived presentation opacity; imagery is uniformly subdued for legibility.
tokens=load('brand/tokens.json')
o=tokens['geometry']['motif_opacity']
(ROOT/'brand/experience.css').write_text('/* Generated from canonical geometry.motif_opacity; no document component styles. */\n:root{--gol-ambient-edge-opacity:'+str(o['ambient_edge'])+';--gol-ambient-node-opacity:'+str(o['ambient_node'])+';--gol-divider-opacity:'+str(o['divider_edge'])+';}\n')
