(function () {
  'use strict';
  // Dimensionless occupation parameter theta = k_B T / (hbar omega).
  function occupation(theta) {
    if (theta <= 0) return { mean: 0, ratio: 0, probabilities: [1, 0, 0, 0, 0] };
    var x=Math.exp(-1/theta);
    return { mean: 1/Math.expm1(1/theta), ratio: x,
      probabilities: [0,1,2,3,4].map(function(v) {return (1-x)*Math.pow(x,v);}) };
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { occupation: occupation };
    return;
  }


  var D, Type;
  function isJA() { return document.documentElement.getAttribute('data-lang') === 'ja'; }
  function t(ja,en) { return isJA()?ja:en; }
  function safe(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function vr(s) { return '<tspan class="rp-notation rp-variable">'+safe(s)+'</tspan>'; }
  function roman(s) { return '<tspan class="rp-notation rp-roman">'+safe(s)+'</tspan>'; }
  function sub(body) { return '<tspan class="rp-notation rp-sub" baseline-shift="sub">'+body+'</tspan>'; }
  function sym(base,index,descriptive) { return vr(base)+(index==null?'':sub(descriptive?roman(index):vr(index))); }
  var Qk=sym('Q','k'), vk=sym('v','k'), wk=sym('ω','k'), wi=sym('ω','i',true);
  var hw=roman('ℏ')+wk;
  function mtext(x,y,body,cls,anchor,extra) {
    return '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||'start')+'" dominant-baseline="middle"'+(cls?' class="'+cls+'"':'')+(extra?' '+extra:'')+'>'+body+'</text>';
  }
  function svgWidth(host) { return Math.max(1,Math.round(host.getBoundingClientRect().width)); }
  function setSVG(host,w,h,body,description) { host.innerHTML=D.svg(body,description,w,h,'learn-panel-unframed'); }
  function frame(w,h,options,ymath,xmath) {
    var f=D.frame(options,w,h);
    f.body=f.body.replace(/(<text[^>]*class="rp-y-title"[^>]*>)<\/text>/,'$1'+ymath+'</text>');
    f.body=f.body.replace(/(<text[^>]*class="rp-x-title"[^>]*>)<\/text>/,'$1'+xmath+'</text>');
    // Keep the zero Y tick on its own axis so shared sizing cannot classify it as an X tick.
    f.body=f.body.replace('<text x="'+(f.left-9)+'" y="'+(f.bottom+4)+'"','<text x="'+(f.left-9)+'" y="'+f.bottom+'" dominant-baseline="middle"');
    return f;
  }
  function htmlMath(body) { return body.replace(/tspan/g,'span').replace(/ baseline-shift="sub"/g,''); }
  function comparison(host,kind,heads) {
    if(host.dataset.rvLayout!==kind) {
      host.innerHTML='<div class="learn-panel-comparison">'+[0,1].map(function(){
        return '<div class="learn-panel-stack"><h4></h4><div class="rv-hint" hidden></div><div class="rv-svg-host"></div><div class="rv-formula rp-notation" hidden></div></div>';
      }).join('')+'</div>';
      host.dataset.rvLayout=kind;
      host.querySelectorAll('.rv-svg-host').forEach(function(e){Type.watchTypography(e);});
    }
    var slots=Array.from(host.querySelector('.learn-panel-comparison').children);
    slots.forEach(function(slot,i){slot.querySelector('h4').textContent=heads[i];});
    return slots;
  }
  function formula(slot,body) {
    var node=slot.querySelector('.rv-formula');node.hidden=!body;node.innerHTML=htmlMath(body||'');
  }
  function hint(slot,body) {var node=slot.querySelector('.rv-hint');node.hidden=!body;node.innerHTML=htmlMath(body||'');}
  function energyGuide(left,top,bottom,title) {
    return D.line(left,top,left,bottom)+
      D.line(left,top,left-3,top+5)+D.line(left,top,left+3,top+5)+
      mtext(14,(top+bottom)/2,title,'rp-y-title','middle','transform="rotate(-90 14 '+((top+bottom)/2)+')"');
  }
  function drawWells() {
    var host=document.getElementById('rv-wells');
    var slots=comparison(host,'wells',[t('古典論','Classical'),t('量子論','Quantum')]);
    slots.forEach(function(slot,i){
      var canvas=slot.querySelector('.rv-svg-host'),w=svgWidth(canvas),h=268;
      var f=frame(w,h,{xmin:-2.95,xmax:2.95,ymin:0,ymax:4.5,xlabel:'',ylabel:'',xticks:[0],yticks:[0],leftInset:46,rightInset:72,topInset:14,bottomInset:64,yTitleX:16},vr('E'),Qk);
      var points=[];for(var k=0;k<=120;k++){var q=-2.95+5.9*k/120;points.push([f.x(q),f.y(.5*q*q)]);}
      var body=f.body+D.curve(points,'rv-potential');
      body+=mtext(f.left+10,f.top+14,vr('V')+roman('(')+Qk+roman(')'),'rv-neutral');
      if(!i) {
        var strip=f.right+14;
        body+='<g data-continuous-energy="E>=0"><rect class="rv-energy" x="'+strip+'" y="'+(f.top+16)+'" width="4" height="'+(f.bottom-f.top-16)+'"/>';
        body+=D.text(strip+2,f.top+10,'⋮','class="rv-energy" text-anchor="middle"');
        body+=mtext(strip+10,(f.top+f.bottom)/2,vr('E')+roman(' ≥ 0'),'rv-energy')+'</g>';
        formula(slot,'');
      } else {
        for(var v=0;v<=3;v++) {
          var e=v+.5,extent=Math.sqrt(2*e),y=f.y(e),cls=v===0?'rv-level rv-energy':'rv-level';
          body+='<g data-v="'+v+'" data-energy="'+e+'">'+D.line(f.x(-extent),y,f.x(extent),y,cls);
          body+=mtext(f.x(0)+(v===3?22:0),y-12,vk+roman(' = '+v),v===0?'rv-energy':'','middle')+'</g>';
        }
        var bx=f.right+14;
        function bracket(low,high,math,key) {
          var ya=f.y(high),yb=f.y(low);
          return '<g data-gap="'+key+'" data-energy-gap="'+(high-low)+'">'+D.line(bx,ya,bx,yb,'rv-bracket rv-energy')+
            D.line(bx-4,ya,bx+4,ya,'rv-bracket rv-energy')+D.line(bx-4,yb,bx+4,yb,'rv-bracket rv-energy')+
            mtext(bx+8,(ya+yb)/2,math,'rv-energy')+'</g>';
        }
        body+=bracket(0,.5,roman('½')+hw,'zero-point')+bracket(1.5,2.5,hw,'spacing');
        formula(slot,sym('E',null)+sub(vr('v')+sub(vr('k')))+roman(' = ')+hw+roman('(')+vk+roman(' + ½)'));
      }
      setSVG(canvas,w,h,body,i?t('同じ調和ポテンシャルV(Qk)。エネルギーはEvk=ℏωk(vk+1/2)。表示準位は0.5、1.5、2.5、3.5ℏωk。零点エネルギーは1/2ℏωk、間隔はℏωk。','The same harmonic potential V(Qk). Evk = hbar omega k (vk + 1/2). Shown levels are0.5,1.5,2.5,3.5 hbar omega k; zero-point energy is half a quantum and spacing one quantum.'):
        t('量子論側と同じ調和ポテンシャルV(Qk)、同じエネルギーと座標の尺度。側方の途切れない指標はE≥0の連続なエネルギーを表す。','The same harmonic potential V(Qk) and energy/coordinate scales as the quantum comparison. The separate continuous indicator starts at E=0 and continues upward.'));
    });
  }
  function drawLadder() {
    var host=document.getElementById('rv-ladder');
    var slots=comparison(host,'ladder',[t('ストークス','Stokes'),t('反ストークス','anti-Stokes')]);
    slots.forEach(function(slot,i){
      var canvas=slot.querySelector('.rv-svg-host'),w=svgWidth(canvas),h=220;
      var left=46,right=w-52,x=(left+right)/2,start=108,end=i?178:38,cls=i?'rv-as':'rv-s';
      var body=energyGuide(30,20,194,vr('E'));
      body+=D.line(left,start,right,start,'rv-level')+mtext(right+7,start,vk+(i?roman(' ≥ 1'):''),'','start');
      body+=D.line(left,end,right,end,'rv-level '+cls)+mtext(right+7,end,vk+roman(i?' − 1':' + 1'),cls);
      body+=D.arrow(x,start+(i?7:-7),x,end+(i?-8:8),cls,2.5);
      body+='<circle class="rv-initial" cx="'+x+'" cy="'+start+'" r="5"/>';
      body+='<circle class="'+cls+' rv-open" cx="'+x+'" cy="'+end+'" r="5"/>';
      body+=mtext(x+12,(start+end)/2,roman(i?'−':'+')+hw,cls);
      body='<g data-process="'+(i?'anti-Stokes':'Stokes')+'">'+body+'</g>';
      formula(slot,sym('F',i?'AS':'S',true)+roman('(')+vk+roman(') = ')+vk+roman(i?'':' + 1'));
      setSVG(canvas,w,h,body,t('同じ初期振動準位vk≥1。ストークスはvk+1へ上がり、反ストークスはvk−1へ下がる。振動の強度因子はそれぞれvk+1とvk。','The same initial vibrational level vk>=1. Stokes raises it to vk+1; anti-Stokes lowers it to vk-1. Their vibrational intensity factors are vk+1 and vk.'));
    });
  }
  function drawThermal() {
    var host=document.getElementById('rv-thermal'),control=document.getElementById('rv-temperature');
    var position=+control.value,theta=3*position*position,occ=occupation(theta);
    var temperatureLabel=position===0?t('低温極限','Low-temperature limit'):position<.4?t('低温','Low temperature'):position>.7?t('高温','High temperature'):t('中間の温度','Intermediate temperature');
    control.setAttribute('aria-valuetext',temperatureLabel);
    document.getElementById('rv-temperature-output').textContent=temperatureLabel;
    var slots=comparison(host,'thermal',[t('振動準位の占有','Level populations'),t('振動の強度因子','Vibrational intensity factors')]);
    slots.forEach(function(slot,i){
      var canvas=slot.querySelector('.rv-svg-host'),w=svgWidth(canvas),h=275,body='';
      var note=slot.querySelector('.rv-hint');if(note)note.remove();
      if(i) {
        var ordinate=sym('F̄',null)+roman('/')+sym('F̄','S',true);
        var f=frame(w,h,{xmin:0,xmax:1,ymin:0,ymax:1.05,xlabel:'',ylabel:'',xticks:[],yticks:[0,1],leftInset:62,rightInset:10,topInset:20,bottomInset:90,yTitleX:17},ordinate,roman(t('角振動数 ','Angular frequency '))+vr('ω'));
        body=f.body.replace(' y="'+(h-16)+'" text-anchor="middle" class="rp-x-title"',' y="'+(h-10)+'" text-anchor="middle" class="rp-x-title"');
        var sx=f.x(.19),mid=f.x(.5),ax=f.x(.81);
        body+=D.line(mid,f.top,mid,f.bottom,'rv-reference','stroke-dasharray="4 5"');
        body+=D.line(sx,f.y(0),sx,f.y(1),'rv-peak rv-s')+D.line(ax,f.y(0),ax,f.y(occ.ratio),'rv-peak rv-as');
        if(occ.ratio===0)body+='<circle class="rv-as" cx="'+ax+'" cy="'+f.bottom+'" r="3" data-zero-as="true"/>';
        body+=mtext(mid,f.bottom+20,wi,'','middle');
        body+=mtext(sx,f.bottom+20,wi+roman(' − ')+wk,'rv-s','middle')+mtext(ax,f.bottom+20,wi+roman(' + ')+wk,'rv-as','middle');
        body+=D.text(sx,f.bottom+53,t('ストークス','Stokes'),'class="rv-s" text-anchor="middle"')+D.text(ax,f.bottom+53,t('反ストークス','anti-Stokes'),'class="rv-as" text-anchor="middle"');
      } else {
        var left=46,right=w-50,base=246,scale=(base-28)/5.2,dotLeft=left+8,dotStep=Math.min(6,(right-left-24)/20);
        body=energyGuide(30,24,base,vr('E'))+D.line(30,base,right,base,'rv-reference','stroke-dasharray="3 4"')+D.text(22,base+4,'0','class="learn-panel-tick" text-anchor="end"');
        body+=mtext(left+4,14,roman('● ')+vr('p')+sub(vr('v')+sub(vr('k'))),'rv-neutral');
        body+=D.text((left+right)/2,37,'⋮','text-anchor="middle"');
        for(var v=0;v<=4;v++){
          var y=base-(v+.5)*scale,pv=occ.probabilities[v],dots=20*pv;
          body+='<g data-thermal-v="'+v+'" data-population="'+pv+'">'+D.line(left,y,right,y,v===0?'rv-level rv-energy':'rv-reference')+mtext(right+6,y,vk+roman(' = '+v),v===0?'rv-energy':'');
          for(var j=0;j<20;j++){var opacity=Math.max(0,Math.min(1,dots-j));body+='<circle class="rv-population" cx="'+(dotLeft+j*dotStep)+'" cy="'+y+'" r="2.4" opacity="'+opacity+'"/>';}
          body+='</g>';
          if(v>0){var alpha=Math.min(1,10*pv),ay=right-6;body+='<g data-downward-from="'+v+'" opacity="'+alpha+'">'+D.arrow(ay,y+7,ay,y+scale-7,'rv-as',2)+'</g>';}
        }
        body+=D.text(left,h-5,t('↓ 反ストークス','↓ anti-Stokes'),'class="rv-as"');
      }
      formula(slot,'');
      var desc=t('温度：','Temperature: ')+temperatureLabel+t('、平均振動量子数','; mean vibrational number')+'='+occ.mean.toFixed(6)+t('、放射因子を除きストークスを1とした反ストークス因子','; anti-Stokes factor with radiation removed and Stokes normalized to1')+'='+occ.ratio.toFixed(6)+t('。表示するv=0から4の占有は全分布の一部。','; shown v=0..4 populations are an excerpt of the full distribution.');
      setSVG(canvas,w,h,body,desc);
    });
    host.dataset.mean=occ.mean;host.dataset.ratio=occ.ratio;host.dataset.theta=theta;
  }
  function redraw() {drawWells();drawLadder();drawThermal();}
  var pending;
  function schedule(){cancelAnimationFrame(pending);pending=requestAnimationFrame(redraw);}
  Promise.all([import('/assets/learn-v2/js/raman/components/drawing.mjs'),import('/assets/learn-v2/js/raman/components/typography.mjs')]).then(function(modules){
    D=modules[0];Type=modules[1];
    document.getElementById('rv-temperature').addEventListener('input',drawThermal);
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
    if(window.ResizeObserver){
      var previous=new WeakMap(),ro=new ResizeObserver(function(entries){
        var changed=false;entries.forEach(function(entry){var w=entry.contentRect.width;if(previous.get(entry.target)!==w){previous.set(entry.target,w);changed=true;}});
        if(changed)schedule();
      });
      document.querySelectorAll('.rv-plot').forEach(function(e){ro.observe(e);});
    }else window.addEventListener('resize',schedule);
    redraw();
  });
})();
