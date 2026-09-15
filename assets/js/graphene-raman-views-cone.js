/* Cone process diagrams for the graphene Raman series. */
(function(){
  'use strict';
  const V=window.GrapheneRamanViews, P=window.GrapheneRaman;
  if(!V||!P) return;
  const HV=P.C.hbar*P.C.vf*1e9;            // hbar*v_F in eV*nm
  const E_G=1580*P.C.hcCm, E_K=1350*P.C.hcCm, E_LO=1620*P.C.hcCm;  // phonon energies in eV
  const GAMMA=0.39;                        // bilayer interlayer coupling, eV
  const SUB={1:'₁',2:'₂'};

  const PROC={
    G:{two:false,omega:E_G},
    D:{two:true,omega:E_K,partnerValley:'Kp',partnerType:'defect',plabel:'iTO'},
    Dp:{two:false,omega:E_LO,partnerValley:'K',partnerType:'defect',plabel:'iLO'},
    '2D':{two:true,omega:E_K,partnerValley:'Kp',partnerType:'phonon',plabel:'iTO'},
    '2Dp':{two:false,omega:E_LO,partnerValley:'K',partnerType:'phonon',plabel:'iLO'},
    '2Dtriple':{two:true,omega:E_K,plabel:'iTO'},
    bilayer:{two:true}
  };
  const TITLE={
    G:['Γ のフォノン一個','One Γ phonon'],
    D:['K 付近のフォノン一個と欠陥','One phonon near K and a defect'],
    Dp:['同じ谷のフォノン一個と欠陥','One intravalley phonon and a defect'],
    '2D':['フォノン二個、二重共鳴','Two phonons, double resonance'],
    '2Dp':['同じ谷のフォノン二個','Two intravalley phonons'],
    '2Dtriple':['フォノン二個、三重共鳴','Two phonons, triple resonance'],
    bilayer:['二層：四つの経路','Bilayer: four paths']
  };

  // ---- geometry ----------------------------------------------------------
  function coneGeom(w,hh,two,emax,ky){
    const y0=hh*0.53;
    const cK=two?w*0.31:w/2, cKp=two?w*0.69:w/2;
    const kx=(two?w*0.19:w*0.30)/2.4;
    return {w:w,hh:hh,y0:y0,ky:ky,kx:kx,cK:cK,cKp:cKp,two:two,emax:emax,
      pt:function(valley,q,E){const cx=valley==='Kp'?cKp:cK;return [cx+q*kx,y0-E*ky];}};
  }
  function coneRays(g,G,cx){
    const qCap=G.emax/HV;
    [[-1,1],[-1,-1],[1,1],[1,-1]].forEach(function(d){
      const dq=d[0],de=d[1];
      const qEdge=(dq>0?(G.w-cx):cx)/G.kx;
      const q=Math.max(0,Math.min(qCap,qEdge));
      g.line(cx,G.y0,cx+dq*q*G.kx,G.y0-de*(HV*q)*G.ky,g.p.axis,1.2);
    });
  }
  function drawFrame(g,G,title){
    g.line(0,G.y0,G.w,G.y0,g.p.axis,0.8,true);
    g.text(G.w-6,G.y0-6,'Eꜰ',12,'right',g.p.axis);
    coneRays(g,G,G.cK);
    g.text(G.cK,G.y0+20,'K',14,'center',g.p.ink);
    if(G.two){coneRays(g,G,G.cKp);g.text(G.cKp,G.y0+20,'K′',14,'center',g.p.ink);}
    g.text(10,20,title,13,'left',g.p.ink);
  }

  // ---- drawing primitives -------------------------------------------------
  function wavy(ctx,g,x,y,dir,color){
    const len=44,amp=6,wl=12,n=18;
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<=n;i++){
      const dd=len*i/n, xx=x+dir*dd, yy=y+amp*Math.sin(2*Math.PI*dd/wl);
      if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
    }
    ctx.stroke();
    const d1=len*(n-1)/n;
    g.arrow(x+dir*d1,y+amp*Math.sin(2*Math.PI*d1/wl),x+dir*len,y+amp*Math.sin(2*Math.PI*len/wl),color,2);
  }
  function dotE(ctx,g,pos,alpha){ctx.globalAlpha=alpha;g.circle(pos[0],pos[1],5,g.p.ink,true);ctx.globalAlpha=1;}
  function dotH(ctx,g,pos,alpha){ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(pos[0],pos[1],5,0,2*Math.PI);ctx.strokeStyle=g.p.ink;ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;}
  function drawArrow(g,x1,y1,x2,y2,color,width,head,dash){
    g.line(x1,y1,x2,y2,color,width,!!dash);
    const a=Math.atan2(y2-y1,x2-x1);
    g.line(x2,y2,x2-head*Math.cos(a-0.5),y2-head*Math.sin(a-0.5),color,width);
    g.line(x2,y2,x2-head*Math.cos(a+0.5),y2-head*Math.sin(a+0.5),color,width);
  }

  // ---- per-process step drawing -------------------------------------------
  function drawRegular(ctx,g,G,meta,el,step,t){
    const Om=meta.omega, E0=el/2, q0=E0/HV, E1=E0-Om, q1=E1/HV;
    const isDefect=meta.partnerType==='defect';
    const E3=isDefect?E1:(E1-Om);
    const hole=G.pt('K',-q0,-E0), p1=G.pt('K',-q0,E0), p2=G.pt(meta.partnerValley,q1,E1), p3=G.pt('K',-q0,E3);
    const sage=g.p.colors[2], teal=g.p.colors[1], suo=g.p.colors[0], terra=g.p.colors[3];
    if(step>=1){
      wavy(ctx,g,hole[0],hole[1],-1,sage);
      drawArrow(g,hole[0],hole[1],p1[0],p1[1],sage,2,6,false);
    }
    if(step>=2){
      drawArrow(g,p1[0],p1[1],p2[0],p2[1],teal,2,7,false);
      g.text((p1[0]+p2[0])/2,(p1[1]+p2[1])/2-6,meta.plabel,12,'center',teal);
    }
    if(step>=3){
      if(isDefect){
        drawArrow(g,p2[0],p2[1],p3[0],p3[1],terra,2,7,true);
        g.text((p2[0]+p3[0])/2,(p2[1]+p3[1])/2+14,t('欠陥','defect'),12,'center',terra);
      }else{
        drawArrow(g,p2[0],p2[1],p3[0],p3[1],teal,2,7,false);
        g.text((p2[0]+p3[0])/2,(p2[1]+p3[1])/2-6,meta.plabel,12,'center',teal);
      }
    }
    if(step>=4){
      drawArrow(g,p3[0],p3[1],hole[0],hole[1],suo,2,6,false);
      wavy(ctx,g,hole[0],hole[1],1,suo);
    }
    if(step>=1&&step<4){
      dotH(ctx,g,hole,1);
      const cur=step>=3?p3:step>=2?p2:p1, prev=step>=3?p2:step>=2?p1:null;
      if(prev)dotE(ctx,g,prev,0.25);
      dotE(ctx,g,cur,1);
    }
  }
  function drawG(ctx,g,G,el,step,t){
    const E0=el/2, q0=E0/HV, E1=E0-E_G;
    const hole=G.pt('K',-q0,-E0), p1=G.pt('K',-q0,E0), p2=G.pt('K',-q0,E1);
    const sage=g.p.colors[2], teal=g.p.colors[1], suo=g.p.colors[0];
    if(step>=1){
      wavy(ctx,g,hole[0],hole[1],-1,sage);
      drawArrow(g,hole[0],hole[1],p1[0],p1[1],sage,2,6,false);
    }
    if(step>=2){
      drawArrow(g,p1[0],p1[1],p2[0],p2[1],teal,2,7,false);
      g.text((p1[0]+p2[0])/2,(p1[1]+p2[1])/2-6,t('Γ フォノン','Γ phonon'),12,'center',teal);
    }
    if(step>=4){
      drawArrow(g,p2[0],p2[1],hole[0],hole[1],suo,2,6,false);
      wavy(ctx,g,hole[0],hole[1],1,suo);
    }
    if(step>=1&&step<4){
      dotH(ctx,g,hole,1);
      const cur=step>=2?p2:p1, prev=step>=2?p1:null;
      if(prev)dotE(ctx,g,prev,0.25);
      dotE(ctx,g,cur,1);
    }
  }
  function drawTriple(ctx,g,G,el,step){
    const E0=el/2, q0=E0/HV, E1=E0-E_K, q1=E1/HV;
    const holeStart=G.pt('K',-q0,-E0), eStart=G.pt('K',-q0,E0);
    const eMid=G.pt('Kp',q1,E1), hMid=G.pt('Kp',q1,-E1);
    const sage=g.p.colors[2], teal=g.p.colors[1], suo=g.p.colors[0];
    if(step>=1){
      wavy(ctx,g,holeStart[0],holeStart[1],-1,sage);
      drawArrow(g,holeStart[0],holeStart[1],eStart[0],eStart[1],sage,2,6,false);
    }
    if(step>=2){
      drawArrow(g,eStart[0],eStart[1],eMid[0],eMid[1],teal,2,7,false);
      g.text((eStart[0]+eMid[0])/2,(eStart[1]+eMid[1])/2-6,'iTO',12,'center',teal);
    }
    if(step>=3){
      drawArrow(g,holeStart[0],holeStart[1],hMid[0],hMid[1],teal,2,7,false);
      g.text((holeStart[0]+hMid[0])/2,(holeStart[1]+hMid[1])/2+14,'iTO',12,'center',teal);
    }
    if(step>=4){
      drawArrow(g,eMid[0],eMid[1],hMid[0],hMid[1],suo,2,6,false);
      wavy(ctx,g,hMid[0],hMid[1],1,suo);
    }
    if(step>=1&&step<4){
      const eCur=step>=2?eMid:eStart, eOld=step>=2?eStart:null;
      const hCur=step>=3?hMid:holeStart, hOld=step>=3?holeStart:null;
      if(eOld)dotE(ctx,g,eOld,0.25);
      if(hOld)dotH(ctx,g,hOld,0.25);
      dotE(ctx,g,eCur,1);
      dotH(ctx,g,hCur,1);
    }
  }

  // ---- bilayer ------------------------------------------------------------
  function bandCurve(ctx,G,cx,sign,pm,color,width){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
    const n=72;
    for(let i=0;i<=n;i++){
      const q=-2.6+5.2*i/n;
      const s=Math.sqrt(HV*q*HV*q+(GAMMA/2)*(GAMMA/2));
      const E=sign*(s+pm*GAMMA/2);
      const x=cx+q*G.kx, y=G.y0-E*G.ky;
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.stroke();
  }
  function bilayerQuantities(el){
    const E0=el/2;
    const sA=E0+GAMMA/2, qa=Math.sqrt(Math.max(0,sA*sA-(GAMMA/2)*(GAMMA/2)))/HV;
    const reachB=(E0-GAMMA/2)>(GAMMA/2);
    const sB=E0-GAMMA/2;
    const qb=reachB?Math.sqrt(Math.max(0,sB*sB-(GAMMA/2)*(GAMMA/2)))/HV:null;
    const base=E0-E_K, sJ1=base+GAMMA/2, sJ2=base-GAMMA/2;
    const qJ1=sJ1>=GAMMA/2?Math.sqrt(Math.max(0,sJ1*sJ1-(GAMMA/2)*(GAMMA/2)))/HV:null;
    const qJ2=sJ2>=GAMMA/2?Math.sqrt(Math.max(0,sJ2*sJ2-(GAMMA/2)*(GAMMA/2)))/HV:null;
    return {E0:E0,qa:qa,qb:qb,qJ1:qJ1,qJ2:qJ2};
  }
  function drawBilayer(ctx,g,G,el){
    [G.cK,G.cKp].forEach(function(cx){
      bandCurve(ctx,G,cx,1,-1,g.p.colors[0],1.4);
      bandCurve(ctx,G,cx,-1,-1,g.p.colors[0],1.4);
      bandCurve(ctx,G,cx,1,1,g.p.colors[1],1.4);
      bandCurve(ctx,G,cx,-1,1,g.p.colors[1],1.4);
    });
    const bq=bilayerQuantities(el), E0=bq.E0;
    const pA1=G.pt('K',-bq.qa,-E0), pA2=G.pt('K',-bq.qa,E0);
    g.arrow(pA1[0],pA1[1],pA2[0],pA2[1],g.p.colors[2],2.2);
    if(bq.qb!=null){
      const pB1=G.pt('K',-bq.qb,-E0), pB2=G.pt('K',-bq.qb,E0);
      g.arrow(pB1[0],pB1[1],pB2[0],pB2[1],g.p.colors[2],2.2);
    }
    const qi={1:bq.qa,2:bq.qb}, qj={1:bq.qJ1,2:bq.qJ2};
    [1,2].forEach(function(i){
      if(qi[i]==null)return;
      [1,2].forEach(function(j){
        if(qj[j]==null)return;
        const from=G.pt('K',-qi[i],E0), to=G.pt('Kp',qj[j],E0-E_K);
        drawArrow(g,from[0],from[1],to[0],to[1],g.p.colors[1],2,7,false);
        g.text(to[0],to[1]-8,'P'+SUB[i]+SUB[j],12,'center',g.p.colors[1]);
      });
    });
  }
  function bilayerResult(t,fmt,el){
    const bq=bilayerQuantities(el);
    const qi={1:bq.qa,2:bq.qb}, qj={1:bq.qJ1,2:bq.qJ2};
    const entries=[];
    [1,2].forEach(function(i){
      if(qi[i]==null)return;
      [1,2].forEach(function(j){
        if(qj[j]==null)return;
        entries.push(['κ'+SUB[i]+SUB[j],qi[i]+qj[j]]);
      });
    });
    let s=entries.map(function(e){return e[0]+' = '+fmt(e[1],2);}).join(', ');
    s=s?(s+' nm⁻¹'):t('励起もフォノンも見つからない','No excitation or phonon reachable');
    if(bq.qb==null)s+=t('、バンド 2 は励起できない','; band 2 is out of reach');
    return s;
  }

  // ---- result / step-name text --------------------------------------------
  function coneResult(t,fmt,process,meta,el){
    if(process==='G')return t('散乱光 Eₗ − ħΩɢ = '+fmt(el-E_G,2)+' eV','Scattered photon Eₗ − ħΩɢ = '+fmt(el-E_G,2)+' eV');
    const E0=el/2,q0=E0/HV,Om=meta.omega;
    if(meta.partnerType==='defect')return t('励起の半径 q = '+fmt(q0,2)+' nm⁻¹、散乱光 '+fmt(el-Om,2)+' eV','Excitation radius q = '+fmt(q0,2)+' nm⁻¹, scattered photon '+fmt(el-Om,2)+' eV');
    const E1=E0-Om,q1=E1/HV;
    return t('励起の半径 q = '+fmt(q0,2)+' nm⁻¹、フォノンの波数のずれ κ = '+fmt(q0+q1,2)+' nm⁻¹、散乱光 '+fmt(el-2*Om,2)+' eV','Excitation radius q = '+fmt(q0,2)+' nm⁻¹, phonon wavevector mismatch κ = '+fmt(q0+q1,2)+' nm⁻¹, scattered photon '+fmt(el-2*Om,2)+' eV');
  }
  function stepLabel(t,process,step){
    if(step===0)return t('コーン','Cones');
    if(step===1)return t('光を吸収','Absorb light');
    if(step===2)return t('フォノンを放出','Emit a phonon');
    if(step===3){
      if(process==='G')return t('（同じ）','(same)');
      if(process==='D'||process==='Dp')return t('欠陥に戻される','Returned by a defect');
      if(process==='2Dtriple')return t('正孔もフォノンを放出','The hole emits too');
      return t('二個目のフォノン','Second phonon');
    }
    return t('光を放出','Emit light');
  }

  V.registerKind('coneprocess', function(s,d,lang,h){
    const t=h.t, fmt=h.fmt;
    const process=s.process, el=Number(s.el);
    const step=Math.max(0,Math.min(4,Math.round(Number(s.step))));
    const meta=PROC[process]||PROC.G;
    const ttl=TITLE[process]||TITLE.G;
    const title=t(ttl[0],ttl[1]);
    const ky14=0.30*340/1.4;
    const panel={height:340,title:title,draw:function(ctx,w){
      const g=h.pen(ctx);
      const G=coneGeom(w,340,meta.two,1.4,ky14);
      drawFrame(g,G,title);
      if(process==='bilayer')drawBilayer(ctx,g,G,el);
      else if(process==='G')drawG(ctx,g,G,el,step,t);
      else if(process==='2Dtriple')drawTriple(ctx,g,G,el,step);
      else drawRegular(ctx,g,G,meta,el,step,t);
    }};
    const outputs={el:fmt(el,2)+' eV'};
    let result;
    if(process==='bilayer'){result=bilayerResult(t,fmt,el);outputs.step=title;}
    else{result=coneResult(t,fmt,process,meta,el);outputs.step=stepLabel(t,process,step);}
    return {panels:[panel],result:result,values:{process:process,el:el,step:step},outputs:outputs};
  });

  // ---- pauli blocking -------------------------------------------------------
  const paulicache=new Map();
  function shiftWidthCurve(h,tempK){
    const key=String(tempK);
    if(paulicache.has(key))return paulicache.get(key);
    if(paulicache.size>40)paulicache.clear();
    const xs=h.range(-0.4,0.4,160);
    const base=P.dynamicShift(0,tempK);
    const shift=xs.map(function(mu){return [mu,(P.dynamicShift(mu,tempK)-base)/P.C.hcCm];});
    const width=xs.map(function(mu){return [mu,P.electronicWidth(mu,tempK)];});
    const val={shift:shift,width:width};
    paulicache.set(key,val);
    return val;
  }

  V.registerKind('pauli', function(s,d,lang,h){
    const t=h.t, fmt=h.fmt;
    const ef=Number(s.ef), tempK=Number(s.t);
    const qStar=E_G/(2*HV);
    const p=P.occupation(E_G/2,ef,tempK);
    const width=P.electronicWidth(ef,tempK);
    const shift=(P.dynamicShift(ef,tempK)-P.dynamicShift(0,tempK))/P.C.hcCm;
    const ky5=0.36*300/0.5;
    const panel1={height:300,title:t('コーンと占有','Cone and occupation'),draw:function(ctx,w){
      const g=h.pen(ctx);
      const G=coneGeom(w,300,false,0.5,ky5);
      const qmax=0.5/HV;
      h.range(-qmax,qmax,160).forEach(function(q){
        const Ec=HV*Math.abs(q), Ev=-Ec;
        const fc=P.fermi(Ec,ef,tempK), fv=P.fermi(Ev,ef,tempK);
        const pc=G.pt('K',q,Ec), pv=G.pt('K',q,Ev);
        ctx.globalAlpha=fc;g.circle(pc[0],pc[1],2.2,g.p.colors[0],true);
        ctx.globalAlpha=fv;g.circle(pv[0],pv[1],2.2,g.p.colors[0],true);
      });
      ctx.globalAlpha=1;
      drawFrame(g,G,p>0.5?t('崩壊できる','Decay allowed'):t('塞がれている','Blocked'));
      const a1=G.pt('K',qStar,-E_G/2), a2=G.pt('K',qStar,E_G/2);
      ctx.globalAlpha=Math.max(0,Math.min(1,p));
      g.arrow(a1[0],a1[1],a2[0],a2[1],g.p.colors[1],2.2);
      ctx.globalAlpha=1;
      g.text((a1[0]+a2[0])/2,Math.min(a1[1],a2[1])-8,t('G フォノンの崩壊','Decay of the G phonon'),12,'center',g.p.colors[1]);
    }};
    const curve=shiftWidthCurve(h,tempK);
    const panel2=h.chart([
      {points:curve.shift,name:t('Gの位置の移動','G shift'),colorIndex:0},
      {points:curve.width,name:t('電子による幅','Electronic width'),colorIndex:1}
    ],{height:300,xlabel:'Eꜰ (eV)',ylabel:'cm⁻¹',xdomain:[-0.4,0.4],ydomain:[-4,20],markers:[[ef,shift,'',0],[ef,width,'',1]]});
    const result=t('崩壊できる割合 '+fmt(p,2)+'、幅 '+fmt(width,1)+' cm⁻¹、移動 '+fmt(shift,1)+' cm⁻¹','Decay fraction '+fmt(p,2)+', width '+fmt(width,1)+' cm⁻¹, shift '+fmt(shift,1)+' cm⁻¹');
    return {panels:[panel1,panel2],result:result,values:{ef:ef,t:tempK,p:p,width:width,shift:shift},outputs:{ef:fmt(ef,2)+' eV',t:tempK+' K'}};
  });
})();
