/* ============================================================
   Electronic Structure of Graphene Ⅱ — pure physics core.

   No DOM, no globals besides the export. Everything the figures
   and the invariant tests need lives here, so the science can be
   checked head-less (see test/graphene-v2.test.js).

   Lattice constant is taken as a = 1 throughout; energies are in
   units of the hopping t unless a numeric t is passed in.
   ============================================================ */
(function (factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GV2Physics = api;
})(function () {
  'use strict';

  var SQRT3 = Math.sqrt(3);

  /* Nearest-neighbour vectors A→B (a = 1): |δ| = 1/√3, mutually 120°.
     δ1 points up (+y); δ2, δ3 are at 210° and 330°. These are the
     real-space bonds — fixed, they never rotate with k. */
  var DELTA = [
    [0,    1 / SQRT3],
    [-0.5, -1 / (2 * SQRT3)],
    [0.5,  -1 / (2 * SQRT3)]
  ];

  /* The three phases k·δ_j carried by the arrows e^{i k·δ_j}. */
  function phases(kx, ky) {
    return DELTA.map(function (d) { return kx * d[0] + ky * d[1]; });
  }

  /* f(k) = Σ_j e^{i k·δ_j}, returned as real/imag parts and modulus. */
  function fOfK(kx, ky) {
    var re = 0, im = 0;
    for (var j = 0; j < 3; j++) {
      var ph = kx * DELTA[j][0] + ky * DELTA[j][1];
      re += Math.cos(ph);
      im += Math.sin(ph);
    }
    return { re: re, im: im, mod: Math.hypot(re, im) };
  }

  /* Tight-binding bands E = ± t |f(k)|. */
  function bands(kx, ky, t) {
    var m = fOfK(kx, ky).mod;
    return { lower: -t * m, upper: t * m, mod: m };
  }

  /* High-symmetry points of the hexagonal Brillouin zone (a = 1). */
  var RK = 4 * Math.PI / 3;       // |Γ→K|, the corner radius
  var RM = 2 * Math.PI / SQRT3;   // |Γ→M|, the edge-midpoint radius
  var HS = {
    G:  [0, 0],
    K:  [RK, 0],                          // a corner (|f| = 0)
    Kp: [RK * 0.5, RK * SQRT3 / 2],       // the inequivalent corner K′ (|f| = 0)
    M:  [Math.PI, Math.PI / SQRT3]        // edge midpoint between K and K′ (|f| = 1)
  };

  /* Six BZ corners, radius RK, a vertex sitting on +kx. */
  function bzCorners() {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3;
      pts.push([RK * Math.cos(a), RK * Math.sin(a)]);
    }
    return pts;
  }

  /* 1-D ring (chain) dispersion: E(φ) = ε0 − 2t cosφ. */
  function chainE(phi, t, e0) { return (e0 || 0) - 2 * t * Math.cos(phi); }

  /* Allowed phase steps on an N-ring: φ = 2πm/N, m = 0 … N−1. */
  function allowedPhi(N) {
    var out = [];
    for (var m = 0; m < N; m++) out.push(2 * Math.PI * m / N);
    return out;
  }

  /* Gapped Dirac dispersion near K: E± = ±√((ħv_F q)² + m²),
     with m = Δ/2 so that the gap E+ − E− at q = 0 equals Δ. */
  function gappedBand(q, hvf, delta) {
    var m = delta / 2;
    var e = Math.sqrt(hvf * hvf * q * q + m * m);
    return { upper: e, lower: -e, gap: 2 * m };
  }

  /* Density of states of a 2-D Dirac cone: D(E) ∝ |E| (linear, → 0 at E = 0). */
  function diracDOS(E, c) { return (c == null ? 1 : c) * Math.abs(E); }

  return {
    SQRT3: SQRT3,
    DELTA: DELTA,
    HS: HS,
    RK: RK,
    RM: RM,
    phases: phases,
    fOfK: fOfK,
    bands: bands,
    bzCorners: bzCorners,
    chainE: chainE,
    allowedPhi: allowedPhi,
    gappedBand: gappedBand,
    diracDOS: diracDOS
  };
});
