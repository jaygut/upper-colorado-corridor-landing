"""Compile static evidence and accessible fallbacks from their owning records."""
import hashlib,html,json,pathlib,re,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
source=root/'data/headwaters-evidence.json';data=json.loads(source.read_text())
assert data['schema_version']=='1.0.0'
assert all(s['status'] in {'observed','derived','modeled','illustrative','unavailable'} for s in data['sources'])
source_ids={s['id'] for s in data['sources']}
for record in data['claims']+data['paths']+data['stations']:
 assert set(record['evidence_ids'])<=source_ids
for event in data['events']:
 f=root/event['detail_url'];assert f.is_file()
 if event.get('sha256'):assert hashlib.sha256(f.read_bytes()).hexdigest()==event['sha256']
for name,expected in data['legacy']['source_hashes'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
(root/'data/headwaters.js').write_text('// Generated from data/headwaters-evidence.json. Run python3 tools/build-evidence.py.\nwindow.HEADWATERS = '+json.dumps(data,separators=(',',':'))+';\n')
# The legacy APP_DATA export remains the owner of its benchmark values.
script="const fs=require('fs'),vm=require('vm');let c={window:{}};vm.runInNewContext(fs.readFileSync('data/bundle.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.APP_DATA.validation.oof));"
legacy=json.loads(subprocess.check_output(['node','-e',script],cwd=root,text=True))
index=root/'index.html';page=index.read_text()
def rows(table_id,value):
 global page
 page=re.sub(r'(<tbody id="'+table_id+r'">).*?(</tbody>)',lambda m:m[1]+value+m[2],page,flags=re.S)
rows('benchmark-rows',''.join('<tr><td>'+html.escape(r['set'])+'</td><td>'+f"{r['r2']:.3f}"+'</td></tr>' for r in legacy))
rows('station-rows',''.join('<tr><td>'+html.escape(s['name']+' · '+s['id'])+'</td><td>'+html.escape(s['role'])+'</td><td>'+html.escape(f"{s['latitude']}, {s['longitude']} · {s['datum']}" if s['latitude'] is not None else 'Unavailable; no substitute point')+'</td></tr>' for s in data['stations']))
page=re.sub(r'(<select id="event">).*?(</select>)',lambda m:m[1]+''.join('<option value="'+e['id']+'">'+html.escape(e['label'])+'</option>' for e in data['events'])+m[2],page,flags=re.S)
page=re.sub(r'(<ol id="measurement-list">).*?(</ol>)',lambda m:m[1]+''.join('<li>'+html.escape(v)+'</li>' for v in data['decision']['measurements'])+m[2],page,flags=re.S)
v=data.get('event_evaluation')
if v:
 names={'B0_climatology':'Training climatology','B0_persistence':'Persistence, selected in development','B1_lagged_water_season':'Lagged discharge and season; rain feature constant'}
 comp=v['paired_comparisons']['B1_lagged_water_season'];interval=comp['storm_bootstrap_95']
 content='<p>North Inlet only. Development used <span class="gol-num">'+str(v['development_storms'])+' storms in 2021</span>; the final chronological block contains <span class="gol-num">'+str(v['final_storms'])+' storms in 2022</span>. This retrospective, storm-selected test does not establish an operational forecast.</p>'
 content+='<table><caption>Same final cohort · MAE on log1p(FNU), lower is better</caption><thead><tr><th>Baseline</th><th>Final MAE</th></tr></thead><tbody>'+''.join('<tr><td>'+names[k]+'</td><td>'+f'{value:.6f}'+'</td></tr>' for k,value in v['final_MAE'].items())+'</tbody></table>'
 content+='<p class="caveat">The lagged water model did not improve on development-selected persistence. Paired MAE gain <span class="gol-num">'+f"{comp['paired_MAE_gain']:.6f}"+'</span>, with a <span class="gol-num">95% storm bootstrap interval ['+f'{interval[0]:.6f}, {interval[1]:.6f}'+']</span>. Positive gain means less error. No predictive upgrade is established.</p>'
 content+='<p>Climatology performed better on the final block. The prespecified comparator remains persistence; the final block is not used to select a replacement.</p><p>Full burn-state Tier A remains blocked by missing prefire observations and incomplete disturbance, terrain and managed-connectivity joins. East Inlet remains context only without independent forcing and discharge.</p>'
 content+='<ul>'+''.join('<li>'+re.sub(r'\b\d+(?:\.\d+)?(?: h| s| mm)?\b',lambda n:'<span class="gol-num">'+n[0]+'</span>',html.escape(w))+'</li>' for w in v.get('independent_method_review',[]))+'</ul>'
 content+='<p class="provenance">SOURCE · <a href="'+v['result_url']+'">versioned baseline results and predictions</a><br>METHOD · chronological holdout and 2000 paired storm bootstrap draws<br>CONFIDENCE · postfire case study; no independent fire replications<br>USE · reject a predictive upgrade claim</p>'
 page=re.sub(r'(<div id="event-evaluation-content">).*?(</div>)',lambda m:m[1]+content+m[2],page,flags=re.S)
index.write_text(page)
print(hashlib.sha256(source.read_bytes()).hexdigest(),source)
