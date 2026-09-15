# Graphene Raman source and data

The six bilingual learn/graphene-raman-*/index.html files are the article sources.
Edit their HTML directly, as for the other Learn pages. No article generator or
intermediate Python manuscript remains. The normal site build localizes these
sources; it never rewrites them.

Figures use native Canvas in assets/js/graphene-raman-views.js, numerical models
in graphene-raman-core.js, and physical controls in graphene-raman-ui.js.
They read the shared CSS tokens and bands-series.css figure components.
The UI loads datasets.json directly; there is no duplicate JavaScript dataset.

## Provenance

datasets.json retains source URLs, manuscript hashes, figure numbers, numerical
digitization calibrations, normalization, model conventions and missing conditions
as null. Experimental coordinates are digitized manuscript curves, not instrument
raw data.

- Ferrari et al. (2006), Fig. 2(a,b,c,e): 514 nm overview and layer series,
  633 nm monolayer comparison, and the published bilayer decomposition.
- Cançado et al. (2011), Fig. 1: 514.5 nm spectra at the labelled defect spacings
  2, 5, 7, 14 and 24 nm.
- Quantum ESPRESSO 7.5 + Phonopy 4.5.0: the single-layer vibration map and
  unstrained Γ-point mode gallery use the calculation in the workspace sibling
  `qe-phonopy-graphene/band.yaml` (PBE/PAW, 5 × 5 × 1 supercell, fixed 2.46 Å
  lattice constant). The 301 distinct Γ–K–M–Γ nodes retain all six frequencies
  and complex eigenvectors. The dataset records the input hash, unit and
  coordinate conversions, branch tracking and numerical-degeneracy convention.
  Displacements use the full complex time phase. Display amplitudes and time
  scales are illustrative; strain and interlayer modes remain separate models.

The source records distinguish measured curves, published fits, empirical
calibrations and illustrative calculations. Original PDFs and figure images
are not included in this repository. Citations appear beside the relevant figures.

article-manifest.json is a validation inventory, not an article source.
Update its figure configuration and equation lists when directly editing HTML.

## Validation

From the repository root, with Python 3.10+ and Node available:

    node tools/graphene_raman/physics.test.cjs
    node tools/graphene_raman/validate_math.cjs PATH_TO_KATEX_MODULE
    python tools/build_site.py
    python tools/validate_site.py
    python tools/graphene_raman/validate_articles.py
    python tools/test_sitemap.py

The physics test checks physical limits and renders all control extrema through
the same Canvas drawing functions. The KaTeX check requires a local module.
The normal site build uses only the Python standard library.
All six pages remain unpublished drafts.
