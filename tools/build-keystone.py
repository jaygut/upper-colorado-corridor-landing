#!/usr/bin/env python3
"""Build compact visual formats for the Keystone Polygon experience.

Reads only repository-local public files: the five R4 allowlisted payloads in
data/r4/ and the frozen public observation replay. Writes data/keystone/*.json.
No value is modelled, interpolated or re-estimated here. Regular series are
stored as start + cadence + values only after every native timestamp has been
checked against that cadence. Running it again produces identical bytes.
"""
import datetime
import hashlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import passport_register  # noqa: E402
import ecology_register  # noqa: E402
import graph_register  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
R4 = ROOT / 'data' / 'r4'
OUT = ROOT / 'data' / 'keystone'
ALLOWLIST = {
    'eagle_bird_record_context_v2.json': 'd15f1a3da1f08cf760dff05d8b462a996b595bbfba77464db6672a16ca9a66fc',
    'eagle_structural_context.json': 'b56396e8e69854e65f2832affeeebf584cf17269c95f56b1cc4b8acf2523b523',
    'eagle_map_layers.geojson': '47f3e5fd209f8f9d3eb99b4d481369b5d528975bd45c9493394d4cf95d4bca6c',
    'thermal_replay.json': 'bee91296137a896db053fc90e98a0c96b73080f4f53c80aa48bcf9244a8191d1',
    'daily_temperature.json': '48975b37a24b5e98db671d5bdf82d1ab60ab3e377494a881fc07e1c96ac66486',
}
VERSION = '20261114-r6c'
STATION_NAMES = {
    '401530105475401': 'North Inlet',
    '09013500': 'East Inlet',
    '09071750': 'Colorado River above Glenwood Springs',
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text())


def write(name, obj):
    OUT.mkdir(exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, separators=(',', ':'), ensure_ascii=False) + '\n')


def ring(coords):
    return [[round(x, 7), round(y, 7)] for x, y in coords]


def parse(t):
    return datetime.datetime.fromisoformat(t.replace('Z', '+00:00'))


def regular(stamps, cadence):
    """Return True only when every native timestamp sits on the declared cadence."""
    return all((b - a).total_seconds() == cadence for a, b in zip(stamps, stamps[1:]))


