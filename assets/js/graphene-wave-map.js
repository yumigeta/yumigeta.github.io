/* Linked wavevector, real-space plane wave, and individual lattice-site phases.
   Lengths are in units of the carbon bond a; wavevectors are in units of 1/a. */
(function () {
  'use strict';
  var map = document.getElementById('fig-kmap'); if (!map) return;
  var wave = document.getElementById('fig-kwave'), rows = document.getElementById('fig-krows');
  var status = document.getElementById('kw-status');
  var rowIndex = 0;
  var PI = Math.PI, S3 = Math.sqrt(3), TAU = 2 * PI;
  var a1 = [S3 / 2, 1.5], a2 = [-S3 / 2, 1.5];
  var KR = 4 * PI / (3 * S3), MR = 2 * PI / 3;
  var presets = {gamma:[0,0], m:[PI/S3,PI/3], k:[KR,0], kprime:[-KR,0]};
  var k = presets.m.slice(), selectedName = 'M', mapGeometry, dragging = false;
  var rootStyle = getComputedStyle(document.documentElement);
  function token(name, fallback) { return rootStyle.getPropertyValue(name).trim() || fallback; }
  var ink = token('--color-text','#1e1913'), muted = token('--color-neutral','#8a7d70');
  var red = token('--color-accent-suo','#bf2f25'), teal = token('--color-teal','#3e6f6b');
  var plate = token('--color-plate','#fdfcf9');
  var ja = function () { return document.documentElement.getAttribute('data-lang') === 'ja'; };
  function dot(u,v) { return u[0]*v[0]+u[1]*v[1]; }
  function setup(canvas,height) {
    var width = Math.round(canvas.getBoundingClientRect().width) || 300;
    var ratio = Math.min(window.devicePixelRatio || 1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;canvas.style.height=height+'px';
    var ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    return {ctx:ctx,w:width,h:height};
  }
  function text(ctx,value,x,y,size,color,align) {
    ctx.fillStyle=color||ink;ctx.textAlign=align||'left';ctx.textBaseline='alphabetic';
    ctx.font='500 '+(size||12)+'px '+(ja()?'"Shippori Mincho", serif':'Georgia, serif');ctx.fillText(value,x,y);
  }
  function line(ctx,p,q,color,width) {
    ctx.strokeStyle=color||muted;ctx.lineWidth=width||1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
  }
  function arrow(ctx,p,q,color,width,head) {
    line(ctx,p,q,color,width);var angle=Math.atan2(q[1]-p[1],q[0]-p[0]),h=head||6;
    ctx.beginPath();ctx.moveTo(q[0]-h*Math.cos(angle-.45),q[1]-h*Math.sin(angle-.45));ctx.lineTo(q[0],q[1]);ctx.lineTo(q[0]-h*Math.cos(angle+.45),q[1]-h*Math.sin(angle+.45));ctx.stroke();
  }
  function clock(ctx,x,y,phase,r,isB) {
    ctx.fillStyle=plate;ctx.strokeStyle=muted;ctx.lineWidth=.8;ctx.beginPath();
    if(isB)ctx.rect(x-r,y-r,2*r,2*r);else ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();
    ctx.globalAlpha=.25;ctx.fillStyle=Math.cos(phase)>=0?red:teal;ctx.fill();ctx.globalAlpha=1;
    var end=[x+r*.82*Math.cos(phase),y-r*.82*Math.sin(phase)];
    line(ctx,[x,y],end,ink,1.25);ctx.fillStyle=ink;ctx.beginPath();ctx.arc(end[0],end[1],r>10?1.8:1,0,TAU);ctx.fill();
  }
  function phaseText(phase) {
    var v=Math.atan2(Math.sin(phase),Math.cos(phase))/PI;
    if(Math.abs(v)<1e-7)return '0';
    if(Math.abs(Math.abs(v)-1)<1e-7)return 'π';
    var sign=v<0?'−':'';
    if(Math.abs(Math.abs(v)-2/3)<1e-7)return sign+'2π/3';
    if(Math.abs(Math.abs(v)-1/3)<1e-7)return sign+'π/3';
    return sign+Math.abs(v).toFixed(2)+'π';
  }
  function drawMap() {
    var o=setup(map,300),ctx=o.ctx,cx=o.w/2,cy=158,R=Math.min(o.w*.34,97);
    mapGeometry={cx:cx,cy:cy,scale:R/KR,nodes:[{p:[0,0],name:'Γ'}]};
    function pos(p){return [cx+p[0]*R/KR,cy-p[1]*R/KR];}
    text(ctx,ja()?'逆空間：k を選ぶ':'Reciprocal space: select k',10,21,12);
    ctx.globalAlpha=.45;arrow(ctx,[cx-R-12,cy],[cx+R+16,cy],muted,1,5);arrow(ctx,[cx,cy+R+10],[cx,cy-R-12],muted,1,5);ctx.globalAlpha=1;
    text(ctx,'kₓ',cx+R+19,cy+4,12,muted);text(ctx,'kᵧ',cx+6,cy-R-14,12,muted);
    ctx.strokeStyle=muted;ctx.lineWidth=1.2;ctx.beginPath();
    for(var i=0;i<6;i++) { var c=pos([KR*Math.cos(i*PI/3),KR*Math.sin(i*PI/3)]);if(i)ctx.lineTo(c[0],c[1]);else ctx.moveTo(c[0],c[1]); }ctx.closePath();ctx.stroke();
    for(var j=0;j<6;j++) {
      var theta=j*PI/3,corner=[KR*Math.cos(theta),KR*Math.sin(theta)],mtheta=theta+PI/6;
      var middle=[MR*Math.cos(mtheta),MR*Math.sin(mtheta)];
      mapGeometry.nodes.push({p:corner,name:j%2?'K′':'K'},{p:middle,name:'M'});
      var cp=pos(corner),mp=pos(middle);ctx.fillStyle=ink;ctx.strokeStyle=ink;
      ctx.beginPath();ctx.arc(cp[0],cp[1],3.5,0,TAU);if(j%2)ctx.stroke();else ctx.fill();
      ctx.beginPath();ctx.arc(mp[0],mp[1],2.5,0,TAU);ctx.fill();
      if((j===0||j===3)&&Math.hypot(k[0]-corner[0],k[1]-corner[1])>1e-7)text(ctx,j===0?'K':'K′',cp[0]+(j===0?12:-14),cp[1]-9,13,ink,'center');
      if(j===0&&Math.hypot(k[0]-middle[0],k[1]-middle[1])>1e-7)text(ctx,'M',mp[0]+13,mp[1]-9,13);
    }
    if(Math.hypot(k[0],k[1])>1e-7)text(ctx,'Γ',cx-11,cy+17,13);
    var kp=pos(k);if(Math.hypot(k[0],k[1])>1e-7)arrow(ctx,[cx,cy],kp,red,2,7);
    ctx.strokeStyle=red;ctx.lineWidth=2;ctx.beginPath();ctx.arc(kp[0],kp[1],6,0,TAU);ctx.stroke();
    text(ctx,selectedName==='k'?'k':selectedName,kp[0],kp[1]+23,14,red,'center');
    text(ctx,ja()?'点を選ぶ・ドラッグで動かす':'Select a point or drag k',o.w/2,287,11,muted,'center');
  }
  function drawWave() {
    var o=setup(wave,340),ctx=o.ctx,cx=o.w/2,cy=194,scale=Math.min(o.w/9,29);
    var gl=Math.hypot(k[0],k[1]),lambda=gl>1e-8?TAU/gl:Infinity,angle=Math.atan2(k[1],k[0]);
    function pos(x,y){return [cx+x*scale,cy-y*scale];}
    text(ctx,ja()?'実空間：cos(k·r)':'Real space: cos(k·r)',9,21,12);
    ctx.save();ctx.beginPath();ctx.rect(3,35,o.w-6,262);ctx.clip();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-angle);
    var extent=Math.hypot(o.w,o.h),step=isFinite(lambda)?lambda*scale/32:extent*2;
    for(var x=-extent;x<extent;x+=step) {
      var value=gl>1e-8?Math.cos(x/scale*gl):1;
      ctx.fillStyle=value>=0?red:teal;ctx.globalAlpha=.13*Math.abs(value);ctx.fillRect(x,-extent,step+1,2*extent);
    }
    ctx.globalAlpha=.45;
    if(isFinite(lambda)) for(var crest=-8;crest<=8;crest++) {
      var sx=crest*lambda*scale;line(ctx,[sx,-extent],[sx,extent],red,1);
      ctx.setLineDash([3,4]);line(ctx,[sx+lambda*scale/2,-extent],[sx+lambda*scale/2,extent],teal,1);ctx.setLineDash([]);
    }
    ctx.restore();
    var sites=[];
    for(var m=-6;m<=6;m++)for(var n=-6;n<=6;n++) {
      var ax=m*a1[0]+n*a2[0],ay=m*a1[1]+n*a2[1];
      var ap=pos(ax,ay);if(ap[0]<-30||ap[0]>o.w+30||ap[1]<10||ap[1]>335)continue;
      sites.push([ax,ay,false],[ax,ay+1,true]);
      ctx.globalAlpha=.35;
      [[0,1],[S3/2,-.5],[-S3/2,-.5]].forEach(function(d){line(ctx,ap,pos(ax+d[0],ay+d[1]),muted,1);});ctx.globalAlpha=1;
    }
    sites.forEach(function(site){
      var p=pos(site[0],site[1]);ctx.fillStyle=plate;ctx.strokeStyle=muted;ctx.lineWidth=1;
      ctx.beginPath();if(site[2])ctx.rect(p[0]-2.5,p[1]-2.5,5,5);else ctx.arc(p[0],p[1],2.8,0,TAU);ctx.fill();ctx.stroke();
    });
    var selectedRow=[a1,a2][rowIndex];
    var last=pos(3*selectedRow[0],3*selectedRow[1]);
    line(ctx,[cx,cy],last,ink,1.5);
    var next=pos(selectedRow[0],selectedRow[1]);
    arrow(ctx,[cx,cy],next,ink,1.5,6);
    for(var j=0;j<4;j++){
      var p=pos(j*selectedRow[0],j*selectedRow[1]);
      ctx.fillStyle=ink;ctx.beginPath();ctx.arc(p[0],p[1],3.6,0,TAU);ctx.fill();
    }
    text(ctx,'0',cx+10,cy+16,12);
    text(ctx,rowIndex?'a₂':'a₁',(cx+next[0])/2+(rowIndex?-13:13),(cy+next[1])/2,13,ink,'center');
    ctx.restore();
    text(ctx,'○ A   □ B',9,319,12,muted);
    text(ctx,ja()?'赤：山　青緑：谷':'Red: crest · teal: trough',o.w-9,319,11,muted,'right');
  }
  function drawRows() {
    var o=setup(rows,96),ctx=o.ctx,a=[a1,a2][rowIndex],delta=dot(k,a),radius=16;
    var phases=[];
    for(var j=0;j<4;j++) {
      var px=(j+.5)*o.w/4,py=31;
      if(j<3)arrow(ctx,[px+radius+5,py],[(j+1.5)*o.w/4-radius-5,py],muted,1,4);
      clock(ctx,px,py,j*delta,radius,false);
      phases.push(phaseText(j*delta));
      text(ctx,phases[j],px,70,13,ink,'center');
    }
    rows.setAttribute('aria-label',ja()
      ? selectedName+'、a'+(rowIndex?'₂':'₁')+'に沿う四つのAの位相：'+phases.join('、')
      : selectedName+', phases at four A sites along a'+(rowIndex?'₂':'₁')+': '+phases.join(', '));
  }
  function draw() {
    drawMap();drawWave();drawRows();
    var magnitude=Math.hypot(k[0],k[1]),lambda=magnitude>1e-8?TAU/magnitude:Infinity;
    var wavelength=isFinite(lambda)?lambda.toFixed(2)+' a = '+(lambda*.142).toFixed(3)+' nm':'∞';
    status.textContent=selectedName+' · k = ('+k[0].toFixed(3)+', '+k[1].toFixed(3)+')/a · λ = '+wavelength;
    Object.keys(presets).forEach(function(name){var button=document.getElementById('kw-'+name),active=Math.hypot(k[0]-presets[name][0],k[1]-presets[name][1])<1e-7;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }
  function choose(e) {
    var box=map.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
    var p=[(x-mapGeometry.cx)/mapGeometry.scale,(mapGeometry.cy-y)/mapGeometry.scale];
    var nearest=null,distance=13;
    mapGeometry.nodes.forEach(function(node){var d=Math.hypot(p[0]-node.p[0],p[1]-node.p[1])*mapGeometry.scale;if(d<distance){nearest=node;distance=d;}});
    if(nearest){k=nearest.p.slice();selectedName=nearest.name;}
    else {
      var factor=1;
      for(var i=0;i<6;i++){var angle=PI/6+i*PI/3,projection=p[0]*Math.cos(angle)+p[1]*Math.sin(angle);if(projection>MR)factor=Math.min(factor,MR/projection);}
      k=[p[0]*factor,p[1]*factor];selectedName='k';
    }
    draw();
  }
  Object.keys(presets).forEach(function(name){document.getElementById('kw-'+name).addEventListener('click',function(){k=presets[name].slice();selectedName={gamma:'Γ',m:'M',k:'K',kprime:'K′'}[name];draw();});});
  [0,1].forEach(function(index){
    document.getElementById('kw-row-a'+(index+1)).addEventListener('click',function(){
      rowIndex=index;
      [0,1].forEach(function(i){var button=document.getElementById('kw-row-a'+(i+1));button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
      draw();
    });
  });
  map.addEventListener('pointerdown',function(e){dragging=true;map.setPointerCapture(e.pointerId);choose(e);});
  map.addEventListener('pointermove',function(e){if(dragging)choose(e);});
  map.addEventListener('pointerup',function(){dragging=false;});map.addEventListener('pointercancel',function(){dragging=false;});
  window.addEventListener('resize',draw);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  if(document.fonts)document.fonts.ready.then(draw);
  draw();
})();
