"""The dependency graph behind the Keystone Polygon story.

Every node and edge restates something the story already shows, with the same evidence status
and a pointer to the scene and the public file or reference that carries it. Nothing here is a
new measurement. The layout coordinates are a fixed drawing in a 1000 x 650 space.

Status vocabulary. It follows the scene tags, with failed split out from tested and without the
Illustrative tag, because no illustrative figure enters the graph:
  computed   produced by the framework from public data
  observed   instrument, observer or agency mapping records
  tested     scored against held-back observations and held
  failed     scored against held-back observations and failed
  published  peer-reviewed or agency findings from other places, unmeasured here
  pending    awaiting observation, tracing or a named party
"""

DOMAINS = [
    {'id': 'land', 'label': 'Land', 'chain': 'polygon', 'x': 55},
    {'id': 'life', 'label': 'Living community', 'short': 'Living community', 'chain': 'process', 'x': 185},
    {'id': 'process', 'label': 'Ecosystem process', 'short': 'Process', 'chain': 'process', 'x': 335},
    {'id': 'pathway', 'label': 'Pathway', 'chain': 'effect', 'x': 490},
    {'id': 'recipient', 'label': 'Recipient', 'chain': 'beneficiary', 'x': 645},
    {'id': 'consequence', 'label': 'Consequence', 'short': 'Consequence', 'chain': 'consequence', 'x': 795},
    {'id': 'obligation', 'label': 'Obligation', 'chain': 'obligation', 'x': 945},
    {'id': 'signal', 'label': 'Measured signal', 'chain': 'signal', 'x': None},
]

STATUS = {
    'computed': 'Produced by the framework from public data.',
    'observed': 'Instrument, observer or agency mapping records.',
    'tested': 'Scored against observations held back from fitting, and held.',
    'failed': 'Scored against observations held back from fitting, and failed.',
    'published': 'Findings from other places, unmeasured on this parcel.',
    'pending': 'Awaiting observation, tracing or a named party.',
}


LP = {'canopy': 't', 'structure': 't', 'route': 'r', 'eagle': 'l', 'gauge': 'r', 'parcel': 'b'}


def N(id, label, lines, domain, x, y, status, evidence, scene):
    return {'id': id, 'label': label, 'lines': lines, 'domain': domain, 'x': x, 'y': y, 'lp': LP.get(id, 'b'),
            'status': status, 'evidence': evidence, 'scene': scene}


def E(a, b, kind, status, basis, scene, refs=(), files=()):
    # 'files' names the record behind an edge for the private register. It is left out of the published graph.
    return {'id': a + '>' + b, 'from': a, 'to': b, 'kind': kind, 'status': status, 'basis': basis,
            'scene': scene, 'refs': list(refs)}


