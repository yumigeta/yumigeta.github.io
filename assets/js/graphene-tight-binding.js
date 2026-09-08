/* Graphene's three equal nearest-neighbour hoppings. */
(function(){
  'use strict';
  var canvas=document.getElementById('fig-tb-neighbours');if(!canvas)return;
  function draw(){
    var width=Math.round(canvas.getBoundingClientRect().width)||300,height=245,dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';
    var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    var cx=width/2,cy=133,length=Math.min(82,width*.23),style=getComputedStyle(document.documentElement);
    var ink=style.getPropertyValue('--ink').trim()||'#1e1913',aColor='#b84435',bColor='#668553';
    function label(s,x,y){ctx.font='500 15px Georgia,serif';ctx.textAlign='center';ctx.fillStyle=ink;ctx.fillText(s,x,y);}
    var bonds=[[0,1],[Math.sqrt(3)/2,-.5],[-Math.sqrt(3)/2,-.5]];
    bonds.forEach(function(d,index){
      var x=cx+d[0]*length,y=cy-d[1]*length;
      ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();
      ctx.fillStyle=bColor;ctx.beginPath();ctx.arc(x,y,7,0,2*Math.PI);ctx.fill();label(['B₁','B₂','B₃'][index],x,y+(d[1]>0?-15:26));
      label('−t',(cx+x)/2+(d[0]===0?21:0),(cy+y)/2+(d[0]===0?4:22));
    });
    ctx.fillStyle=aColor;ctx.beginPath();ctx.arc(cx,cy,7,0,2*Math.PI);ctx.fill();label('A',cx+20,cy+5);
  }
  window.addEventListener('resize',draw);if(document.fonts)document.fonts.ready.then(draw);draw();
})();

/* Horizontal k: the positions give phases (0, theta, -theta).
   Only exp(i k.delta_j) is drawn; the common orbital coefficient stays u_B. */
