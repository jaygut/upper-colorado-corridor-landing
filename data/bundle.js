/* ============================================================================
   data/bundle.js  ->  window.APP_DATA
   The single source of truth. Every number the landing shows lives here,
   traceable to the upper_colorado_corridor_mvp run outputs and the frozen,
   pre-registered validation record. Seeded (20260507), stamped, reproducible.
   Geometry (window.__GEO, loaded by geo.js first) is merged in at the bottom.
   No em-dashes, per house style.
   ========================================================================== */
window.APP_DATA = {
  _meta: {
    case_id: "upper_colorado_corridor_mvp", engine: "spillover_predictor_v3.0",
    model_card: "keystone_state_space_v0_1", artifact: "v1.7-agent-portal",
    data_mode: "public_live", prereg: "SHA-256 frozen 2026-05-28, before unblinding",
    seed: 20260507, generated_at: "2026-05-28"
  },
  corridor: {
    length_km: 230, bbox: [-109.75, 38.20, -106.05, 39.95],
    catchments: 182, huc8: 20, parcels: 56, zones: 3,
    parcel_provenance: { verified_boundary: 24, public_seed_envelope: 32 }
  },
  zones: [
    { id:"source_headwaters",    label:"Source · headwaters",      elev_ft:"9,000 to 12,000", role:"generate the water",
      camera:{ longitude:-106.42, latitude:39.50, zoom:8.2, pitch:55, bearing:-18 } },
    { id:"connector_mainstem",   label:"Conveyance · mainstem",    elev_ft:"5,500 to 7,500",  role:"convey it",
      camera:{ longitude:-107.70, latitude:39.45, zoom:7.6, pitch:50, bearing:-8 } },
    { id:"demand_valley_canyon", label:"Demand · valley & canyon", elev_ft:"4,500 to 5,500",  role:"consume it",
      camera:{ longitude:-108.90, latitude:38.85, zoom:7.3, pitch:48, bearing:6 } }
  ],
  beneficiaries: {
    count: 16,
    classes: [
      { cls:"Transmountain diversion", k:"transmountain", entities:"Homestake / Aurora Water + Colorado Springs Utilities", profile:"headwaters_transmountain" },
      { cls:"Mainstem operations",     k:"mainstem",      entities:"Shoshone Hydro, Valley View Hospital, Grand River Health", profile:"mainstem_operations" },
      { cls:"Municipal / hospital",    k:"municipal",     entities:"St. Mary's (Grand Junction)", profile:"hospital_municipal" },
      { cls:"Grand Valley ag + urban", k:"grandvalley",   entities:"Ute Water, Grand Valley Water Users, Palisade Irrigation, City of Grand Junction, Colorado Mesa University, Grand Valley agriculture", profile:"grand_valley_ag_urban" },
      { cls:"Moab industrial / cleanup", k:"moab",        entities:"Moab Regional Hospital, Intrepid Potash, UMTRA cleanup, Moab recreation", profile:"moab_industrial_cleanup" },
      { cls:"Canyon recreation",       k:"recreation",    entities:"Loma / Ruby recreation", profile:"recreation_canyon" }
    ],
    caveats: [
      "Homestake routes to Aurora / Colorado Springs, not Denver Water.",
      "Ute Water's primary supply is Plateau Creek / Grand Mesa; the Colorado is backup.",
      "Moab Regional is on municipal wells, not a direct river intake."
    ]
  },
  data_spine: {
    live: true, fixture_fallback: true,
    sources: [
      { src:"USGS NLDI", gives:"coordinate to NHDPlus COMID; upstream/downstream tracing", role:"hydrologic backbone" },
      { src:"USGS NWIS + Water Quality Portal", gives:"gauges + turbidity / SSC / TSS / conductance / flow", role:"evidence + validation" },
      { src:"EPA StreamCat", gives:"forest %, impervious, developed, road density, K-factor", role:"mechanism features" },
      { src:"MRLC / NLCD", gives:"land cover, tree canopy, impervious", role:"mechanism features" },
      { src:"USDA SSURGO", gives:"soil erodibility, hydrologic group", role:"sediment mechanism" },
      { src:"LANDFIRE", gives:"fuel model, fire regime", role:"fire mechanism" },
      { src:"USGS PAD-US / USFWS NWI", gives:"protected-area + wetland adjacency", role:"biodiversity / deployability" },
      { src:"GBIF", gives:"species occurrences 2000 to 2026", role:"biodiversity mechanism" },
      { src:"BLM / USFS / Reclamation", gives:"vegetation & fuel treatment events", role:"intervention ledger" },
      { src:"County parcel services (Eagle, Garfield, Mesa CO; Grand UT)", gives:"real parcel boundaries where an API exists", role:"geometry" }
    ],
    metrics: ["forest_pct","canopy_pct","impervious_pct","riparian_proximity","soil_erodibility","fuel_load","biodiversity_obs","protected_adjacency","wetland_adjacency"],
    evidence_mode: { modeled_overlay: 336, live_comid: 0 }
  },
  model: {
    // Relative ORDER of the mechanisms only. The engine's weight VALUES are internal;
    // the chart renders rank (not magnitude), so no coefficient ships. rank 1 = largest.
    mechanisms: [
      { key:"hydrology_retention", rank:1 }, { key:"timber_resilience",  rank:2 },
      { key:"sediment_avoidance",  rank:3 }, { key:"deployability",       rank:4 },
      { key:"fire_admissibility",  rank:5 }, { key:"microclimate_buffer", rank:6 },
      { key:"biodiversity_support", rank:7 }
    ],
    prior: "Beta(2,2)", mc_draws: "2,000 to 6,000",
    gates: { keystone:0.72, investable:0.80, bad_neighbor:0.55 }
  },
  graph: {
    forward: 255, reverse: 199, both: 44, parcels: 56,
    // provenance corrected to the real run: Eagle County parcels portal, live verified boundary
    top_parcel: { id:"ucc-red_cliff_eagle-03", pk_mean:0.67, zone:"source_headwaters", provenance:"verified_boundary" }
  },
  keystone_ratio: {
    // recomputed from tables/keystone_ranking.csv (56 parcels):
    ci_clearing: { n:4,  of:56, pct:7.1,  def:"posterior credible interval excludes the prior (ci_low > 0.5)" },
    score_cutoff: { n:16, of:56, pct:28.6, def:"keystone_score >= 0.50" },
    band: "23 to 29%", prior_run_pct: 17,
    ci_parcels: "the four Eagle headwaters parcels (the Red Cliff / Eagle River source corridor)"
  },
  validation: {
    stations: 232, min_sampledays: 30, min_years: 5, huc8: 20, catchments: 182, wqp_pool: 18048,
    bar: "spatially-robust |rho| >= 0.30, permutation p < 0.05, correct sign, partial |rho| >= 0.20, and it must beat the best single public metric",
    in_sample: [
      { outcome:"Turbidity (primary)",         n:45,  rho:-0.329, p:0.026 },
      { outcome:"Suspended sediment (SSC)",    n:38,  rho:-0.373, p:0.021 },
      { outcome:"Total suspended solids (TSS)",n:63,  rho:-0.424, p:0.001 },
      { outcome:"Specific conductance",        n:140, rho:-0.478, p:0.0005 }
    ],
    beaten_by_baseline: { forest_only_rho:-0.391, composite_rho:-0.329 },
    confounded: { before:-0.329, after_partial:-0.047, controls:"elevation + % developed" },
    oof_target: "leave-one-HUC8-out prediction of log-turbidity, n = 45",
    oof: [
      { set:"Elevation + % developed only",   r2: 0.403, kind:"baseline" },
      { set:"Forest % only",                  r2:-0.375, kind:"single" },
      { set:"Hand-set sediment_avoidance",    r2:-0.398, kind:"model" },
      { set:"All mechanism features (refit)", r2:-1.017, kind:"model" },
      { set:"Mechanism features + confounders", r2: 0.270, dr2:-0.13, kind:"model" }
    ],
    verdict: "associated_not_incremental", strength: "WEAK",
    diagnosis: "The bottleneck is the FEATURES, not the weights. Their relationship to water quality is spatially non-stationary; it does not transfer to a new sub-basin, which is exactly the property a screening tool most needs.",
    hydrology: { outcome:"baseflow index", verdict:"not_supported",
      why:"the forest-based retention score peaks in high-elevation snowmelt headwaters, which are hydrologically flashier (lower baseflow), so the mechanism points the wrong way for that outcome" },
    // real precision-weighted Gaussian update in logit space (the engine's calibration
    // module): obs_sd = MAX_SD - (MAX_SD-BASE_SD)*sqrt(clip(oof_r2,0,1)).
    // The widget recomputes the posterior LIVE from these parameters (not interpolated).
    recal: { mechanism:"sediment_avoidance", oof_r2:0.0,
      prior_p:0.54, prior_sd:0.82, mech_value:0.70,
      synth_sd:0.678, calib_sd:1.40, base_sd:0.45, max_sd:1.40,
      before:0.638, after:0.583, prior:0.54,
      note:"synthetic overconfident observation noise replaced with noise tied to measured out-of-sample skill" }
  },
  ledger: {
    partner_summary: "This run proves the engine; it does not yet prove investability lift.",
    proven: [
      "The full pipeline runs end-to-end on one command.",
      "A bidirectional graph from one model: 255 forward, 199 reverse, 44 matched both ways.",
      "Keystone posteriors with real credible intervals.",
      "The keystone-candidate ratio (about 23 to 29% at keystone_score >= 0.50) replicated in-band on a second, independent corridor.",
      "Concurrent validity tested against 232 real monitoring stations.",
      "The engine failed its own QA and said so."
    ],
    not_proven: [
      "The 56 units are candidate zone-parcels, not diligence-ready parcels (24 verified boundary, 32 seed envelope).",
      "Mechanism evidence is fixture / modeled-overlay (336 modeled-overlay; live COMID count = 0).",
      "diligence_ready_candidates: 0; causal_gate_eligible_interventions: 0.",
      "No natural cap rate or dollar-at-risk computed.",
      "No mechanism yet clears validated_incremental.",
      "Investability bite (one real parcel, one verified payor, one dollar) is the stated next step."
    ]
  },
  // The settlement layer (BASIN Certificates of Ensurance). PLACEHOLDER: the rail is wired to
  // the run's real situs keys (place_id / binder_asset_id from ensurance_places_normalized +
  // binder_crosswalk), but the on-chain layer is fixture (0x routing reserved). Nothing is for
  // sale; an instrument appears only where a polygon clears MRV and a live contract is deployed.
  instruments: {
    settlement: "BASIN Certificate of Ensurance",
    settlement_url: "https://ensurance.app/basin",
    chain: "Base",
    placeholder_address: "0x0000000000000000000000000000000000000000",
    purpose: "stewardship-finance-readiness",
    // BASIN's Natural Cap Rate = Ecosystem Service Value / Real Estate Value; our engine rates
    // the ESV-leverage side, which is exactly the "distance to a dollar" the ledger names.
    natural_cap_rate: "Ecosystem Service Value / Real Estate Value",
    summary: { situs: 56, binder_registered: 16, live: 0, mrv_cleared: 0 },
    // the slot shown on the keystone tear-sheet (the top-ranked polygon)
    top_parcel_slot: {
      place_id: "place-red_cliff_eagle-03",
      place_binder: "binder-red_cliff_eagle-01",
      place_label: "Red Cliff / Eagle headwaters",
      status: "slot_ready",       // slot_ready | awaiting_mrv | live
      status_label: "Slot ready"
    }
  }
};

/* --- merge the real geometry + out-of-sample arrays (from geo.js) ------ */
(function () {
  var G = window.__GEO;
  if (!G) { window.APP_DATA._geo_missing = true; return; }
  window.APP_DATA.geo = G;
  window.APP_DATA.validation.oof_scatter = G.oof_scatter;
  if (window.__HYDRO) G.hydro = window.__HYDRO;   // real USGS WBD + NHDPlus HR
})();
