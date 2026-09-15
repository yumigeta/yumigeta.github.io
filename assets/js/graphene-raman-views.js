/* Native Canvas figures for the graphene Raman series. The editable HTML
   supplies figures and physical controls; numerical models live in core.js. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./graphene-raman-core.js'));
  else root.GrapheneRamanViews=factory(root.GrapheneRaman);
})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const range=(a,b,n=120)=>Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
  const fmt=(x,n=2)=>Number(x.toFixed(n)).toString();
  function palette(){
    if(typeof document==='undefined')return {colors:['black','teal','olive','brown','gray','black'],ink:'black',axis:'gray',grid:'silver',plate:'white'};
    const css=getComputedStyle(document.documentElement),v=n=>css.getPropertyValue(n).trim();
    return {colors:['--color-accent-suo','--color-teal','--color-sage','--color-terracotta','--color-neutral','--color-text'].map(v),
      ink:v('--color-text'),axis:v('--color-neutral'),grid:v('--color-neutral'),plate:v('--color-plate')};
  }
  function pen(ctx){
    const p=palette();
    return {
      p,
      text(x,y,s,size=13,align='left',color=p.ink){
        ctx.fillStyle=color;ctx.font=size+'px "Shippori Mincho", Georgia, serif';ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y);
      },
      line(x,y,xx,yy,color=p.axis,width=1,dash=false){
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash?[5,4]:[]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();ctx.setLineDash([]);
      },
      circle(x,y,r,color=p.colors[0],fill=true){
        ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1;if(fill)ctx.fill();else ctx.stroke();
      },
      arrow(x,y,xx,yy,color=p.colors[0],width=1.7){
        this.line(x,y,xx,yy,color,width);const a=Math.atan2(yy-y,xx-x);
        this.line(xx,yy,xx-6*Math.cos(a-.5),yy-6*Math.sin(a-.5),color,width);
        this.line(xx,yy,xx-6*Math.cos(a+.5),yy-6*Math.sin(a+.5),color,width);
      }
    };
  }
  function nice(lo,hi,n=4){
    const d=(hi-lo)/n,b=10**Math.floor(Math.log10(d));
    const h=[1,2,2.5,5,10].reduce((x,y)=>Math.abs(x-d/b)<Math.abs(y-d/b)?x:y)*b;
    const out=[];for(let x=Math.ceil(lo/h)*h;x<=hi+h*1e-6;x+=h)out.push(Number(x.toPrecision(12)));return out;
  }
  function chart(curves,o={}){
    return {height:o.height||340,title:o.title||o.ylabel||o.xlabel,draw(ctx,w){
      const g=pen(ctx),L=56,R=18,T=34,H=(o.height||340)-120;
      const points=curves.flatMap(c=>c.points),xd=o.xdomain||[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0]))];
      const yd=o.ydomain||[Math.min(0,...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))*1.15];
      const X=x=>L+(x-xd[0])/(xd[1]-xd[0])*(w-L-R),Y=y=>T+H-(y-yd[0])/(yd[1]-yd[0])*H;
      this.map={L,R,T,H,w,xd,yd,X,Y,invX:px=>xd[0]+(px-L)/(w-L-R)*(xd[1]-xd[0]),invY:py=>yd[0]+(T+H-py)/H*(yd[1]-yd[0])};
      g.text(4,18,o.ylabel||'',12);
      for(const y of nice(...yd)){
        ctx.globalAlpha=.22;g.line(L,Y(y),w-R,Y(y),g.p.grid,.7);ctx.globalAlpha=1;
        g.text(L-8,Y(y)+4,fmt(y,4),11,'right');
      }
      for(const [x,label] of o.xticks||nice(...xd).map(x=>[x,fmt(x,4)])){
        g.line(X(x),T+H,X(x),T+H+4);g.text(X(x),T+H+20,label,11,'center');
      }
      g.line(L,T,L,T+H);g.line(L,T+H,w-R,T+H);
      g.text((L+w-R)/2,T+H+42,o.xlabel||'',12,'center');
      ctx.save();ctx.beginPath();ctx.rect(L,T,w-L-R,H);ctx.clip();
      (o.vlines||[]).forEach(x=>g.line(X(x),T,X(x),T+H,g.p.axis,o.vlineWidth||1.1));
      curves.forEach((curve,i)=>{
        const color=g.p.colors[curve.colorIndex===undefined?i%6:curve.colorIndex];
        if(curve.dots)curve.points.forEach(p=>g.circle(X(p[0]),Y(p[1]),2,color));
        else{
          ctx.strokeStyle=color;ctx.lineWidth=curve.width||1.6;ctx.setLineDash(curve.dash?[5,4]:[]);
          ctx.beginPath();curve.points.forEach((p,j)=>j?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])));ctx.stroke();ctx.setLineDash([]);
        }
      });
      (o.guides||[]).forEach(gd=>g.line(X(gd[0]),T,X(gd[0]),T+H,g.p.axis,1,true));
      (o.markers||[]).forEach(m=>g.circle(X(m[0]),Y(m[1]),4,g.p.colors[m[3]||0]));ctx.restore();
      (o.guides||[]).forEach(gd=>{if(gd[1])g.text(X(gd[0]),T+13,gd[1],12,'center',g.p.axis);});
      (o.markers||[]).forEach(m=>{if(m[2])g.text(Math.max(25,Math.min(w-25,X(m[0]))),Math.max(T+12,Y(m[1])-10),m[2],12,'center',g.p.colors[m[3]||0]);});
      (o.labels||[]).forEach(m=>{if(m[2])g.text(Math.max(25,Math.min(w-25,X(m[0]))),Math.max(T+12,Y(m[1])-10),m[2],12,'center',g.p.colors[m[3]||0]);});
      g.line(L,T,w-R,T);g.line(w-R,T,w-R,T+H);
      let x=L,y=T+H+(o.legendOffset===undefined?(o.xlabel?68:44):o.legendOffset);
      curves.forEach((c,i)=>{
        if(!c.name)return;ctx.font='12px "Shippori Mincho", Georgia, serif';
        const len=ctx.measureText(c.name).width+36;
        if(x+len>w-8){x=L;y+=19;}
        g.line(x,y-4,x+15,y-4,g.p.colors[c.colorIndex===undefined?i%6:c.colorIndex],c.legendWidth||1.8,c.dash);
        g.text(x+20,y,c.name,12);x+=len;
      });
    }};
  }
  function interpolate(a,x){let i=1;while(i<a.length&&a[i][0]<x)i++;if(i===a.length)return a.at(-1)[1];const l=a[i-1],r=a[i];return l[1]+(r[1]-l[1])*(x-l[0])/(r[0]-l[0]||1);}
  const peak=(a,lo,hi)=>a.filter(p=>p[0]>=lo&&p[0]<=hi).reduce((a,b)=>a[1]>b[1]?a:b);
  // Registry for kinds implemented in separate files (graphene-raman-views-*.js).
  // A registered kind takes precedence over the switch below. Each handler gets
  // (state, data, lang, helpers) and returns {panels, result, values, outputs}.
  const kinds={};
  function registerKind(name,fn){kinds[name]=fn;}
  function render(s,d,lang='en'){
    const t=(ja,en)=>lang==='ja'?ja:en,panels=[];
    let values={},result='',outputs={};
    const spectral=(curves,opts={})=>chart(curves,{xlabel:t('ラマンシフト（cm⁻¹）','Raman shift (cm⁻¹)'),ylabel:t('規格化強度','Normalized intensity'),...opts});
    const add=p=>panels.push(p),sketch=(height,title,draw)=>add({height,title,draw:(ctx,w)=>draw(pen(ctx),w)});
    if(kinds[s.kind]){
      const out=kinds[s.kind](s,d,lang,{chart,spectral,sketch,pen,palette,range,fmt,peak,interpolate,P,t})||{};
      return {panels:out.panels||[],result:out.result||'',values:out.values||{},outputs:out.outputs||{}};
    }
    switch(s.kind){
      case 'spectrum':
        {
          const traced=s.csv?(d.__csv&&d.__csv[s.csv]):null,points=traced||(d.spectra&&d.spectra.monolayer);
          if(!points)throw new Error('Raman spectrum data is missing');
          const labels=[];
          [[1320,1380,'D',2],[1540,1620,'G',0],[2660,2730,'2D',1]].forEach(([lo,hi,label,color])=>{
            const candidates=points.filter(p=>p[0]>=lo&&p[0]<=hi);
            if(candidates.length){const p=peak(candidates,lo,hi);labels.push([p[0],p[1],label,color]);}
          });
          const yMax=points.reduce((max,p)=>Math.max(max,p[1]),0);
          add(spectral([{points}],{xlabel:t('ラマンシフト（cm⁻¹）','Raman shift (cm⁻¹)'),xdomain:[points[0][0],points[points.length-1][0]],ydomain:[0,Math.max(1.05,yMax*1.1)],labels}));
          values={data:points,source:s.csv||null};
        }
        break;
      case 'lasercompare':
        add(spectral([{points:d.spectra.monolayer,name:'514 nm'},{points:d.spectra.monolayer_633,name:'633 nm'}],{xdomain:[2550,2800],ydomain:[-.05,1.2]}));
        values={source:d.sources.R14c};break;
      case 'lightwavevector':{
        const lam=514,q=4*Math.PI/lam,k=P.lattice().K[0],ratio=k/q,ratioDisplay=Math.round(ratio/100)*100,scale=500,kmag=k/scale;
        const qDisplay=fmt(q,3),kDisplay=fmt(k,0);
        sketch(215,t('光の波数と地図の幅','Wavevector of light and the width of the map'),(g,w)=>{
          const L=42,R=w-34,y1=78,y2=170;
          g.text((L+R)/2,30,'Γ–K ≈ '+kDisplay+' nm⁻¹',12,'center');
          g.text((L+R)/2,47,t('比：約 '+ratioDisplay+' 倍','Ratio: about '+ratioDisplay+'×'),12,'center');
          g.line(L,y1,R,y1,g.p.axis,1.2);g.line(L,y1-6,L,y1+6);g.line(R,y1-6,R,y1+6);
          g.text(L,y1+24,'Γ',13,'center');g.text(R,y1+24,'K',13,'center');
          g.line(L,y1,L+Math.max(1.5,(R-L)*q/k),y1,g.p.colors[0],6);
          g.text(L+6,y1-12,'≲ '+qDisplay+' nm⁻¹',12,'left',g.p.colors[0]);
          const xs=L+(R-L)*kmag/k;
          g.line(L,y1+9,L,y2-38,g.p.axis,.8,true);g.line(xs,y1+9,R,y2-38,g.p.axis,.8,true);
          g.text((L+R)/2,y2-44,t('Γ 付近を拡大','Near Γ, magnified'),12,'center');
          g.line(L,y2,R,y2,g.p.axis,1.2);g.line(L,y2-6,L,y2+6);g.line(R,y2-6,R,y2+6);
          g.text(L,y2+24,'Γ',13,'center');g.text(R,y2+24,'Γ 付近',11,'center');
          const xq=L+(R-L)*q/kmag;
          g.line(L,y2,xq,y2,g.p.colors[0],6);
          g.text(xq,y2-12,'≲ '+qDisplay+' nm⁻¹',12,'center',g.p.colors[0]);
        });
        result='≲ '+qDisplay+' nm⁻¹'+t('、Γ–K ≈ '+kDisplay+' nm⁻¹、比：約 '+ratioDisplay+' 倍','; Γ–K ≈ '+kDisplay+' nm⁻¹; ratio: about '+ratioDisplay+' times');
        values={photon_difference_bound_nm_inv:q,K_nm_inv:k,ratio};break;
      }
      case 'resonance':{
        const r=P.resonance(s.el,P.velocityRatio(100),.153,false),hv=P.C.hbar*P.C.vf*1e9;
        add(chart([{points:range(0,2.4).map(q=>[q,hv*q]),name:'Ec'},{points:range(0,2.4).map(q=>[q,-hv*q]),name:'Ev'}],{xlabel:'q (nm⁻¹)',ylabel:t('電子のエネルギー (eV)','Electronic energy (eV)'),ydomain:[-1.8,1.8],markers:[[r.q,s.el/2,'EL/2'],[r.q,-s.el/2,'−EL/2']]}));
        add(chart([{points:range(0,5).map(k=>[k,(.153+hv*P.velocityRatio(100)*k)/P.C.hcCm])}],{xlabel:'κ (nm⁻¹)',ylabel:t('一フォノン (cm⁻¹)','One phonon (cm⁻¹)'),ydomain:[1200,1450],markers:[[r.kappa,r.nuD,'κ*']]}));
        add(spectral([{points:range(2450,2900,220).map(x=>[x,P.lorentz(x,r.nu2D,28)]),name:t('2Dの位置模型','2D position model')}],{ydomain:[0,1.2]}));
        result='q = '+fmt(r.q,2)+' nm⁻¹; κ = '+fmt(r.kappa,2)+' nm⁻¹; 2D = '+fmt(r.nu2D,0)+' cm⁻¹';values=r;break;
      }
      case 'layers':{
        const names={bilayer:t('AB二層','AB bilayer'),five_layers:t('5層','5 layers'),ten_layers:t('10層','10 layers'),graphite:t('グラファイト','Graphite')};
        add(spectral([{points:d.spectra.monolayer,name:t('単層','Monolayer')},{points:d.spectra[s.comparison],name:names[s.comparison]}],{xdomain:[2550,2800],ydomain:[-.05,1.2]}));values={source:d.sources.R14b};break;
      }
      case 'bilayer':{
        const radii=P.bilayerRadii(s.el,s.gamma);
        add(chart(Array.from({length:4},(_,i)=>({points:range(0,2.6).map(q=>[q,P.bilayer(q,s.gamma)[i]]),name:'E'+(i+1)})),{xlabel:'q (nm⁻¹)',ylabel:t('電子のエネルギー (eV)','Electronic energy (eV)'),ydomain:[-2,2],markers:radii.map(q=>[q,s.el/2])}));values={radii_nm_inv:radii};result=t('共鳴半径：','Resonant radii: ')+radii.map(x=>fmt(x,2)).join(', ')+' nm⁻¹';break;
      }
      case 'layerfit':{
        const fitMode=s.fit||'published';
        const pub=d.spectra.bilayer_fit_published,raw=d.spectra.bilayer_fit_data.filter(p=>p[0]>=pub[0][0]&&p[0]<=pub.at(-1)[0]),xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
        const fit=P.fitLorentz(xs,ys),pred=fitMode==='single'?fit.fitted:xs.map(x=>interpolate(pub,x)),residual=xs.map((x,i)=>[x,ys[i]-pred[i]]);
        const curves=[{points:raw,name:t('実測','Measured'),dots:true},{points:xs.map((x,i)=>[x,pred[i]]),name:fitMode==='single'?t('単一フィット','Single fit'):t('公表フィット','Published fit')}];
        if(fitMode==='published')curves.push(...d.spectra.bilayer_fit_components.map((points,i)=>({points,name:'c'+(i+1),dash:true})));
        add(spectral(curves,{xdomain:[2590,2760],ydomain:[-.05,1.2],height:375}));if(s.residual!==false)add(chart([{points:residual}],{xlabel:t('ラマンシフト (cm⁻¹)','Raman shift (cm⁻¹)'),ylabel:t('実測 − フィット','Data − fit'),ydomain:[-.25,.25]}));values={raw,residual,parameter_covariance:null};break;
      }
      case 'defectspectra':{
        const a=d.spectra['defect_'+s.ld];
        add(spectral([{points:d.spectra.defect_24,name:'LD = 24 nm',dash:true},{points:a,name:'LD = '+s.ld+' nm'}],{xdomain:[1200,3400],markers:[[...peak(a,1300,1420),'D'],[...peak(a,1530,1660),'G'],[...peak(a,2630,2780),'2D']]}));values={source:d.sources.R16a};break;
      }
      case 'defectcalc':{
        const estimate=P.defectEstimate(s.ratio,s.el),ok=s.sample==='point-low'&&estimate.lowDensity&&estimate.inVisibleRange;
        sketch(170,t('欠陥密度の換算','Defect density conversion'),(g,w)=>{
          g.text(w/2,36,'HD/HG = '+s.ratio+'; EL = '+s.el+' eV',14,'center');
          if(ok){g.text(w/2,80,'LD = '+fmt(estimate.ld,1)+' nm',16,'center');g.text(w/2,120,'nD = '+estimate.nd.toExponential(2)+' cm⁻²',16,'center');}
          else g.text(w/2,91,t('点欠陥・低密度の適用条件を確認','Check the dilute point-defect conditions'),12,'center');
        });values={estimate:ok?estimate:null,applicable:ok};break;
      }
      case 'strain':{
        const e=s.strain/100,v=P.strainModes(e,-s.poisson*e);
        sketch(160,t('Gの二つの振動','The two G vibrations'),(g,w)=>{
          g.text(w/2,21,t('引張方向 x と二つの振動','Tension along x and the two modes'),12,'center');
          [0,1].forEach(i=>{const x=w*(i+.5)/2,y=87;g.text(x,46,i?'G⁺ ⊥ x':'G⁻ ∥ x',14,'center');g.line(x-25,y,x+25,y);g.circle(x-25,y,5);g.circle(x+25,y,5,g.p.colors[2]);if(i){g.arrow(x-25,y,x-25,y-23);g.arrow(x+25,y,x+25,y+23,g.p.colors[2]);}else{g.arrow(x-25,y,x-50,y);g.arrow(x+25,y,x+50,y,g.p.colors[2]);}g.text(x-43,y+5,'A',11);g.text(x+34,y+5,'B',11);});
          g.arrow(w/2-25,137,w/2+25,137,g.p.axis);g.text(w/2+35,142,'x');
        });
        add(chart([{points:range(0,1).map(x=>[x,P.strainModes(x/100,-s.poisson*x/100).parallel]),name:'G⁻'},{points:range(0,1).map(x=>[x,P.strainModes(x/100,-s.poisson*x/100).perpendicular]),name:'G⁺'}],{xlabel:t('一軸引張ひずみ (%)','Uniaxial tensile strain (%)'),ylabel:t('G位置 (cm⁻¹)','G position (cm⁻¹)'),ydomain:[1540,1585],markers:[[s.strain,v.parallel],[s.strain,v.perpendicular,'',1]]}));
        add(spectral([{points:range(1530,1595,220).map(x=>[x,P.lorentz(x,v.parallel,6,.65)+P.lorentz(x,v.perpendicular,6,.65)])}],{ydomain:[0,1.4]}));values=v;result='G⁻ = '+fmt(v.parallel,1)+'; G⁺ = '+fmt(v.perpendicular,1)+' cm⁻¹';break;
      }
      case 'correlation':{
        let v;try{v=P.correlation(s.dg,s.d2,s.ms,s.md);}catch(_){sketch(120,t('相関分解','Correlation'),(g,w)=>g.text(w/2,60,t('二方向が近すぎるため分離を保留','Directions too close for a stable split'),12,'center'));values={valid:false};break;}
        const x=Math.max(25,Math.abs(s.dg)*1.2,Math.abs(v.strainG)*1.2,Math.abs(v.dopingG)*1.2),y=Math.max(60,Math.abs(s.d2)*1.2,Math.abs(v.strainG*s.ms)*1.2);
        add(chart([{points:[[-x,-x*s.ms],[x,x*s.ms]],name:t('ひずみ','Strain'),dash:true},{points:[[-x,-x*s.md],[x,x*s.md]],name:t('ドーピング','Doping'),dash:true},{points:[[0,0],[v.strainG,v.strainG*s.ms],[s.dg,s.d2]],name:t('二寄与の和','Sum'),width:2.6}],{xlabel:'ΔG (cm⁻¹)',ylabel:'Δ2D (cm⁻¹)',xdomain:[-x,x],ydomain:[-y,y],markers:[[s.dg,s.d2,t('観測','Observed')]]}));
        values={...v,valid:true};result='us = '+fmt(v.strainG,1)+'; ud = '+fmt(v.dopingG,1)+' cm⁻¹';break;
      }
      case 'gpolarization':{
        const rad=x=>x*Math.PI/180,cos2=x=>Math.cos(2*rad(x))**2,sin2=x=>Math.sin(2*rad(x))**2;
        const v1=cos2(s.theta),v2=sin2(s.theta);
        add(chart([{points:range(0,180,180).map(x=>[x,cos2(x)]),name:t('振動 1','Vibration 1'),colorIndex:0},{points:range(0,180,180).map(x=>[x,sin2(x)]),name:t('振動 2','Vibration 2'),colorIndex:1},{points:range(0,180,180).map(x=>[x,1]),name:t('和','Sum'),colorIndex:4,width:2.6}],{height:300,title:t('偏光角に対する G の強さ','G intensity versus polarization angle'),xlabel:'θ (°)',ylabel:t('強度（相対値）','Intensity (relative)'),xdomain:[0,180],ydomain:[0,1.25],markers:[[s.theta,v1,'1',0],[s.theta,v2,'2',1],[s.theta,1,t('和','Sum'),4]]}));
        values={theta:s.theta,v1,v2,sum:1};result='θ = '+s.theta+'°: cos²2θ = '+fmt(v1,2)+', sin²2θ = '+fmt(v2,2)+', '+t('和','sum')+' = 1';break;
      }
      default:throw new Error('Unknown figure: '+s.kind);
    }
    return {panels,result,values,outputs};
  }
  return {render,registerKind,chart,interpolate,pen,palette,range,fmt};
});