(function(){
  'use strict';
  var canvas=document.getElementById('fig-tb-bond-phase');
  var slider=document.getElementById('tb-bond-phase');
  if(!canvas||!slider)return;
  var phaseOutput=document.getElementById('tb-bond-phase-output');
  var sumOutput=document.getElementById('tb-bond-phase-sum');
  function draw(){
    var width=Math.round(canvas.getBoundingClientRect().width)||328;
    var height=495,ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;canvas.style.height=height+'px';
    var ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
    var ja=document.documentElement.getAttribute('data-lang')==='ja';
    var style=getComputedStyle(document.documentElement);
    function color(name,fallback){return style.getPropertyValue(name).trim()||fallback;}
    var ink=color('--color-text','#1e1913'),muted=color('--color-neutral','#8a7d70');
    var green=color('--color-teal','#3e6f6b'),sage=color('--color-sage','#708a5c');
    var red=color('--color-accent-suo','#bf2f25');
    var degrees=Number(slider.value),theta=degrees*Math.PI/180;
    var fraction=degrees/120;
    var position=degrees===0?'Γ':degrees===120?'K':fraction.toFixed(2)+' K';
    // a is the C–C bond length. On Γ–K, k_x a = 2 theta / sqrt(3).
    var ka=2*theta/Math.sqrt(3);
    var phases=[0,theta,-theta],sum=1+2*Math.cos(theta);
    if(Math.abs(sum)<1e-12)sum=0;
    phaseOutput.textContent=position;sumOutput.textContent=sum.toFixed(2);
    slider.setAttribute('aria-valuetext','k = '+position);
    canvas.setAttribute('aria-label',ja
      ?'ΓからKへの経路上で k = '+position+'。B₁の位相0度、B₂の位相'+degrees+'度、B₃の位相'+(-degrees)+'度。位相因子の和は'+sum.toFixed(2)+'。下の山と谷は位相因子の実部を表す。'
      :'On the path from Gamma to K, k = '+position+'. Phases at B1, B2 and B3: 0, '+degrees+' and '+(-degrees)+' degrees. Sum: '+sum.toFixed(2)+'. Crests and troughs below show the real part of the phase factor.');
    function text(s,x,y,size,col,align){
      ctx.font=(size||14)+'px Georgia,"Shippori Mincho",serif';
      ctx.fillStyle=col||ink;ctx.textAlign=align||'center';ctx.fillText(s,x,y);
    }
    function line(x1,y1,x2,y2,col,lw){
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.strokeStyle=col||muted;ctx.lineWidth=lw||1;ctx.stroke();
    }
    function arrow(x1,y1,x2,y2,col,lw){
      var a=Math.atan2(y2-y1,x2-x1),head=6;
      line(x1,y1,x2,y2,col,lw);
      line(x2,y2,x2-head*Math.cos(a-.45),y2-head*Math.sin(a-.45),col,lw);
      line(x2,y2,x2-head*Math.cos(a+.45),y2-head*Math.sin(a+.45),col,lw);
    }
    function dot(x,y,col,r){ctx.beginPath();ctx.arc(x,y,r||5,0,2*Math.PI);ctx.fillStyle=col;ctx.fill();}
    // The selected k lies on Γ–K, not on the Γ–M direction.
    var pane=width/2,bzx=pane/2,bzy=96,bzr=Math.min(55,pane*.29);
    text(ja?'波数の位置':'Wavevector position',bzx,24,13);
    ctx.beginPath();
    for(var corner=0;corner<=6;corner++){
      var ca=corner*Math.PI/3,bxx=bzx+bzr*Math.cos(ca),byy=bzy-bzr*Math.sin(ca);
      if(corner===0)ctx.moveTo(bxx,byy);else ctx.lineTo(bxx,byy);
    }
    ctx.strokeStyle=muted;ctx.lineWidth=1;ctx.stroke();
    line(bzx,bzy,bzx+bzr,bzy,red,2);
    text('Γ',bzx-7,bzy+17,13,ink);
    text('K',bzx+bzr+11,bzy+4,13,ink);
    text('K′',bzx-bzr-12,bzy+4,12,muted);
    var mx=bzx+.75*bzr,my=bzy-Math.sqrt(3)*bzr/4;
    dot(mx,my,muted,2);text('M',mx+9,my-7,12,muted);
    var selectedX=bzx+fraction*bzr;
    dot(selectedX,bzy,red,4);
    if(degrees>0&&degrees<120)text('k',selectedX,bzy+32,13,red);
    text('Γ → K',bzx,176,12,muted);

    var ox=pane,px=ox+pane*.20,py=115,unit=Math.min(43,pane*.20);
    text(ja?'位相因子を足す':'Add phase factors',ox+pane/2,24,13);
    ctx.globalAlpha=.32;
    line(px-unit*.5,py,px+3.3*unit,py,muted);
    line(px,py+unit*.65,px,py-unit*1.6,muted);
    ctx.beginPath();ctx.arc(px,py,unit,0,2*Math.PI);ctx.strokeStyle=muted;ctx.stroke();
    ctx.globalAlpha=1;
    text('Re',Math.min(width-9,px+3.7*unit),py+18,11,muted);
    text('Im',px+6,py-unit*1.6-7,11,muted);
    text('0',px-9,py+16,11,muted);
    for(var n=1;n<=3;n++){line(px+n*unit,py-3,px+n*unit,py+3,muted);text(String(n),px+n*unit,py+17,11,muted);}
    if(sum>1e-10){
      ctx.globalAlpha=.4;arrow(px,py,px+sum*unit,py,red,4);ctx.globalAlpha=1;
    }
    var x=px,y=py;
    phases.forEach(function(a,j){
      var nx=x+unit*Math.cos(a),ny=y-unit*Math.sin(a);
      arrow(x,y,nx,ny,green,1.8);
      var labelSide=j>0&&theta<=Math.PI/2?-1:1;
      text(String(j+1),(x+nx)/2+labelSide*11*Math.sin(a),(y+ny)/2+labelSide*11*Math.cos(a),12,green);
      x=nx;y=ny;
    });
    dot(px+sum*unit,py,red,3.5);

    // Shared real-space x coordinate for the atoms, wavefronts and cosine trace.
    var cx=width/2,cy=298,bond=Math.min(60,(width-40)/6.4);
    var left=22,right=width-22,top=235,bottom=360;
    var waveY=435,waveAmp=25;
    text(ja?'実空間の山と谷':'Crests and troughs in real space',cx,207,14);
    ctx.save();
    ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
    for(var sx=left;sx<right;sx+=2){
      var value=Math.cos(ka*(sx-cx)/bond);
      ctx.globalAlpha=.035+.075*Math.abs(value);
      ctx.fillStyle=value>=0?red:green;ctx.fillRect(sx,top,2,bottom-top);
    }
    ctx.globalAlpha=1;ctx.restore();
    if(ka>0){
      var halfPeriod=Math.PI*bond/ka;
      var first=Math.ceil((left-cx)/halfPeriod),last=Math.floor((right-cx)/halfPeriod);
      for(var m=first;m<=last;m++){
        var frontX=cx+m*halfPeriod,isCrest=m%2===0,col=isCrest?red:green;
        ctx.globalAlpha=.65;ctx.setLineDash(isCrest?[]:[4,4]);
        line(frontX,top,frontX,bottom,col,1);
        ctx.setLineDash([]);ctx.globalAlpha=1;
        text(ja?(isCrest?'山':'谷'):(isCrest?'crest':'trough'),frontX,top-7,12,col);
      }
    }else{
      text(ja?'Γ：実部はどこでも +1':'Γ: real part is +1 everywhere',cx,top-7,12,red);
    }
    var bonds=[[0,1],[Math.sqrt(3)/2,-.5],[-Math.sqrt(3)/2,-.5]];
    bonds.forEach(function(d,j){
      var x=cx+bond*d[0],y=cy-bond*d[1];
      line(cx,cy,x,y,muted,1.3);dot(x,y,sage,6);
      if(j===0){
        text('B₁',x+16,y+4,15,ink,'left');text('0°',x-16,y+4,14,green,'right');
      }else{
        text(j===1?'B₂':'B₃',x+(j===1?14:-14),y+5,15,ink,j===1?'left':'right');
        text((degrees?(j===1?'+':'−'):'')+degrees+'°',x,y+28,14,green);
      }
    });
    dot(cx,cy,red,6);text('A',cx+14,cy+4,15,ink,'left');
    text(ja?'実部 cos(kₓx)':'Real part cos(kₓx)',left,392,12,ink,'left');
    line(left,waveY,right,waveY,muted,1);
    text('x',right,waveY+17,12,muted);
    text('+1',left-4,waveY-waveAmp+4,11,muted,'right');
    text('−1',left-4,waveY+waveAmp+4,11,muted,'right');
    ctx.beginPath();
    for(var sx=left;sx<=right;sx++){
      var sy=waveY-waveAmp*Math.cos(ka*(sx-cx)/bond);
      if(sx===left)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
    }
    ctx.strokeStyle=ink;ctx.lineWidth=1.8;ctx.stroke();
    bonds.forEach(function(d,j){
      var sx=cx+bond*d[0],sy=waveY-waveAmp*Math.cos(phases[j]);
      ctx.globalAlpha=.35;ctx.setLineDash([3,4]);
      line(sx,bottom+3,sx,sy,muted);ctx.setLineDash([]);ctx.globalAlpha=1;
      dot(sx,sy,sage,3.5);
      text(['B₁','B₂','B₃'][j],sx,482,12,ink);
    });
  }
  slider.addEventListener('input',draw);
  window.addEventListener('resize',draw);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  if(document.fonts)document.fonts.ready.then(draw);
  draw();
})();
