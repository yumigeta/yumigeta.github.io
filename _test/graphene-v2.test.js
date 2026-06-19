/* Invariant tests for the graphene Ⅱ figure physics.
   Run head-less:  node test/graphene-v2.test.js
   Exits non-zero on the first failure. No test framework needed. */
'use strict';

var P = require('../assets/js/graphene-v2-physics.js');

var fails = 0;
function ok(name, cond) {
  if (cond) { console.log('  ✓ ' + name); }
  else { console.error('  ✗ ' + name); fails++; }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1e-9 : tol); }

console.log('f(k) at the high-symmetry points');
ok('Γ : |f| = 3.000',           near(P.fOfK(P.HS.G[0],  P.HS.G[1]).mod, 3, 1e-12));
ok('K : |f| < 1e-6',            P.fOfK(P.HS.K[0],  P.HS.K[1]).mod  < 1e-6);
ok("K': |f| < 1e-6",            P.fOfK(P.HS.Kp[0], P.HS.Kp[1]).mod < 1e-6);
ok('M : |f| = 1.000',           near(P.fOfK(P.HS.M[0],  P.HS.M[1]).mod, 1, 1e-12));

console.log('three δ are equal length and 120° apart');
(function () {
  var d = P.DELTA, len = d.map(function (v) { return Math.hypot(v[0], v[1]); });
  ok('|δ| equal & = 1/√3', near(len[0], 1 / P.SQRT3) && near(len[1], len[0]) && near(len[2], len[0]));
  function ang(v) { return Math.atan2(v[1], v[0]); }
  function sep(i, j) { var x = ((ang(d[i]) - ang(d[j])) * 180 / Math.PI % 360 + 540) % 360 - 180; return Math.abs(x); }
  ok('δ pairwise 120°', near(sep(0, 1), 120, 1e-9) && near(sep(1, 2), 120, 1e-9) && near(sep(2, 0), 120, 1e-9));
})();

console.log('bands E = ± t |f|');
(function () {
  var t = 2.8, k = [0.7, 0.4], b = P.bands(k[0], k[1], t), m = P.fOfK(k[0], k[1]).mod;
  ok('E_upper = +t|f|', near(b.upper,  t * m));
  ok('E_lower = −t|f|', near(b.lower, -t * m));
  ok('split = 2t|f|',   near(b.upper - b.lower, 2 * t * m));
})();

console.log('chain dispersion E(φ) = ε0 − 2t cosφ');
(function () {
  var t = 2.8;
  ok('E(0)  = −2t', near(P.chainE(0, t, 0), -2 * t));
  ok('E(π)  = +2t', near(P.chainE(Math.PI, t, 0), 2 * t));
  [4, 6, 8, 12, 20, 40, 80].forEach(function (N) {
    var phi = P.allowedPhi(N);
    var good = phi.length === N && phi.every(function (p, m) { return near(p, 2 * Math.PI * m / N); });
    ok('φ = 2πm/N for N=' + N + ' (and N ≥ 4)', good && N >= 4);
  });
})();

console.log('gapped Dirac: gap = |Δ|, asymptote → linear');
(function () {
  var hvf = 1;
  [0, 0.2, 0.5, 1].forEach(function (D) {
    ok('gap = Δ for Δ=' + D, near(P.gappedBand(0, hvf, D).upper - P.gappedBand(0, hvf, D).lower, D));
  });
  ok('Δ=0 ⇒ exactly linear', near(P.gappedBand(0.37, hvf, 0).upper, hvf * 0.37));
  var big = P.gappedBand(1000, hvf, 0.5);
  ok('large q ⇒ hyperbola → hvf·q', near(big.upper, hvf * 1000, 1e-3));
})();

console.log('Dirac DOS: D(E) ∝ |E|, D(0) = 0');
(function () {
  ok('D(0) = 0',         near(P.diracDOS(0, 2), 0));
  ok('linear: D(2E)=2D', near(P.diracDOS(0.4, 3), 2 * P.diracDOS(0.2, 3)));
  ok('symmetric in ±E',  near(P.diracDOS(-0.31, 5), P.diracDOS(0.31, 5)));
})();

console.log(fails ? '\nFAILED: ' + fails + ' assertion(s)' : '\nAll invariants hold.');
process.exit(fails ? 1 : 0);
