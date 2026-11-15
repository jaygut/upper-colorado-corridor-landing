# Keystone Polygon experience

A scroll-driven story about one real parcel in Eagle County, Colorado, published at
https://jaygut.github.io/upper-colorado-corridor-landing/.

A Keystone Polygon is a parcel whose condition and position shape what happens to people and places well
beyond its boundary, a name it earns only when an active function, a pathway across the boundary and a
recipient who would feel its loss have each been shown. No Colorado parcel is validated as one.

The story shows the parcel as a node in a dependency graph that runs from land to obligation, and marks each
piece of evidence as computed, observed, tested, published elsewhere, illustrative, pending or assessed. Each
scene keeps its method, limits and sources in labelled expanders. The landscape scenes are computed in the
reader's browser from public terrain tiles and from USGS land cover and USDA Forest Service tree canopy.

- `index.html` is the story, in ten chapters. `?chapter=ID&step=ID` opens a scene directly.
- `passport.html` is the candidate file.
- `review.html` is the historical monitoring budget review.
- `evidence.html` and `legacy.html` are earlier releases, kept for the record.
- `llms.txt` is a plain-text summary of the release for agents.

## Checking the records

`review.html` recomputes the SHA-256 of each monitoring record it loads and marks it verified only when the hash
matches the value in `js/review.js`. The round-two display records in `data/` name their models and policies
descriptively, and their provenance says so. The frozen evaluation records behind them keep their internal
identifiers.

## Viewing it locally

Serve this folder with any static server, for example `python3 -m http.server 8000`, then open
http://localhost:8000/. The live landscape layers need network access to the public terrain and land-cover
services.

## Records and methods

The quantitative framework behind the figures belongs to Graph of Life. The pages draw on display versions of some
of its records that hold only what the pages show, and its methods and complete records are held privately.

Contact · jg@graphoflife.com · https://biome-translator.emergent.host/
