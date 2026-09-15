/* Numerical models for the six graphene Raman articles. Energies: eV;
 * wavevectors: nm^-1; Raman positions and FWHM: cm^-1. No DOM dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GrapheneRaman = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const C = Object.freeze({hcNm:1239.841984332, hcCm:1.239841984332e-4,
    hbar:6.582119569e-16, kb:8.617333262e-5, a:0.142, vf:1e6, alpha:0.00443});
  const finite = (x,name) => {if (!Number.isFinite(x)) throw new RangeError(name); return x;};
  const positive = (x,name) => {finite(x,name); if (x<=0) throw new RangeError(name); return x;};
  const wavelengthEnergy = nm => C.hcNm / positive(nm,'wavelength');
  const shiftEnergy = nu => finite(nu,'shift') * C.hcCm;
  function scatteredWavelength(nm, nu) {
    return C.hcNm / positive(wavelengthEnergy(nm)-shiftEnergy(nu),'scattered energy');
  }
  function velocityRatio(slope) {
    const s=finite(slope,'slope')*C.hcCm;
    if(s<0 || s>=2) throw new RangeError('slope');
    return s/(2-s);
  }
  function resonance(el, r=velocityRatio(100), ek=0.153, loss=true, vf=C.vf) {
    positive(el,'laser energy'); positive(vf,'Fermi velocity');
    finite(r,'velocity ratio'); finite(ek,'K phonon energy');
    if(r<0 || ek<=0 || el<=2*ek) throw new RangeError('resonance model range');
    const hv=C.hbar*vf*1e9;
    const q=el/(2*hv);
    const kappa=loss?(el-ek)/(hv*(1+r)):el/hv;
    const phonon=ek+hv*r*kappa;
    return {q,kappa,phonon,nuD:phonon/C.hcCm,nu2D:2*phonon/C.hcCm,
      slope2D:2*r/(1+(loss?r:0))/C.hcCm};
  }
  function lattice(a=C.a) {
    positive(a,'bond length'); const s=Math.sqrt(3);
    return {a1:[s*a/2,3*a/2],a2:[-s*a/2,3*a/2],
      b1:[2*Math.PI/(s*a),2*Math.PI/(3*a)],
      b2:[-2*Math.PI/(s*a),2*Math.PI/(3*a)],
      K:[4*Math.PI/(3*s*a),0],M:[Math.PI/(s*a),Math.PI/(3*a)],
      tau:[[0,0],[0,a]]};
  }
  function bilayer(q, gamma=0.39, vf=C.vf) {
    const u=C.hbar*vf*1e9*q, z=Math.hypot(u,gamma/2);
    return [-z-gamma/2,-z+gamma/2,z-gamma/2,z+gamma/2];
  }
  function bilayerRadii(el,gamma=0.39) {
    positive(el,'laser energy'); if (gamma<0 || el<=2*gamma) throw new RangeError('bilayer resonance');
    return [-1,1].map(l => Math.sqrt((el/2-l*gamma/2)**2-gamma**2/4)/(C.hbar*C.vf*1e9));
  }
  function lorentz(x,center,width,height=1) {
    positive(width,'FWHM'); return height/(1+4*((x-center)/width)**2);
  }
  const lorentzArea = (height,width) => Math.PI*height*positive(width,'FWHM')/2;
  const lorentzUnitArea = (x,center,width) => lorentz(x,center,width,2/(Math.PI*width));
  const defectDensity = ld => 1e14/(Math.PI*positive(ld,'defect separation')**2);
  function defectEstimate(ratio,el) {
    positive(ratio,'D/G height ratio'); positive(el,'laser energy');
    const ld=Math.sqrt(4300/(el**4*ratio));
    return {ld,nd:defectDensity(ld),coefficientRelativeUncertainty:1300/4300,
      inVisibleRange:el>=1.65 && el<=3.1,lowDensity:ld>=10};
  }
  // Cançado et al. 1105.0175v2, Eq. (1), structural + activated areas.
  function defectTrajectory(ld,el,rs=1,ra=3.1,cs=0) {
    positive(ld,'defect separation');positive(el,'laser energy');
    const ca=160/el**4;
    return ca*(ra*ra-rs*rs)/(ra*ra-2*rs*rs)*
      (Math.exp(-Math.PI*rs*rs/ld**2)-Math.exp(-Math.PI*(ra*ra-rs*rs)/ld**2))+
      cs*(1-Math.exp(-Math.PI*rs*rs/ld**2));
  }
  function fermi(energy,mu,t) {
    if(t===0) return energy<mu?1:energy>mu?0:0.5;
    positive(t,'temperature'); const z=(energy-mu)/(C.kb*t);
    return z>40?Math.exp(-z):z< -40?1:1/(1+Math.exp(z));
  }
  const occupation = (e,mu,t) => fermi(-e,mu,t)-fermi(e,mu,t);
  function zeroTShift(mu,eg=shiftEnergy(1580),alpha=C.alpha) {
    const m=Math.abs(mu),a=eg/2;
    if(m===a) return -Infinity;
    return alpha*(m+a/2*Math.log(Math.abs((m-a)/(m+a))));
  }
  function integrateSimpson(fn,a,b,n=1600) {
    n=Math.max(2,Math.ceil(n/2)*2); const h=(b-a)/n;
    let sum=fn(a)+fn(b);
    for(let i=1;i<n;i++) sum+=(i%2?4:2)*fn(a+i*h);
    return h*sum/3;
  }
  // Principal value evaluated by subtracting the numerator at E=eg/2.
  // Reference: neutral graphene at the SAME T; no hand-rounded singularity.
  function dynamicShift(mu,t=300,eg=shiftEnergy(1580),alpha=C.alpha,n=1600) {
    finite(mu,'Fermi energy'); if(t===0) return zeroTShift(mu,eg,alpha);
    positive(t,'temperature'); const a=eg/2,L=Math.max(2,Math.abs(mu)+40*C.kb*t);
    const h=e=>occupation(e,0,t)-occupation(e,mu,t);
    const ha=h(a),step=1e-6;
    const atPole=ha+a*(h(a+step)-h(a-step))/(4*step);
    const regular=e=>Math.abs(e-a)<1e-8?atPole:(h(e)*e*e-ha*a*a)/(e*e-a*a);
    const pv=integrateSimpson(regular,0,L,n)+ha*a/2*Math.log((L-a)/(L+a));
    return alpha*pv;
  }
  function electronicWidth(mu,t=300,eg=shiftEnergy(1580),alpha=C.alpha) {
    return Math.PI*alpha*eg/2*occupation(eg/2,mu,t)/C.hcCm;
  }
  // R10 Eq. (3), sigma in 10^13 cm^-2, electron doping positive.
  function staticBackground(sigma) {
    return -2.13*sigma-0.0360*sigma**2-0.00329*sigma**3-0.226*Math.abs(sigma)**1.5;
  }
  function densityFromMu(mu,vf=C.vf) {
    return Math.sign(mu)*mu*mu/(Math.PI*(C.hbar*vf)**2)*1e-4;
  }
  function strainModes(ex,ey,gamma=1.99,beta=0.99,nu0=1580) {
    const hydro=-nu0*gamma*(ex+ey), shear=nu0*beta*(ex-ey)/2;
    return {parallel:nu0+hydro-shear,perpendicular:nu0+hydro+shear,hydro,shear};
  }
  function correlation(dg,d2,ms=2.2,md=0.7) {
    [dg,d2,ms,md].forEach(x=>finite(x,'correlation input'));
    if(Math.abs(ms-md)<0.05) throw new RangeError('nearly parallel directions');
    const strainG=(d2-md*dg)/(ms-md),dopingG=(ms*dg-d2)/(ms-md);
    return {strainG,dopingG,determinant:md-ms,amplification:1/Math.abs(ms-md)};
  }
  function angularFactors(theta) {
    return {intraband:1-Math.cos(theta),interband:1+Math.cos(theta)};
  }
  function gaussianSamples(mu,sigma,n=24) {
    if(sigma===0) return [{mu,weight:1}];positive(sigma,'inhomogeneity');
    let values=[],sum=0;
    for(let i=0;i<=n;i++) {const z=-4+8*i/n,w=Math.exp(-z*z/2)*(i===0||i===n?0.5:1);values.push({mu:mu+z*sigma,weight:w});sum+=w;}
    return values.map(p=>({...p,weight:p.weight/sum}));
  }
  function convolveGaussian(xs,ys,fwhm) {
    if(fwhm===0) return ys.slice();positive(fwhm,'instrument FWHM');
    const sigma=fwhm/(2*Math.sqrt(2*Math.log(2))),dx=xs[1]-xs[0],range=Math.ceil(4*sigma/dx);
    const kernel=Array.from({length:2*range+1},(_,i)=>Math.exp(-(((i-range)*dx)**2)/(2*sigma*sigma)));
    const norm=kernel.reduce((a,b)=>a+b,0);
    return ys.map((_,i)=>kernel.reduce((sum,w,j)=>sum+w*(ys[i+j-range]||0),0)/norm);
  }
  // Least-squares Lorentzian fit. Center/width nonlinear; height fitted analytically.
  // Baseline is fixed at zero for model spectra, and explicitly removed for exercise data.
  function fitLorentz(xs,ys) {
    if(xs.length!==ys.length || xs.length<5 || ys.some(y=>!Number.isFinite(y))) throw new RangeError('fit data');
    const peak=ys.indexOf(Math.max(...ys));let center=xs[peak],width=12;
    function score(c,w) {
      let xy=0,xx=0;const shape=xs.map(x=>lorentz(x,c,w));
      for(let i=0;i<xs.length;i++){xy+=shape[i]*ys[i];xx+=shape[i]**2;}
      const height=xy/xx;let error=0;
      for(let i=0;i<xs.length;i++) error+=(ys[i]-height*shape[i])**2;
      return {error,height};
    }
    let best=score(center,width),dc=4,dw=6;
    for(let k=0;k<100;k++) {
      let improved=false;
      for(const [c,w] of [[center+dc,width],[center-dc,width],[center,width+dw],[center,Math.max(0.2,width-dw)]]) {
        if(c<xs[0]||c>xs.at(-1)||w>100) continue;
        const s=score(c,w);if(s.error<best.error){center=c;width=w;best=s;improved=true;}
      }
      if(!improved){dc*=0.65;dw*=0.65;}
      if(Math.max(dc,dw)<1e-5) break;
    }
    const fitted=xs.map(x=>lorentz(x,center,width,best.height));
    return {center,width,height:best.height,area:lorentzArea(best.height,width),
      fitted,residual:ys.map((y,i)=>y-fitted[i]),sse:best.error};
  }
  function dopingSpectrum(mu,{t=300,sigma=0.035,instrument=2,residual=4,nu0=1580,n=1200}={}) {
    const eg=shiftEnergy(nu0),xs=Array.from({length:301},(_,i)=>nu0-45+i*0.35);
    const local=gaussianSamples(mu,sigma).map(p=>({...p,
      center:nu0+dynamicShift(p.mu,t,eg,C.alpha,n)/C.hcCm,
      width:residual+electronicWidth(p.mu,t,eg)}));
    const average=xs.map(x=>local.reduce((sum,p)=>sum+p.weight*lorentzUnitArea(x,p.center,p.width),0));
    const ys=convolveGaussian(xs,average,instrument),fit=fitLorentz(xs,ys);
    return {xs,ys,average,fit,localMeanWidth:local.reduce((s,p)=>s+p.weight*p.width,0),local};
  }
  return {C,wavelengthEnergy,shiftEnergy,scatteredWavelength,velocityRatio,resonance,lattice,
    bilayer,bilayerRadii,lorentz,lorentzArea,lorentzUnitArea,defectDensity,defectEstimate,
    defectTrajectory,fermi,occupation,zeroTShift,dynamicShift,electronicWidth,staticBackground,
    densityFromMu,strainModes,correlation,angularFactors,integrateSimpson,gaussianSamples,
    convolveGaussian,fitLorentz,dopingSpectrum};
});