def main():
    for name, expected in ALLOWLIST.items():
        actual = sha(R4 / name)
        if actual != expected:
            raise SystemExit(f'{name}: hash {actual} differs from the R4 public export allowlist')
    sources = {f'data/r4/{n}': h for n, h in ALLOWLIST.items()}

    # ---- Eagle living context -------------------------------------------------
    structure = load(R4 / 'eagle_structural_context.json')
    layers = load(R4 / 'eagle_map_layers.geojson')
    birds = load(R4 / 'eagle_bird_record_context_v2.json')
    parcel = load(ROOT / 'data' / 'keystone-candidate.geojson')
    sources['data/keystone-candidate.geojson'] = sha(ROOT / 'data' / 'keystone-candidate.geojson')

    cells, landcover, context = [], [], {}
    for f in layers['features']:
        p, g = f['properties'], f['geometry']
        if g['type'] != 'Polygon':
            raise SystemExit('Unexpected geometry type in eagle_map_layers.geojson')
        if p['layer'] == 'canopy_pct':
            cells.append({'v': p['value'], 'r': ring(g['coordinates'][0])})
        elif p['layer'] == 'forest_pct':
            landcover.append({'code': int(p['value']), 'r': ring(g['coordinates'][0])})
        elif p['layer'] in ('padus', 'nwi'):
            context[p['layer']] = {'support': p['support'], 'meaning': p['meaning'],
                                   'rings': [ring(r) for r in g['coordinates']]}
    by_layer = {l['layer']: l for l in structure['layers']}
    overlap = {o['layer']: o for o in structure['mapped_inventory_overlap']}
    classes = {c['layer']: c for c in structure['provider_feature_class_context']}
    forest = by_layer['forest_pct']
    nwi_context_area = None
    # Context area is the union of the parcel and its 500 m buffer. The release gives the
    # mapped fraction; the mapped area in the brief (3,640.02 m2) is reported as stated there.
    eagle = {
        'schema': 'keystone-eagle-visual/1',
        'derived_from': sorted(k for k in sources if 'eagle' in k or 'candidate' in k),
        'candidate': {
            'id': structure['candidate_id'],
            'parcel_id': parcel['features'][0]['properties']['source_parcel_id'],
            'area_ha': structure['area_ha'],
            'ring': ring(parcel['features'][0]['geometry']['coordinates'][0]),
            'boundary_source': parcel['features'][0]['properties']['boundary_source'],
            'geometry_check_utc': parcel['features'][0]['properties']['geometry_check_utc'],
        },
        'structure': {
            'source_year': forest['source_year'],
            'forest_pct': forest['value'],
            'canopy_pct': by_layer['canopy_pct']['value'],
            'impervious_pct': by_layer['impervious_pct']['value'],
            'cell_centers_inside': forest['cell_centers_inside'],
            'intersecting_cells': forest['intersecting_cells'],
            'class_areas': [{'code': c['code'], 'area_m2': c['area_m2'],
                             'fraction': c['fraction_of_valid_support']} for c in forest['class_areas']],
            'area_crs': forest['area_crs'],
            'grid': forest['grid'],
            'meaning': forest['meaning'],
            'native_independence_established': forest['native_independence_established'],
            'source_urls': {k: by_layer[k]['source_url'] for k in by_layer},
            'source_sha256': {k: by_layer[k]['source_sha256'] for k in by_layer},
        },
        'cells': cells,
        'landcover': landcover,
        'inventory': {
            k: {
                'mapped_overlap_fraction': overlap[k]['mapped_overlap_fraction'],
                'mapped_overlap_area_m2': overlap[k]['mapped_overlap_area_m2'],
                'context_mapped_fraction': overlap[k]['context_mapped_fraction'],
                'buffer_m': overlap[k]['buffer_m'],
                'retrieved_utc': overlap[k]['retrieved_utc'],
                'source_url': overlap[k]['source_url'],
                'source_sha256': overlap[k]['source_sha256'],
                'scope': classes[k]['scope'],
                'features': [f['attributes'] for f in classes[k]['features']],
                **context[k],
            } for k in ('padus', 'nwi')
        },
        'rights': structure['rights'],
        'biological_function': structure['biological_function'],
        'financial_return': structure['financial_return'],
        'interpretation': structure['interpretation'],
        'attribution': structure['attribution'],
        'transformations': structure['transformations'],
        'birds': {
            'scope': birds['scope'],
            'cohort': birds['cohort'],
            'groups': [{
                'name': g['species_name'], 'key': g['species_key'], 'url': g['taxon_url'],
                'n': g['record_count'], 'y0': g['observed_year_range'][0], 'y1': g['observed_year_range'][1],
                'status': sorted(g['provider_taxonomic_status_counts']),
                'flags': {k: v for k, v in g['provider_issue_record_counts'].items()
                          if k in ('TAXON_MATCH_FUZZY', 'TAXON_CONCEPT_ID_NOT_FOUND', 'COORDINATE_ROUNDED')},
            } for g in birds['species_record_groups']],
            'name_interpretation': birds['species_record_groups'][0]['name_interpretation'],
            'attribution': birds['attribution'],
            'method': {k: birds['method'][k] for k in ('taxonomy_interpretation', 'issue_count_interpretation',
                                                       'transformation_notice', 'public_fields_excluded',
                                                       'claim_boundary')},
            'limits': birds['limits'],
        },
    }
    assert len(cells) == 69 and len(landcover) == 5
    assert sum(g['n'] for g in eagle['birds']['groups']) == birds['cohort']['public_design_records'] == 45
    assert len(eagle['birds']['groups']) == birds['cohort']['species_name_groups_in_release'] == 26
    write('eagle.json', eagle)

    # ---- Shared clock: one fixed observed window ------------------------------
    measured_path = ROOT / 'data' / 'events' / 'measured-20210730-20210804.json'
    measured = load(measured_path)
    sources['data/events/measured-20210730-20210804.json'] = sha(measured_path)
    thermal = load(R4 / 'thermal_replay.json')
    series = []
    labels = {'00045': ('Rainfall', 'in per 5 min'), '00060': ('Discharge', 'ft³/s'), '63680': ('Turbidity', 'FNU')}
    for code in ('00045', '00060', '63680'):
        s = next(x for x in measured['series'] if x['station_id'] == '401530105475401' and x['parameter_code'] == code)
        stamps = [parse(p[0]) for p in s['points']]
        cadence = int(s['native_cadence_seconds'])
        if not regular(stamps, cadence):
            raise SystemExit(f'{code}: native timestamps are not on the declared cadence; refusing compact form')
        quals = sorted({q for p in s['points'] for q in (p[2] or [])})
        series.append({'id': code, 'station': '401530105475401', 'label': labels[code][0], 'unit': labels[code][1],
                       'start': s['points'][0][0], 'cadence_s': cadence, 'qualifiers': quals,
                       'values': [p[1] for p in s['points']], 'source_sha256': s['source']['sha256'],
                       'source_url': s['source']['url']})
    for sid, rows in thermal['stations'].items():
        stamps = [parse(r['time_utc']) for r in rows]
        cadence = int((stamps[1] - stamps[0]).total_seconds())
        if not regular(stamps, cadence):
            raise SystemExit(f'{sid}: temperature timestamps are not regular; refusing compact form')
        meta = next(m for m in thermal['public_source_metadata'] if m['station_id'] == sid)
        series.append({'id': '00010', 'station': sid, 'label': 'Water temperature', 'unit': '°C',
                       'start': rows[0]['time_utc'], 'cadence_s': cadence,
                       'qualifiers': sorted({q for r in rows for q in r['qualifiers']}),
                       'status': sorted({r['status'] for r in rows}),
                       'values': [r['value_degC'] for r in rows],
                       'station_name': meta['station_name'], 'station_url': meta['station_url'],
                       'attribution': meta['attribution'], 'transformations': meta['transformations'],
                       'source_sha256': meta['raw_source_sha256']})
    write('clock.json', {
        'schema': 'keystone-clock-visual/1',
        'window': thermal['window'],
        'start': measured['start'], 'end_exclusive': measured['end_exclusive'],
        'station_names': STATION_NAMES,
        'claim_boundary': thermal['claim_boundary'],
        'interpretation': measured['interpretation'],
        'encoding': 'Every native timestamp was checked against the stated cadence before storing start, cadence and values. Null marks a native gap. Nothing is interpolated.',
        'series': series,
    })

    # ---- Daily temperature coverage ------------------------------------------
    daily = load(R4 / 'daily_temperature.json')
    code = {'coverage_qualified_observed_summary': 'q', 'partial_observed_summary': 'p', 'unavailable': 'u'}
    groups = {}
    for r in daily['rows']:
        g = groups.setdefault((r['station_id'], r['year']), {'station': r['station_id'], 'year': r['year'],
                                                             'start': r['utc_date'], 'status': '', 'mean': [],
                                                             'min': [], 'max': [], 'occupied': []})
        expected = parse(g['start'] + 'T00:00:00Z') + datetime.timedelta(days=len(g['status']))
        if parse(r['utc_date'] + 'T00:00:00Z') != expected:
            raise SystemExit('Daily rows are not consecutive UTC dates')
        g['status'] += code[r['status']]
        g['mean'].append(None if r['observed_point_mean_degC'] is None else round(r['observed_point_mean_degC'], 3))
        g['min'].append(r['observed_point_min_degC'])
        g['max'].append(r['observed_point_max_degC'])
        g['occupied'].append(round(r['occupied_fraction'], 4))
    counts = {k: sum(g['status'].count(c) for g in groups.values()) for k, c in
              (('qualified', 'q'), ('partial', 'p'), ('unavailable', 'u'))}
    assert counts == {'qualified': 1040, 'partial': 41, 'unavailable': 209}
    write('thermal-daily.json', {
        'schema': 'keystone-thermal-daily-visual/1',
        'unit': '°C', 'counts': counts, 'station_names': STATION_NAMES,
        'method': {k: daily['method'][k] for k in ('cadence_anchor', 'cadence_seconds', 'claim_boundary',
                                                   'daily_additional_checks', 'daily_minimum_occupied_fraction',
                                                   'maximum_internal_gap_intervals', 'source_epoch', 'summary')},
        'status_codes': {'q': 'coverage-qualified observed summary', 'p': 'partial observed summary', 'u': 'unavailable'},
        'series': [groups[k] for k in sorted(groups)],
        'sources': daily['public_source_metadata'],
    })

    # ---- Grand Lake context: coverage against support -------------------------
    ctx_path = ROOT / 'data' / 'source-context-release.json'
    release = load(ctx_path)
    sources['data/source-context-release.json'] = sha(ctx_path)
    rec = {r['id']: r for r in release['records']}
    names = {'401530105475401': 'North Inlet', '09013500': 'East Inlet'}
    terrain = [{'station': b['station_id'], 'name': names[b['station_id']], 'coverage': b['native_valid_fraction'],
                'reaches_channel': b['state_area_fraction']['1'], 'pit_or_flat': b['state_area_fraction']['2'],
                'edge': b['state_area_fraction']['3'],
                'spacing_m': [b['native_ground_spacing_m']['east_west_range'], b['native_ground_spacing_m']['north_south_range']]}
               for b in rec['native-terrain']['basins']]
    soil = [{'station': b['station_id'], 'name': names[b['station_id']], 'coverage': b['mapped_soil_area_fraction'],
             'kw_supported': b['properties']['kwfact']['fraction_of_basin_supported']} for b in rec['native-soils']['basins']]
    burn = rec['mapped-burn-associated-basins']
    fire = [{'station': b['station_id'], 'name': names[b['station_id']], 'basin_km2': b['associated_basin_area_km2'],
             'fire_km2': b['mapped_fire_intersection_area_km2'], 'fire_fraction': b['mapped_fire_fraction_of_associated_basin'],
             'pixel_centers': b.get('intersection_pixel_centers'), 'unknown_pixels': b.get('unknown_pixels'),
             'class_labels': b.get('class_labels'), 'class_counts': b.get('class_counts')} for b in burn['basins']]
    write('context.json', {'schema': 'keystone-context-visual/1', 'terrain': terrain, 'soil': soil, 'fire': fire,
                           'postimage': burn['postimage'], 'perimeter_revision': burn['perimeter_revision'],
                           'limits': burn['limits']})

    write('ecology.json', ecology_register.build())
    write('graph.json', graph_register.build(eagle, fire[0]['fire_fraction']))
    write('passport.json', passport_register.build(eagle, load(OUT / 'thermal-daily.json'), load(OUT / 'clock.json'), fire[0]['fire_fraction']))
    write('sources.json', {'schema': 'keystone-visual-sources/1',
                           'note': 'SHA256 of every repository-local input read by tools/build-keystone.py.',
                           'inputs_sha256': dict(sorted(sources.items())),
                           'outputs_sha256': {f'data/keystone/{n}': sha(OUT / n) for n in
                                              ('eagle.json', 'clock.json', 'thermal-daily.json', 'context.json', 'ecology.json', 'graph.json', 'passport.json')}})


    # ---- index.html: head + embedded checked parcel + authored body ------------
    embedded = json.dumps(parcel, separators=(',', ':'))
    head = ('<!doctype html>\n<!-- Graph of Life brand v1.0.0 · tokens.json · generated Claude 2026-11-14 -->\n'
            '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Keystone Polygon · Graph of Life</title>'
            '<meta name="description" content="One real Colorado parcel, its living context, the evidence that could show an effect beyond its boundary, and the decision that evidence supports today.">'
            '<link rel="icon" href="assets/favicon.svg">'
            ''
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link rel="stylesheet" href="brand/graph-of-life.css"><link rel="stylesheet" href="brand/runtime.css"><link rel="stylesheet" href="brand/experience.css">'
            f'<link rel="stylesheet" href="css/keystone-base.css?v={VERSION}"><link rel="stylesheet" href="css/keystone-story.css?v={VERSION}">'
            '<script>(function(){var q=new URLSearchParams(location.search);if(q.has("scene")||q.has("forecastCase"))location.replace("evidence.html"+location.search+location.hash);})();</script>'
            f'<script id="embedded-parcel" type="application/json">{embedded}</script>'
            f'<script defer src="js/keystone-stage.js?v={VERSION}"></script><script defer src="js/keystone-gl.js?v={VERSION}"></script><script defer src="js/keystone-flow.js?v={VERSION}"></script><script defer src="js/keystone-charts.js?v={VERSION}"></script><script defer src="js/keystone-ecology.js?v={VERSION}"></script><script defer src="js/keystone-story.js?v={VERSION}"></script>'
            '</head>\n')
    (ROOT / 'index.html').write_text(head + (ROOT / 'tools' / 'index.body.html').read_text())
    for n in ('eagle.json', 'clock.json', 'thermal-daily.json', 'context.json', 'ecology.json', 'passport.json', 'sources.json'):
        print(n, (OUT / n).stat().st_size)


if __name__ == '__main__':
    main()
