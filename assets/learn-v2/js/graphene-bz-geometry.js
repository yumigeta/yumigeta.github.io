/* G01's normalized, y-up reciprocal-space convention: |K| = 1. */
(function (root) {
  'use strict';
  const point = (r, angle) => Object.freeze([r * Math.cos(angle), r * Math.sin(angle)]);
  const corners = Object.freeze(Array.from({ length: 6 }, (_, i) => point(1, i * Math.PI / 3)));
  const midpoints = Object.freeze(Array.from({ length: 6 }, (_, i) => point(Math.sqrt(3) / 2, Math.PI / 6 + i * Math.PI / 3)));
  const nearestReciprocal = Object.freeze(Array.from({ length: 6 }, (_, i) => point(Math.sqrt(3), Math.PI / 6 + i * Math.PI / 3)));
  root.GrapheneBZGeometry = Object.freeze({
    corners, midpoints, nearestReciprocal,
    K: Object.freeze([1, 0]), Kprime: Object.freeze([-1, 0]),
    b1: nearestReciprocal[0], b2: nearestReciprocal[2],
    screen: (p, cx, cy, radius) => [cx + radius * p[0], cy - radius * p[1]]
  });
})(globalThis);
