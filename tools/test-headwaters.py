"""Behavioral verification of the static evidence experience."""
import argparse,json,pathlib,time
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--base-url',default='http://127.0.0.1:8766');parser.add_argument('--out',required=True);args=parser.parse_args()
out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True);report={'base_url':args.base_url,'checks':[],'observed_failures':[]}
def check(name,condition,detail=None):
 report['checks'].append({'name':name,'passed':bool(condition),'detail':detail});(out/'browser-checks.json').write_text(json.dumps(report,indent=2));assert condition,name
with sync_playwright() as w:
 b=w.chromium.launch(headless=True)
 for mode in ['desktop','mobile','all-cdn-blocked','basemap-blocked','slow-network','empty-event']:
  context=b.new_context(viewport={'width':390,'height':844} if mode=='mobile' else {'width':1440,'height':1000},has_touch=mode=='mobile',is_mobile=mode=='mobile',reduced_motion='reduce')
  page=context.new_page();errors=[];failed=[];console=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
  if mode=='all-cdn-blocked':page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(args.base_url) else route.abort())
  if mode=='basemap-blocked':page.route('**/*',lambda route:route.abort() if any(h in route.request.url for h in ['cartocdn.com','elevation-tiles-prod']) else route.continue_())
  if mode=='empty-event':page.route('**/data/events/*.json',lambda route:route.fulfill(status=503,body='unavailable'))
  if mode=='slow-network':
   cdp=context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':180,'downloadThroughput':200000,'uploadThroughput':75000,'connectionType':'cellular3g'})
  force='' if mode in ['basemap-blocked','desktop'] else 'svg=1&'
  start=time.monotonic();page.goto(args.base_url+'/?'+force+'scene=pathway&station=09013500&mode=explore',wait_until='domcontentloaded');page.wait_for_function('window.__HEADWATERS_APP && window.__STAGE.ready',timeout=30000)
  if mode=='basemap-blocked':page.wait_for_timeout(5200)
  elapsed=round(time.monotonic()-start,3)
  st=page.evaluate('window.__HEADWATERS_APP.state')
  check(mode+' URL state',st['scene']=='pathway' and st['station']=='09013500' and st['mode']=='explore',st)
  check(mode+' map state',page.evaluate('window.__STAGE.scene')==2)
  page.locator('#context-layer').click();page.wait_for_function("document.querySelector('#context-layer').getAttribute('aria-pressed')==='true'");check(mode+' HUC context caveat','118.79' in page.locator('#context-status').inner_text() and '73.5' in page.locator('#context-status').inner_text());page.locator('#context-layer').click();check(mode+' HUC toggle off',page.locator('#context-layer').get_attribute('aria-pressed')=='false')
  check(mode+' no page errors',not errors,errors)
  check(mode+' viewport overflow',not page.evaluate('document.documentElement.scrollWidth>window.visualViewport.width+1'))
  check(mode+' no unsupported replay',page.locator('button:disabled').filter(has_text='Scenario comparison').count()==1)
  page.locator('#chapter').select_option('earned');check(mode+' benchmark fidelity',page.locator('#benchmark-rows tr').count()==5 and '0.403' in page.locator('#benchmark-rows').inner_text() and '-1.017' in page.locator('#benchmark-rows').inner_text())
  page.locator('#station').select_option('401530105475401');page.locator('#decision').scroll_into_view_if_needed();page.wait_for_timeout(100)
  check(mode+' explicit selection persists',page.evaluate('window.__HEADWATERS_APP.state.station')=='401530105475401' and page.evaluate('window.__HEADWATERS_APP.state.scene')=='earned')
  if mode=='mobile':page.locator('#next').tap()
  else:page.locator('#next').click()
  check(mode+' next/touch parity',page.evaluate('window.__HEADWATERS_APP.state.scene')=='decision')
  page.locator('#sources').evaluate('(n)=>n.open=true');page.keyboard.press('Escape');check(mode+' escape closes and focuses',not page.locator('#sources').evaluate('(n)=>n.open') and page.locator('#chapter').evaluate('(n)=>n===document.activeElement'))
  page.locator('#reset').click();check(mode+' reset',page.evaluate('window.__HEADWATERS_APP.state.scene')=='arrival' and page.evaluate('window.__HEADWATERS_APP.state.mode')=='guided')
  page.locator('#next').focus();page.keyboard.press('Enter');page.wait_for_timeout(100);check(mode+' keyboard chapter control',page.evaluate('window.__HEADWATERS_APP.state.scene')=='fire')
  page.locator('#chapter').select_option('fire');page.wait_for_function("!document.querySelector('#event-chart').textContent.includes('Loading')")
  check(mode+' event empty state',('could not load' if mode=='empty-event' else 'No interpolation') in page.locator('#event-chart').inner_text())
  page.screenshot(path=str(out/(mode+'.png')))
  check(mode+' reduced motion',page.evaluate("getComputedStyle(document.documentElement).scrollBehavior")=='auto')
  resources=page.evaluate("performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))")
  report['observed_failures'].append({'mode':mode,'console':console,'requests':failed,'stage':page.evaluate('window.__STAGE.errors'),'app':page.evaluate('window.__HEADWATERS_APP.errors'),'ready_seconds':elapsed,'resources':resources})
  context.close()
 context=b.new_context(java_script_enabled=False,viewport={'width':390,'height':844});page=context.new_page();page.goto(args.base_url+'/',wait_until='domcontentloaded');check('no JavaScript fact parity','0.403' in page.inner_text('body') and '401530105475401' in page.inner_text('body') and 'No defensible rank yet' in page.inner_text('body'));page.screenshot(path=str(out/'no-javascript.png'));context.close()
 page=b.new_page();page.goto(args.base_url+'/?scene=invalid&station=invalid&event=invalid&svg=1');page.wait_for_function('window.__HEADWATERS_APP');check('invalid URL safe default',page.evaluate('window.__HEADWATERS_APP.state.station')=='401530105475401')
 for path in ['data/headwaters-evidence.json','data/stations.geojson','data/bundle.js','data/geo.js','data/hydro.js','llms.txt','legacy.html']:
  response=page.request.get(args.base_url+'/'+path);check('route '+path,response.status==200)
 page.goto(args.base_url+'/?svg=1&scene=fire&event=measured-20210730-20210804&station=401530105475401&mode=explore',wait_until='networkidle');page.wait_for_selector('#observation-day')
 check('North measured series',page.locator('#event-chart svg').count()==3)
 check('native units retained',all(unit in page.locator('#event-chart').inner_text() for unit in ['in','ft3/s','FNU']))
 page.locator('#observation-day').select_option('2021-07-31');page.wait_for_function("document.querySelector('#observation-day').value==='2021-07-31'")
 check('shared measured day',page.evaluate('window.__HEADWATERS_APP.state.day')=='2021-07-31')
 detail=page.locator('#event-chart details').first;detail.locator('summary').click();check('observations paginated',detail.locator('tbody tr').count()==25);detail.get_by_role('button',name='Next rows').click();check('pagination moves', 'Rows 26' in detail.inner_text())
 page.locator('#station').select_option('09013500');page.wait_for_function("document.querySelectorAll('#event-chart svg').length===1");check('East does not invent Q or rain',page.locator('#event-chart svg').count()==1 and 'Turbidity · FNU' in page.locator('#event-chart').inner_text())
 page.locator('#chapter').select_option('earned');check('new evaluation is separate', '1.403059' in page.locator('#event-evaluation').inner_text() and '-0.048443' in page.locator('#event-evaluation').inner_text())
 check('new results downloadable',page.request.get(args.base_url+'/data/headwaters-baseline-results.json').status==200)
 page.goto(args.base_url+'/legacy.html?svg=1',wait_until='domcontentloaded');page.wait_for_function('window.__STAGE.ready');check('legacy scene registry preserved',page.evaluate('window.__STAGE.nScenes')==15)
 b.close()
report['passed']=all(c['passed'] for c in report['checks']);(out/'browser-checks.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'checks':len(report['checks']),'report':str(out/'browser-checks.json')}))
