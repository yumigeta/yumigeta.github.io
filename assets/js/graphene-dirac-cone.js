/* Dirac-page figures. Q = a q, energies in t, and T = t tau / hbar.
 * F has the common Bloch factor exp(i K x) removed, as in Eq. (10).
 * Draw Re(F), its envelope +/-|F|, and the coarse-grained density |F|^2 separately.
 * The cone uses E/t = +/-3|Q|/2.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('dc-zoom')) return;
  const S = Math.sqrt(3), PI = Math.PI, K = 4 * PI / (3 * S);
  const cs = getComputedStyle(document.documentElement);
  const token = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  const color = {
    ink: token('--color-text', '#1e1913'), axis: token('--color-neutral', '#8a7d70'),
    red: token('--color-accent-suo', '#bf2f25'), teal: token('--color-teal', '#3e6f6b'),
    gold: token('--color-terracotta', '#b27a4d'), grid: 'rgba(138,125,112,.19)'
  };
  const ja = () => document.documentElement.getAttribute('data-lang') === 'ja';
  const msg = (j,e) => ja() ? j : e;
  const exact = Q => Math.abs(1 + 2 * Math.cos(S * (K + Q) / 2));
  function surface(id,h) {
    const cv = $(id), w = Math.round(cv.getBoundingClientRect().width) || 500;
    const ratio = Math.min(window.devicePixelRatio || 1,2);
    if (cv.width !== Math.round(w*ratio) || cv.height !== Math.round(h*ratio)) {
      cv.width = Math.round(w*ratio); cv.height = Math.round(h*ratio); cv.style.height = h+'px';
    }
    const c = cv.getContext('2d'); c.setTransform(ratio,0,0,ratio,0,0); c.clearRect(0,0,w,h);
    return {c,w,h};
  }
  function text(c,x,y,label,align='left',fill=color.ink,size=12) {
    c.font = `${size}px "Zen Kaku Gothic New", sans-serif`; c.fillStyle=fill;
    c.textAlign=align; c.textBaseline='alphabetic'; c.fillText(label,x,y);
  }
  function mathText(c,x,y,label,align='center',fill=color.axis,size=13){
    c.font='italic '+size+'px Georgia, "Times New Roman", serif';c.fillStyle=fill;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(label,x,y);
  }
  function line(c,x1,y1,x2,y2,fill=color.axis,width=1,dash=[]) {
    c.strokeStyle=fill;c.lineWidth=width;c.setLineDash(dash);
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);
  }
  function dot(c,x,y,fill=color.red,r=4) { c.beginPath();c.arc(x,y,r,0,2*PI);c.fillStyle=fill;c.fill(); }
  function axes(c,w,h,xmin,xmax,ymin,ymax,xlabel,ylabel,opts={}) {
    const l=44,r=w-18,t=opts.top || 35,b=opts.bottom || h-40;
    const X=x=>l+(x-xmin)/(xmax-xmin)*(r-l), Y=y=>b-(y-ymin)/(ymax-ymin)*(b-t);
    [ymin,(ymin+ymax)/2,ymax].forEach(v=>{ line(c,l,Y(v),r,Y(v),color.grid); text(c,l-7,Y(v)+4,v.toFixed(opts.yDigits ?? 2),'right',color.axis,10); });
    line(c,l,t,l,b);line(c,l,b,r,b);
    [xmin,(xmin+xmax)/2,xmax].forEach((v,i)=>text(c,X(v),b+17,opts.xLabels ? opts.xLabels[i] : v.toFixed(2),'center',color.axis,10));
    text(c,l,t-13,ylabel,'left',color.axis,12); text(c,r,b+34,xlabel,'right',color.axis,12);
    return {X,Y,l,r,t,b};
  }
  function curve(c,a,fn,x0,x1,col,dash=[]) {
    c.save();c.beginPath();c.rect(a.l,a.t,a.r-a.l,a.b-a.t);c.clip();
    c.strokeStyle=col;c.lineWidth=2.2;c.setLineDash(dash);c.beginPath();
    for(let i=0;i<=360;i++){const x=x0+(x1-x0)*i/360,y=fn(x);i?c.lineTo(a.X(x),a.Y(y)):c.moveTo(a.X(x),a.Y(y));}c.stroke();c.restore();
  }
  function value(id,digits=2) { $(id+'-o').textContent=(+$(id).value).toFixed(digits); return +$(id).value; }

  function arrow(c,x0,y0,x1,y1,col=color.axis,width=1.3){
    line(c,x0,y0,x1,y1,col,width);const d=Math.atan2(y1-y0,x1-x0),s=6;
    line(c,x1,y1,x1-s*Math.cos(d-.45),y1-s*Math.sin(d-.45),col,width);
    line(c,x1,y1,x1-s*Math.cos(d+.45),y1-s*Math.sin(d+.45),col,width);
  }
  function niceStep(range){const raw=range/4,base=10**Math.floor(Math.log10(raw));return [1,2,5,10].find(v=>v*base>=raw)*base;}
  function bandPlot(c,box,cx,cy,sx,sy,overview=false,ylabel=true){
    const {l,r,t,b}=box,X=k=>cx+(k-K)*sx,Y=e=>cy-e*sy;
    const xmin=K+(l-cx)/sx,xmax=K+(r-cx)/sx,ymax=(cy-t)/sy;
    const dx=niceStep(xmax-xmin),dy=niceStep(2*ymax);
    c.save();c.beginPath();c.rect(l,t,r-l,b-t);c.clip();
    for(let x=Math.ceil(xmin/dx)*dx;x<xmax+dx*.001;x+=dx)line(c,X(x),t,X(x),b,color.grid);
    for(let y=Math.ceil(-ymax/dy)*dy;y<=ymax;y+=dy)line(c,l,Y(y),r,Y(y),color.grid);
    line(c,l,Y(0),r,Y(0),color.axis);
    line(c,X(K),t,X(K),b,color.axis,1,[3,4]);
    const a={...box,X,Y};curve(c,a,x=>exact(x-K),xmin,xmax,color.red);curve(c,a,x=>-exact(x-K),xmin,xmax,color.teal);
    c.restore();
    line(c,l,t,l,b);line(c,l,b,r,b);
    for(let x=Math.ceil(xmin/dx)*dx;x<xmax+dx*.001;x+=dx){
      if(Math.abs(X(x)-X(K))>24&&(!overview||Math.abs(X(x)-X(0))>20))text(c,X(x),b+17,x.toFixed(dx<.1?2:1),'center',color.axis,10);
    }
    text(c,X(K),b+17,'K','center',color.ink,12);
    for(let y=Math.ceil(-ymax/dy)*dy;y<=ymax;y+=dy)text(c,l-6,Y(y)+4,y.toFixed(dy<.1?2:dy<1?1:0),'right',color.axis,10);
    if(ylabel)text(c,l,t-12,'E/t','left',color.axis,11);text(c,r,b+33,'akₓ','right',color.axis,11);
    if(overview&&xmin<0){dot(c,X(0),Y(0),color.axis,2);text(c,X(0),b+17,'Γ','center',color.ink,12);}
    dot(c,X(K),Y(0),color.ink,2.5);
    return {X,Y};
  }
  function zoom(){
    const width=$('dc-zoom').getBoundingClientRect().width,mobile=width<530;
    const {c,w,h}=surface('dc-zoom',mobile?625:475),z=+$('dc-zoom-control').value,m=3*10**z;
    $('dc-zoom-control-o').textContent='×'+m.toFixed(1);
    // Keep the full band and its scales fixed. Both detail scales are multiplied by m.
    const mapW=mobile?w:190,ox=mobile?w*.49:92,oy=mobile?86:115,R=mobile?62:64;
    text(c,mobile?w/2:90,19,msg('断面を切る向き','Direction of the cut'),'center',color.ink,12);
    c.beginPath();for(let j=0;j<=6;j++){const phi=j*PI/3,x=ox+R*Math.cos(phi),y=oy-R*Math.sin(phi);j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=color.axis;c.lineWidth=1;c.stroke();
    arrow(c,ox-R-20,oy,ox+R+25,oy,color.gold,2);
    arrow(c,ox,oy+28,ox,oy-R-16);
    text(c,ox+R+20,oy+23,'+kₓ','center',color.axis,11);text(c,ox+8,oy-R-12,'+kᵧ','left',color.axis,11);
    for(const [x,label] of [[ox,'Γ'],[ox+R,'K'],[ox-R,'K′']]){dot(c,x,oy,color.ink,3);text(c,x,oy+17,label,'center',color.ink,12);}
    text(c,ox,oy+76,'kᵧ = 0','center',color.gold,11);
    const top=mobile?197:42,ov={l:mobile?42:mapW+37,r:w-20,t:top,b:top+151};
    text(c,ov.l,top-30,msg('全体図','Full band'),'left',color.ink,12);
    const sx=(ov.r-ov.l)/4.6,sy=(ov.b-ov.t)/6.8,cx=ov.l+2.95*sx,cy=(ov.t+ov.b)/2;
    const full=bandPlot(c,ov,cx,cy,sx,sy,true);
    const det={l:42,r:w-20,t:mobile?411:268,b:h-43},cx2=(det.l+det.r)/2,cy2=(det.t+det.b)/2;
    const halfW=(det.r-det.l)/(2*m),halfH=(det.b-det.t)/(2*m);
    c.fillStyle='rgba(178,122,77,.10)';c.fillRect(cx-halfW,cy-halfH,2*halfW,2*halfH);
    c.strokeStyle=color.gold;c.lineWidth=1.6;c.strokeRect(cx-halfW,cy-halfH,2*halfW,2*halfH);
    // Leaders identify the selected rectangle, without putting extra lines through the bands.
    line(c,cx-halfW,cy+halfH,det.l,det.t-26,color.gold,.8,[3,4]);
    line(c,cx+halfW,cy+halfH,det.r,det.t-26,color.gold,.8,[3,4]);
    text(c,det.l,det.t-13,msg('枠内を拡大','Magnified selection'),'left',color.ink,12);
    text(c,det.r,det.t-13,msg('縦・横とも ','Both axes ')+ '×'+m.toFixed(1),'right',color.gold,11);
    bandPlot(c,det,cx2,cy2,sx*m,sy*m,false,false);
    // Keep labels out of the plot title row.
    text(c,det.l-9,det.t+13,'E/t','right',color.axis,10);
    $('dc-zoom').dataset.zoomX=String(m);$('dc-zoom').dataset.zoomY=String(m);
    $('dc-zoom').dataset.crop=JSON.stringify({width:2*halfW,height:2*halfH});
  }
  function direction(){
    const {c,w,h}=surface('dc-direction',260),cx=w/2-8,cy=145,R=Math.min(85,w*.26),theta=PI/4;
    c.beginPath();c.arc(cx,cy,R,0,2*PI);c.strokeStyle=color.grid;c.lineWidth=1.2;c.setLineDash([3,4]);c.stroke();c.setLineDash([]);
    arrow(c,cx-R-20,cy,cx+R+30,cy);arrow(c,cx,cy+67,cx,cy-R-27);
    text(c,cx+R+26,cy+22,'+qₓ','center',color.axis,13);text(c,cx+10,cy-R-18,'+qᵧ','left',color.axis,13);
    text(c,cx-10,cy+18,'K','right',color.ink,13);
    arrow(c,cx,cy,cx+R,cy,color.gold,2);arrow(c,cx,cy,cx,cy-R,color.teal,2);
    dot(c,cx+R,cy,color.gold,4);dot(c,cx,cy-R,color.teal,4);
    text(c,cx+R,cy+43,'Γ→K: θ = 0','center',color.gold,11);
    text(c,cx-12,cy-R-6,'θ = π/2','right',color.teal,11);
    const x=cx+R*Math.cos(theta),y=cy-R*Math.sin(theta);
    arrow(c,cx,cy,x,y,color.red,2);dot(c,x,y,color.red,4);text(c,x+9,y-5,'q','left',color.red,15);
    c.beginPath();c.arc(cx,cy,28,0,-theta,true);c.strokeStyle=color.red;c.lineWidth=1.2;c.stroke();
    text(c,cx+36,cy-10,'θ','left',color.red,14);
    text(c,w/2,245,msg('角度の基準：Γから注目するKへ向かう方向','Reference: Γ towards the selected K'),'center',color.axis,11);
  }

  // Same muted palette, analytic-normal lighting, and translucent band layers as the TB figure.
  const rgb=s=>{if(s.startsWith('#')){const v=s.length===4?s.slice(1).split('').map(x=>x+x).join(''):s.slice(1);return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16));}return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);};
  const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
  const warm=mix(rgb(color.red),rgb(color.axis),.24),cool=rgb(color.teal);
  const layers=new Map();
  let angle=-25*PI/180,tilt=70*PI/180;
  function cone(id){
    const cv=$(id),width=cv.getBoundingClientRect().width;
    const {c,w,h}=surface(id,width<400?410:470);
    const az=angle,el=tilt;
    const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
    const scale=Math.min(w,h)*.32,ox=w*.51,oy=h*.45;
    const project=(x,y,z)=>{const u=x*ca-y*sa,v=x*sa+y*ca;return {x:ox+scale*u,y:oy-scale*(v*ce+z*se),d:z*ce-v*se};};
    const floor=-1.25,origin=project(0,0,floor);
    const polyline=(pts,col,width=1,dash=[])=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=col;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);};
    // A quiet reference plane; the two physical surfaces meet above its K marker.
    for(const v of [-1,-.5,0,.5,1]){
      polyline([project(v,-1,floor),project(v,1,floor)],color.grid,.8);
      polyline([project(-1,v,floor),project(1,v,floor)],color.grid,.8);
    }
    polyline([project(-1,-1,floor),project(1,-1,floor),project(1,1,floor),project(-1,1,floor),project(-1,-1,floor)],color.grid);
    const axesList=[];
    for(const [end,label] of [[project(1.3,0,floor),'aqₓ'],[project(0,1.3,floor),'aqᵧ']]){
      arrow(c,origin.x,origin.y,end.x,end.y,color.axis);
      const dx=end.x-origin.x,dy=end.y-origin.y,len=Math.hypot(dx,dy);
      axesList.push({x:end.x+16*dx/len,y:end.y+16*dy/len+5,label});
    }
    const e0=project(-1.25,-.15,-1.3),e1=project(-1.25,-.15,1.2);
    arrow(c,e0.x,e0.y,e1.x,e1.y,color.axis);
    mathText(c,e1.x,Math.max(16,e1.y-10),'E/t');
    for(const v of [-.6,0,.6]){const p=project(-1.25,-.15,v/.6);line(c,p.x-3,p.y,p.x+3,p.y);text(c,p.x-7,p.y+4,v===0?'0':v.toFixed(1),'right',color.axis,10);}
    polyline([project(-1.25,-.15,0),project(0,0,0)],color.grid,1,[3,4]);
    const rings=30,sectors=96,all=[];
    for(const band of [-1,1]){
      const faces=[],base=band>0?warm:cool,pale=mix(base,[255,255,255],.66);
      function vertex(r,phi){
        // Radius r = |Q|/0.4 and height z = (E/t)/0.6 are equal on this cone.
        const x=r*Math.cos(phi),y=r*Math.sin(phi),z=r;
        const slope=1,norm=Math.SQRT2;
        const nx=-band*slope*Math.cos(phi)/norm,ny=-band*slope*Math.sin(phi)/norm,nz=1/norm;
        const rx=nx*ca-ny*sa,ry=(nx*sa+ny*ca)*ce+nz*se,rz=nz*ce-(nx*sa+ny*ca)*se;
        const br=.74+.26*Math.abs(.34*rx+.46*ry+.82*rz);
        const shade=mix(pale,base,Math.min(1,z/1.13)).map(v=>v*br);
        return {...project(x,y,band*z),shade};
      }
      for(let j=0;j<sectors;j++)for(let r=0;r<rings;r++){
        const pts=[[r,j],[r+1,j],[r+1,j+1],[r,j+1]].map(([rr,jj])=>vertex(rr/rings,2*PI*jj/sectors));
        const shade=[0,1,2].map(i=>Math.round(pts.reduce((s,p)=>s+p.shade[i],0)/4));
        faces.push({pts,d:pts.reduce((s,p)=>s+p.d,0)/4,fill:'rgb('+shade.join(',')+')'});
      }
      faces.sort((a,b)=>a.d-b.d);all.push(faces);
    }
    if(!layers.has(id))layers.set(id,[document.createElement('canvas'),document.createElement('canvas')]);
    const ratio=cv.width/w;
    layers.get(id).forEach((off,i)=>{
      if(off.width!==cv.width||off.height!==cv.height){off.width=cv.width;off.height=cv.height;}
      const b=off.getContext('2d');b.setTransform(ratio,0,0,ratio,0,0);b.clearRect(0,0,w,h);b.lineWidth=.8;b.lineJoin='round';
      for(const face of all[i]){b.beginPath();face.pts.forEach((p,j)=>j?b.lineTo(p.x,p.y):b.moveTo(p.x,p.y));b.closePath();b.fillStyle=face.fill;b.strokeStyle=face.fill;b.fill();b.stroke();}
      c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=.84;c.drawImage(off,0,0);c.restore();
    });
    const contact=project(0,0,0);
    dot(c,contact.x,contact.y,color.ink,2.5);
    axesList.forEach(a=>mathText(c,Math.max(25,Math.min(w-25,a.x)),a.y,a.label));
    dot(c,origin.x,origin.y,color.axis,2.5);mathText(c,origin.x-9,origin.y+17,'K','right');
  }

  let kind='cone',waveMode='packet',running=false,timeT=0,last=0,frame=0,inView=false;
  const step=.04,parabolaCoefficient=9,maxTime=60;
  const centres=[.08,.30],packetColors=[color.teal,color.gold];
  let velocityPlot=null,draggedWave=null;
  const disp=Q=>kind==='cone'?1.5*Q:parabolaCoefficient*Q*Q;
  const speed=Q=>kind==='cone'?1.5:2*parabolaCoefficient*Q;
  function waveComponents(Q) {
    if(waveMode==='two')return [{q:Q-step/2,weight:1},{q:Q+step/2,weight:1}];
    const sigma=.018,waves=Array.from({length:41},(_,j)=>{
      const dq=3*sigma*(j-20)/20;
      return {q:Q+dq,weight:Math.exp(-.5*(dq/sigma)**2)};
    });
    const total=waves.reduce((sum,wave)=>sum+wave.weight,0);
    return waves.map(wave=>({...wave,weight:2*wave.weight/total}));
  }
  function superposition(waves,x,T) {
    let re=0,im=0;
    for(const wave of waves){
      const phi=wave.q*x-disp(wave.q)*T;
      re+=wave.weight*Math.cos(phi);im+=wave.weight*Math.sin(phi);
    }
    const rho=re*re+im*im;
    return {re,im,rho,amplitude:Math.sqrt(rho)};
  }
  function packetMark(c,x,y,i,r=4){
    if(i===0){dot(c,x,y,packetColors[i],r);return;}
    c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();
    c.fillStyle=token('--color-plate','#f8f5ed');c.fill();c.strokeStyle=packetColors[i];c.lineWidth=1.8;c.stroke();
  }
  function velocity() {
    const {c,w}=surface('dc-velocity',868),small=w<440,packet=waveMode==='packet';
    const sets=centres.map((Q,i)=>({Q,i,col:packetColors[i],waves:waveComponents(Q),v:speed(Q),peak:speed(Q)*timeT}));
    text(c,44,18,msg('①・②の中心波数をドラッグ','Drag the two central wavevectors'),'left',color.ink,small?11:12);
    text(c,w-18,39,kind==='cone'?'E/t = 1.5 aq':msg('比較用：','Reference: ')+'E/t = 9(aq)²','right',color.axis,11);
    // Both dispersions use the same fixed energy and wavevector scales.
    const a=axes(c,w,260,0,.4,0,1.5,'aq','E/t',{top:56,bottom:215});
    velocityPlot=a;
    curve(c,a,disp,0,.4,color.ink);
    for(const set of sets){
      const {Q,i,col,waves,v}=set;
      if(packet){
        c.save();c.globalAlpha=.065;c.fillStyle=col;
        c.fillRect(a.X(waves[0].q),a.t,a.X(waves.at(-1).q)-a.X(waves[0].q),a.b-a.t);c.restore();
      }else{
        for(const wave of waves)packetMark(c,a.X(wave.q),a.Y(disp(wave.q)),i,2.5);
      }
      curve(c,a,x=>disp(Q)+v*(x-Q),Math.max(0,Q-.075),Math.min(.4,Q+.075),col,[5,3]);
      line(c,a.X(Q),a.b,a.X(Q),a.Y(disp(Q)),col,.8,[2,4]);
      packetMark(c,a.X(Q),a.Y(disp(Q)),i,3);
      text(c,44,274+i*22,(i===0?'①':'②')+'  aq̄ = '+Q.toFixed(3)+'      vɡ = '+(v/1.5).toFixed(2)+' vꜰ','left',col,12);
    }
    // Separate the hit targets if the wavevectors coincide, while leaders retain their true positions.
    const close=Math.hypot(a.X(centres[0])-a.X(centres[1]),a.Y(disp(centres[0]))-a.Y(disp(centres[1])))<46;
    sets.forEach(set=>{
      const {Q,i,col}=set,handle=$('dc-wave-handle-'+i);
      const dx=close?(i===0?-18:18):0,dy=close?(i===0?-23:23):0;
      const x=a.X(Q)+dx,y=a.Y(disp(Q))+dy;
      if(close)line(c,a.X(Q),a.Y(disp(Q)),x,y,col,1);
      handle.style.left=x+'px';handle.style.top=y+'px';
      handle.setAttribute('aria-label',msg('波束','Wave packet ')+(i+1)+msg('の中心波数',' central wavevector'));
      handle.setAttribute('aria-valuenow',Q.toFixed(3));
      handle.setAttribute('aria-valuetext','aq̄ = '+Q.toFixed(3)+', '+msg('群速度','group velocity')+' '+(set.v/1.5).toFixed(2)+' vF');
    });
    line(c,20,311,w-18,311,color.grid);

    const L=a.l,R=a.r,xmin=-180,xmax=480,X=x=>L+(x-xmin)/(xmax-xmin)*(R-L);
    const sourceYs=[387,439],sumYs=[549,638],densityY=816,sumScale=18,densityScale=16;
    const sourceScale=18;
    sets.forEach(set=>{
      set.samples=Array.from({length:661},(_,j)=>{const x=xmin+j;return {x,...superposition(set.waves,x,timeT)};});
      set.atPeak=superposition(set.waves,set.peak,timeT);
    });
    function trace(samples,fn,col,width=1.8,dash=[]){
      c.beginPath();samples.forEach((sample,j)=>j?c.lineTo(X(sample.x),fn(sample)):c.moveTo(X(sample.x),fn(sample)));
      c.strokeStyle=col;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);
    }
    function zeroAxis(y,extent,tick,i){
      line(c,L,y,R,y,color.axis,.8);
      for(const sign of [-1,1]){
        line(c,L,y-sign*extent,R,y-sign*extent,color.grid,.7);
        text(c,L-7,y-sign*extent+4,(sign>0?'':'−')+tick,'right',color.axis,9);
      }
      text(c,16,y+4,i===0?'①':'②','center',packetColors[i],14);
      line(c,X(0),y-extent,X(0),y+extent,color.grid,.8,[3,4]);
    }
    text(c,L,336,msg('各組に重ねる波の実部','Real parts of the waves in each group'),'left',color.ink,small?10.5:12);
    text(c,L,354,packet?msg('中心の波数ほど大きな重み','Greater weight near each centre'):msg('それぞれ近い二波を重ねる','Two nearby wavevectors in each group'),'left',color.axis,10.5);
    for(const set of sets){
      const {i,waves,samples,col}=set,y=sourceYs[i],maxWeight=Math.max(...waves.map(wave=>wave.weight));
      zeroAxis(y,sourceScale,packet?maxWeight.toFixed(2):'1',i);
      for(let j=0;j<waves.length;j++){
        const wave=waves[j];c.save();c.globalAlpha=packet?.12+.24*wave.weight/maxWeight:.85;
        trace(samples,s=>y-sourceScale*wave.weight/maxWeight*Math.cos(wave.q*s.x-disp(wave.q)*timeT),col,packet?1:1.5,!packet&&j===1?[4,3]:[]);
        c.restore();
      }
    }

    text(c,L,480,msg('各組を足した振幅','The summed amplitude of each group'),'left',color.ink,small?11:12);
    line(c,L,499,L+18,499,color.ink,1.6);text(c,L+23,503,msg('実部','Real part'),'left',color.ink,11);
    line(c,L+(small?86:118),499,L+(small?106:138),499,color.axis,1.7,[5,4]);
    text(c,L+(small?111:143),503,msg('包絡線 ±|F|','Envelope ±|F|'),'left',color.axis,11);
    for(const set of sets){
      const {i,col,samples,peak,atPeak}=set,y=sumYs[i];
      zeroAxis(y,36,'2',i);
      c.save();c.globalAlpha=.06;c.fillStyle=col;c.beginPath();
      samples.forEach((s,j)=>j?c.lineTo(X(s.x),y-sumScale*s.amplitude):c.moveTo(X(s.x),y-sumScale*s.amplitude));
      [...samples].reverse().forEach(s=>c.lineTo(X(s.x),y+sumScale*s.amplitude));c.closePath();c.fill();c.restore();
      trace(samples,s=>y-sumScale*s.re,col,1.5);
      trace(samples,s=>y-sumScale*s.amplitude,col,2,[5,4]);
      trace(samples,s=>y+sumScale*s.amplitude,col,2,[5,4]);
      line(c,X(peak),y-39,X(peak),y+39,col,1,[2,4]);
      packetMark(c,X(peak),y-sumScale*atPeak.amplitude,i,3.5);
    }

    text(c,L,715,msg('二つの確率密度を比較する','Compare the two probability densities'),'left',color.ink,small?10.5:12);
    text(c,L,734,msg('|F|² に比例（相対値）','Proportional to |F|² (relative units)'),'left',color.axis,11);
    line(c,L,densityY,R,densityY,color.axis,.9);line(c,L,densityY-64,R,densityY-64,color.grid,.7);
    text(c,L-7,densityY+4,'0','right',color.axis,10);text(c,L-7,densityY-60,'4','right',color.axis,10);
    line(c,X(0),densityY-64,X(0),densityY,color.grid,1,[3,4]);
    for(const set of sets){
      const {i,col,samples,peak,atPeak}=set;
      c.save();c.globalAlpha=.10;c.fillStyle=col;c.beginPath();c.moveTo(L,densityY);
      samples.forEach(s=>c.lineTo(X(s.x),densityY-densityScale*s.rho));c.lineTo(R,densityY);c.closePath();c.fill();c.restore();
      trace(samples,s=>densityY-densityScale*s.rho,col,i===0?2.8:2.3,i===1?[6,4]:[]);
      line(c,X(peak),densityY-densityScale*atPeak.rho,X(peak),densityY,col,1,[2,4]);
      packetMark(c,X(peak),densityY-densityScale*atPeak.rho,i,4);
      text(c,X(peak)+(i===0?-8:8),densityY-densityScale*atPeak.rho-7,i===0?'①':'②',i===0?'right':'left',col,12);
    }
    for(const x of [-120,0,120,240,360,480])text(c,X(x),densityY+19,String(x),'center',color.axis,10);
    text(c,X(0),densityY+39,msg('出発点','Start'),'center',color.axis,10);
    text(c,R,863,msg('位置 x/a','Position x/a'),'right',color.axis,11);
    $('dc-time').value=String(timeT);$('dc-time-o').textContent=timeT.toFixed(1)+' ℏ/t';
    const cv=$('dc-velocity');
    cv.dataset.time=String(timeT);cv.dataset.waveMode=waveMode;cv.dataset.dispersion=kind;
    cv.dataset.comparison=JSON.stringify(sets.map(set=>({q:set.Q,speed:set.v,ratio:set.v/1.5,peak:set.peak,spectrum:set.waves,samples:set.samples.filter((_,j)=>j%5===0)})));
  }
  function stopFrame(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
  function animate(time){
    frame=0;
    if(!running||!inView||document.hidden){last=0;return;}
    if(last)timeT=Math.min(maxTime,timeT+Math.min((time-last)/1000,.08)*8);
    last=time;velocity();
    if(timeT>=maxTime){running=false;last=0;playLabel();return;}
    frame=requestAnimationFrame(animate);
  }
  function startFrame(){if(running&&inView&&!document.hidden&&!frame)frame=requestAnimationFrame(animate);}
  function playLabel(){
    $('dc-play').textContent=running?msg('一時停止','Pause'):msg('動かす','Play');
    $('dc-play').setAttribute('aria-pressed',String(running));
  }
  function pauseComparison(){running=false;stopFrame();playLabel();}
  $('dc-play').addEventListener('click',()=>{if(timeT>=maxTime)timeT=0;running=!running;playLabel();velocity();running?startFrame():stopFrame();});
  $('dc-time-reset').addEventListener('click',()=>{pauseComparison();timeT=0;velocity();});
  $('dc-time').addEventListener('input',()=>{pauseComparison();timeT=+$('dc-time').value;velocity();});
  document.querySelectorAll('[data-dc-dispersion]').forEach(btn=>btn.addEventListener('click',()=>{
    kind=btn.dataset.dcDispersion;
    document.querySelectorAll('[data-dc-dispersion]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    velocity();
  }));
  document.querySelectorAll('[data-dc-waves]').forEach(btn=>btn.addEventListener('click',()=>{
    waveMode=btn.dataset.dcWaves;
    document.querySelectorAll('[data-dc-waves]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    velocity();
  }));
  function moveCentre(i,Q){
    centres[i]=Math.max(.06,Math.min(.34,Math.round(Q*1000)/1000));
    velocity();
  }
  for(let i=0;i<2;i++){
    const handle=$('dc-wave-handle-'+i);
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||!velocityPlot)return;
      e.preventDefault();pauseComparison();handle.focus({preventScroll:true});
      const box=$('dc-velocity').getBoundingClientRect();
      draggedWave={i,id:e.pointerId,offset:e.clientX-box.left-velocityPlot.X(centres[i])};
      handle.setPointerCapture(e.pointerId);handle.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove',e=>{
      if(!draggedWave||draggedWave.id!==e.pointerId)return;
      const box=$('dc-velocity').getBoundingClientRect();
      const x=e.clientX-box.left-draggedWave.offset;
      moveCentre(i,.4*(x-velocityPlot.l)/(velocityPlot.r-velocityPlot.l));
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,e=>{
      if(draggedWave?.id!==e.pointerId)return;
      draggedWave=null;handle.classList.remove('is-dragging');
      if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
    });
    handle.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
      e.preventDefault();pauseComparison();
      const delta=e.shiftKey?.01:.002;
      moveCentre(i,e.key==='Home'?.06:e.key==='End'?.34:centres[i]+(['ArrowRight','ArrowUp'].includes(e.key)?delta:-delta));
    });
  }
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;inView?startFrame():stopFrame();},{threshold:.05}).observe($('dc-velocity'));
  else inView=true;
  document.addEventListener('visibilitychange',()=>document.hidden?stopFrame():startFrame());

  let pointer=null;
  $('dc-cone').addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};$('dc-cone').setPointerCapture(e.pointerId);});
  $('dc-cone').addEventListener('pointermove',e=>{
    if(!pointer)return;angle+=(e.clientX-pointer.x)*.008;tilt=Math.max(.8,Math.min(1.4,tilt-(e.clientY-pointer.y)*.008));
    pointer={x:e.clientX,y:e.clientY};cone('dc-cone');
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('dc-cone').addEventListener(type,()=>pointer=null));
  $('dc-cone').tabIndex=0;
  $('dc-cone').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();if(e.key==='ArrowLeft')angle-=.12;if(e.key==='ArrowRight')angle+=.12;
    if(e.key==='ArrowUp')tilt=Math.min(1.4,tilt+.08);if(e.key==='ArrowDown')tilt=Math.max(.8,tilt-.08);
    cone('dc-cone');
  });
  $('dc-cone-reset').addEventListener('click',()=>{angle=-25*PI/180;tilt=70*PI/180;cone('dc-cone');});
  $('dc-zoom-control').addEventListener('input',zoom);
  function redraw(){
    zoom();direction();cone('dc-cone');velocity();playLabel();
    document.querySelectorAll('canvas[data-label-ja]').forEach(cv=>cv.setAttribute('aria-label',cv.dataset[ja()?'labelJa':'labelEn']));
  }
  window.addEventListener('resize',redraw);
  new MutationObserver(redraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  redraw();
})();