def build(eagle, fire_fraction):
    s = eagle['structure']
    co = eagle['birds']['cohort']
    forest = f"{s['forest_pct']:.1f}%"
    canopy = f"{s['canopy_pct']:.1f}%"
    records, groups = co['public_design_records'], co['species_name_groups_in_release']
    E_FILE, P_FILE, EV = 'data/keystone/eagle.json', 'data/keystone/passport.json', 'data/experience-evidence.json'

    nodes = [
        # land
        N('parcel', 'Eagle parcel', ['Eagle', 'parcel'], 'land', 55, 262, 'observed',
          f"County parcel {eagle['candidate']['parcel_id']}, {eagle['candidate']['area_ha']:.3f} ha, boundary checked against the county record.", 'polygon:define'),
        N('disturb', 'Fire or die-off', ['Fire or', 'die-off'], 'land', 55, 520, 'published',
          'No fire, erosion or die-off record exists for the parcel. The disturbance cases come from Hubbard Brook, Colorado beetle-kill watersheds and the South Platte fires.', 'engine:soil'),
        # living community
        N('flowers', 'Flowering understory', ['Flowering', 'understory'], 'life', 170, 66, 'pending', 'No plant list exists for the parcel.', 'engine:soil'),
        N('bees', 'Native pollinators', ['Native', 'pollinators'], 'life', 255, 128, 'pending', 'No pollinator has been recorded on the parcel.', 'engine:wing'),
        N('birds', 'Birds', ['Birds'], 'life', 185, 198, 'observed',
          f"{records} publishable records and {groups} species names within 1 km, none inside the parcel.", 'living:composition'),
        N('canopy', 'Forest canopy', ['Forest', 'canopy'], 'life', 185, 322, 'computed',
          f"Forest class covers {forest} of the parcel and mean canopy cover is {canopy} (NLCD {s['source_year']}).", 'living:structure'),
        N('fungi', 'Mycorrhizal fungi', ['Mycorrhizal', 'fungi'], 'life', 185, 400, 'pending', 'No soil sample has been taken on the parcel.', 'engine:soil'),
        N('microbes', 'Soil microbes', ['Soil', 'microbes'], 'life', 185, 470, 'pending', 'No soil sample has been taken on the parcel.', 'engine:soil'),
        # processes
        N('connect', 'Habitat connectivity', ['Habitat', 'connectivity'], 'process', 335, 198, 'pending', 'The habitat network around the parcel is unmapped.', 'engine:corridor'),
        N('structure', 'Soil structure', ['Soil', 'structure'], 'process', 335, 330, 'pending', 'Unmeasured on the parcel.', 'engine:soil'),
        N('storage', 'Infiltration and storage', ['Infiltration', 'and storage'], 'process', 335, 405, 'pending', 'Unmeasured on the parcel.', 'engine:soil'),
        N('carbon', 'Soil carbon', ['Soil', 'carbon'], 'process', 335, 475, 'pending', 'Unmeasured on the parcel.', 'engine:soil'),
        # pathways
        N('flight', 'Flight range', ['Flight', 'range'], 'pathway', 490, 110, 'published',
          'Pooled crop studies put native pollinator visits at half their near-habitat level about 0.6 km out and richness at half about 1.5 km out.', 'engine:wing'),
        N('patches', 'Neighbouring habitat', ['Neighbouring', 'habitat'], 'pathway', 490, 198, 'pending', 'Surrounding patches are unmapped.', 'engine:corridor'),
        N('route', 'Terrain route', ['Terrain', 'route'], 'pathway', 490, 262, 'computed',
          'Steepest descent from the parcel on 30 m public elevation tiles, computed in the browser. Shape of the surface only.', 'spillover:flow'),
        N('eagle', 'Eagle River', ['Eagle', 'River'], 'pathway', 490, 345, 'observed', 'Mapped river network (USGS NHDPlus HR), drawn as context.', 'spillover:define'),
        N('colorado', 'Colorado River', ['Colorado', 'River'], 'pathway', 490, 430, 'observed', 'Mapped river network. The Eagle River joins the Colorado downstream of the parcel.', 'measured:transit'),
        N('sediment', 'Sediment and solutes in water', ['Sediment', 'and solutes'], 'pathway', 490, 520, 'published',
          'Measured after disturbance in three other forests. Unmeasured below the parcel.', 'engine:soil'),
        # recipients
        N('growers', 'Growers and gardeners', ['Growers and', 'gardeners'], 'recipient', 645, 110, 'pending', 'No flowering crop or garden has been mapped within flight range.', 'spillover:ledger'),
        N('wildlife', 'Wildlife and land managers', ['Wildlife and', 'managers'], 'recipient', 645, 198, 'pending', 'No species or manager has been identified as depending on this patch.', 'spillover:ledger'),
        N('utility', 'Drinking-water utility', ['Drinking-water', 'utility'], 'recipient', 645, 345, 'pending', 'No intake has been traced from the parcel and no utility named.', 'spillover:ledger'),
        N('users', 'River users downstream', ['River users', 'downstream'], 'recipient', 645, 430, 'pending', 'Delivery from the parcel to any downstream user is untraced.', 'spillover:ledger'),
        N('reservoir', 'Reservoir operator', ['Reservoir', 'operator'], 'recipient', 645, 520, 'pending', 'No reservoir has been linked to the parcel.', 'spillover:ledger'),
        # consequences
        N('yield', 'Crop yield', ['Crop', 'yield'], 'consequence', 795, 110, 'published', 'Shown for coffee beside forest in Costa Rica. Unmeasured here.', 'engine:wing'),
        N('movement', 'Biodiversity retained', ['Biodiversity', 'retained'], 'consequence', 795, 198, 'published', 'Shown in fragmentation experiments elsewhere. Unmeasured here.', 'engine:corridor'),
        N('treat', 'Treatment cost', ['Treatment', 'cost'], 'consequence', 795, 345, 'published', 'Shown in a survey of 27 U.S. water suppliers. No figure exists for this parcel.', 'spillover:ledger'),
        N('cleanup', 'Cleanup and repair cost', ['Cleanup', 'cost'], 'consequence', 795, 520, 'published', 'Reported by Denver Water after two fires. No figure exists for this parcel.', 'spillover:ledger'),
        N('budget', 'Monitoring budget', ['Monitoring', 'budget'], 'consequence', 830, 612, 'computed', 'Proposed windows multiplied by a cost per visit that the reader supplies.', 'windows:windows'),
        # obligation
        N('payer', 'Payer and payment rule', ['Payer and', 'payment rule'], 'obligation', 945, 300, 'pending', 'No rights record, payer, payment rule or agreement exists for this candidate.', 'obligation:ladder'),
        # measured signals
        N('north', 'North Inlet record', ['North Inlet', 'record'], 'signal', 250, 612, 'observed',
          'Rain, flow, turbidity and water temperature at a separate station about 100 km away. No link joins it to the parcel.', 'clock:clock'),
        N('forecast', 'Six-hour forecast', ['Six-hour', 'forecast'], 'signal', 385, 612, 'tested', 'Lowered error by 6.84% across 1,014 held-back windows at North Inlet.', 'forecast:forecast'),
        N('gauge', 'Glenwood gauge', ['Glenwood', 'gauge'], 'signal', 562, 588, 'observed', 'USGS station 09071750 on the Colorado River, about 79 km west of the parcel.', 'measured:transit'),
        N('windows', 'Monitoring windows', ['Monitoring', 'windows'], 'signal', 700, 612, 'computed', 'Two policies proposed 38 and 46 windows at North Inlet, and 8 and 10 at Glenwood.', 'windows:windows'),
    ]

    edges = [
        # what the land holds
        E('parcel', 'canopy', 'structure', 'computed', f"Forest class covers {forest} of the parcel, read from {s['cell_centers_inside']} mapped cells.", 'living:structure', files=[E_FILE]),
        E('parcel', 'birds', 'organisms', 'pending', f"{records} public records in {groups} species names lie within 1 km and none inside the boundary, so use of the parcel itself is unrecorded.", 'living:composition', files=[E_FILE]),
        E('parcel', 'flowers', 'organisms', 'pending', 'No plant list exists, so the flowering community is unknown.', 'engine:unseen', files=[P_FILE]),
        # below ground
        E('canopy', 'fungi', 'carbon', 'published', 'Trees send part of the carbon they fix to the fungi on their roots.', 'engine:soil', refs=['vdh2008']),
        E('canopy', 'microbes', 'carbon', 'published', 'Litter feeds the decomposers that cycle nutrients.', 'engine:soil', refs=['vdh2008', 'wagg2014']),
        E('fungi', 'structure', 'structure', 'published', 'Fungal threads bind soil particles into stable aggregates.', 'engine:soil', refs=['rillig2006']),
        E('fungi', 'carbon', 'carbon', 'published', 'Roots and root-associated microbes supplied 50 to 70% of stored soil carbon on boreal islands.', 'engine:soil', refs=['clem2013']),
        E('structure', 'storage', 'water', 'published', 'Aggregates give soil the pore structure through which water enters and is held.', 'engine:soil', refs=['rillig2006']),
        E('fungi', 'flowers', 'nutrients', 'published', 'In the few plants tested, root fungi changed how often pollinators visited.', 'engine:soil', refs=['wolfe2005', 'gange2005', 'barber2015']),
        # water
        E('storage', 'route', 'water', 'pending', 'No infiltration, runoff or water quality has been measured on the parcel.', 'spillover:flow', files=[P_FILE]),
        E('parcel', 'route', 'structure', 'computed', 'A steepest-descent trace leaves the parcel and is computed in the browser.', 'spillover:flow', files=['js/keystone-flow.js']),
        E('route', 'eagle', 'structure', 'computed', 'The trace reaches gentler valley ground and follows the Eagle River corridor. Terrain geometry only.', 'spillover:node', files=['js/keystone-flow.js']),
        E('eagle', 'colorado', 'water', 'observed', 'The mapped river network joins the Eagle River to the Colorado River.', 'measured:transit', files=['data/hydro.js']),
        E('eagle', 'utility', 'water', 'pending', 'No intake has been traced and no utility named.', 'spillover:ledger', files=[P_FILE]),
        E('utility', 'treat', 'money', 'published', 'Treatment cost was about 20% lower for every 10% more forest in the source watershed, up to about 60% cover, across 27 U.S. suppliers.', 'spillover:ledger', refs=['ernst2004']),
        E('treat', 'payer', 'money', 'pending', 'No recipient, payer or payment rule exists.', 'obligation:ladder', files=[P_FILE]),
        E('colorado', 'users', 'water', 'published', 'The Colorado River system supplies municipal water to nearly 40 million people. Delivery from the parcel is untraced.', 'spillover:ledger', refs=['usbr2021']),
        # pollination
        E('flowers', 'bees', 'organisms', 'published', 'Flowering plants supply the nectar and pollen that wild pollinators live on, and an estimated 87.5% of flowering plant species are pollinated by animals in return.', 'engine:soil', refs=['ollerton2011']),
        E('bees', 'flight', 'organisms', 'published', 'Native pollinator visits halve about 0.6 km from natural habitat in pooled crop studies.', 'engine:wing', refs=['ricketts2008', 'greenleaf2007']),
        E('flight', 'growers', 'organisms', 'pending', 'No flowering crop or garden has been mapped within flight range.', 'spillover:ledger', files=[P_FILE]),
        E('growers', 'yield', 'money', 'published', 'Coffee within 1 km of forest yielded 20% more on one Costa Rican farm.', 'engine:wing', refs=['ricketts2004']),
        E('yield', 'payer', 'money', 'pending', 'No recipient, payer or payment rule exists.', 'obligation:ladder', files=[P_FILE]),
        # habitat
        E('birds', 'connect', 'organisms', 'pending', 'Records show presence nearby and say nothing about movement through the parcel.', 'engine:corridor', files=[E_FILE]),
        E('connect', 'patches', 'organisms', 'pending', 'The habitat network is unmapped, so the stepping-stone role is unknown.', 'engine:corridor', files=[P_FILE]),
        E('patches', 'wildlife', 'organisms', 'pending', 'No dependent species or manager has been identified.', 'spillover:ledger', files=[P_FILE]),
        E('wildlife', 'movement', 'organisms', 'published', 'In fragmentation experiments isolated patches lost 13 to 75% of their biodiversity, the loss that connected habitat is managed to avoid.', 'engine:corridor', refs=['haddad2015', 'gilbert2010']),
        E('movement', 'payer', 'money', 'pending', 'No recipient, payer or payment rule exists.', 'obligation:ladder', files=[P_FILE]),
        # disturbance, the same graph carrying a risk
        E('disturb', 'canopy', 'risk', 'published', 'Clear-cutting, beetle kill and wildfire each removed a canopy in the published cases.', 'engine:soil', refs=['likens1970', 'mikk2013', 'denver27']),
        E('structure', 'sediment', 'risk', 'published', 'After two fires, storms carried sediment and debris off burned slopes and into a water supply.', 'engine:soil', refs=['denver27']),
        E('microbes', 'sediment', 'risk', 'published', 'After an experimental clear-cut, stream nitrate rose about 41-fold in the first year.', 'engine:soil', refs=['likens1970']),
        E('carbon', 'sediment', 'risk', 'published', 'Below beetle-killed forest, treatment plants recorded more organic carbon and more disinfection byproducts.', 'engine:soil', refs=['mikk2013']),
        E('sediment', 'reservoir', 'risk', 'published', 'Storms carried sediment and debris into Denver Water’s supply after two fires.', 'spillover:ledger', refs=['denver27']),
        E('reservoir', 'cleanup', 'money', 'published', 'The utility reports more than US$27 million spent on cleanup and repairs.', 'spillover:ledger', refs=['denver27']),
        E('cleanup', 'payer', 'money', 'pending', 'Elsewhere, partners have committed about US$96 million to forest work upstream since 2010. No such payer exists for this parcel.', 'spillover:ledger', refs=['denver']),
        # measured signals and the monitoring decision
        E('colorado', 'gauge', 'information', 'pending', 'The station lies downstream on the Colorado, and delivery from the parcel is untraced and untested.', 'measured:transit', files=['data/keystone/results.json']),
        E('north', 'forecast', 'information', 'tested', 'A frozen model lowered six-hour turbidity error by 6.84% across 1,014 held-back windows.', 'forecast:forecast', files=[EV]),
        E('forecast', 'windows', 'information', 'failed', 'The learned policy proposed 46 windows against 38 and failed promotion.', 'windows:windows', files=[EV]),
        E('gauge', 'windows', 'information', 'failed', 'The Glenwood classifier proposed 10 windows against 8 and failed its joint gate.', 'windows:windows', files=[EV]),
        E('windows', 'budget', 'money', 'computed', 'Every proposed window is priced to the cent at a cost the reader supplies.', 'windows:windows', files=[EV]),
        E('budget', 'payer', 'money', 'pending', 'A monitoring budget exists as a calculation. No payer has accepted it.', 'obligation:ladder', files=[P_FILE]),
        # the loop
        E('payer', 'parcel', 'money', 'pending', 'An obligation could fund care of the land. No agreement exists.', 'obligation:ladder', files=[P_FILE]),
    ]

    def road(id, label, question, seq, extra=(), note=''):
        ids = [a + '>' + b for a, b in zip(seq, seq[1:])] + list(extra)
        known = {e['id'] for e in edges}
        missing = [i for i in ids if i not in known]
        if missing:
            raise SystemExit(f'graph road {id}: unknown edges {missing}')
        extra_nodes = [n for i in extra for n in i.split('>') if n not in seq]
        return {'id': id, 'label': label, 'question': question, 'nodes': seq + sorted(set(extra_nodes), key=extra_nodes.index), 'edges': ids, 'note': note}

    roads = [
        road('water', 'Water quality', 'Does the condition of this soil reach a treatment plant?',
             ['parcel', 'canopy', 'fungi', 'structure', 'storage', 'route', 'eagle', 'utility', 'treat', 'payer', 'parcel'],
             note='The terrain route is computed and the river is mapped, the soil mechanism is published science from other places, and four links are open, since nothing has been measured in the soil, no intake has been traced, nobody has been named to pay and no agreement returns care to the land.'),
        road('pollination', 'Pollination', 'Do insects nesting here serve flowering land nearby?',
             ['parcel', 'flowers', 'bees', 'flight', 'growers', 'yield', 'payer', 'parcel'],
             note='Three links are known from other places and four are open, beginning with the plant list.'),
        road('habitat', 'Habitat network', 'Is this patch a stepping stone for species that cross the valley?',
             ['parcel', 'birds', 'connect', 'patches', 'wildlife', 'movement', 'payer', 'parcel'],
             note='The bird records are real and lie nearby, and every link from the parcel onward waits for a survey on the ground and a map of the habitat around it.'),
        road('disturbance', 'Disturbance risk', 'What travels downstream if the canopy is lost?',
             ['disturb', 'canopy', 'fungi', 'structure', 'sediment', 'reservoir', 'cleanup', 'payer'], extra=['microbes>sediment', 'carbon>sediment'],
             note='The outer links were seen together in one place, where sediment reached a utility’s supply after two fires and the utility and its partners later committed money to forest work upstream. The soil links come from other studies, and for this parcel none of it has been observed.'),
        road('monitoring', 'Monitoring signal', 'Could a downstream gauge tell us when to look?',
             ['parcel', 'route', 'eagle', 'colorado', 'gauge', 'windows', 'budget', 'payer'], extra=['north>forecast', 'forecast>windows'],
             note='The route is the shape of the surface, the gauges are real instruments and North Inlet is a separate place. One forecast held on held-back data, two policies failed their tests, and the link between this parcel and the Glenwood gauge has never been traced.'),
    ]
    used = {e for r in roads for e in r['edges']}
    return {
        'schema': 'keystone-dependency-graph/1',
        'release': 'Keystone Polygon experience R6, 14 Nov 2026',
        'subject': {'candidate_id': eagle['candidate']['id'], 'parcel_id': eagle['candidate']['parcel_id'], 'area_ha': round(eagle['candidate']['area_ha'], 3)},
        'scope': 'A restatement of the story as a graph. Every node and edge carries the status the story gives it. Published edges describe other places and are unmeasured on the Eagle parcel. No edge is a new measurement.',
        'status_vocabulary': STATUS,
        'kinds': ['structure', 'organisms', 'carbon', 'nutrients', 'water', 'risk', 'information', 'money'],
        'domains': DOMAINS,
        'nodes': nodes,
        'edges': edges,
        'roads': roads,
        'counts': {'nodes': len(nodes), 'edges': len(edges), 'roads': len(roads),
                   'edges_by_status': {k: sum(e['status'] == k for e in edges) for k in STATUS},
                   'edges_on_no_road': sorted(e['id'] for e in edges if e['id'] not in used)},
    }
