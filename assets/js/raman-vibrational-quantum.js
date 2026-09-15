(function () {
  'use strict';
  // Temperature is expressed internally relative to the fixed vibrational energy.
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

  var red = '#aa4435', blue = '#276f96', gray = '#8b8476', grid = '#e2ded3', purple = '#725385';
  function lang() { return document.documentElement.getAttribute('data-lang') === 'ja'; }
  function tr(ja, en) { return lang() ? ja : en; }
  function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function text(x,y,label,cls,anchor) {
    return '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor || 'start')+'"'+(cls ? ' class="'+cls+'"' : '')+'>'+esc(label)+'</text>';
  }
  function line(x1,y1,x2,y2,color,width,dash) {
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(color||gray)+'" stroke-width="'+(width||1)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
  }
  function rect(x,y,w,h,fill) { return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" fill="'+fill+'"/>'; }
  function path(d,color,width,dash) { return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(width||2)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'; }
  function arrow(x1,y1,x2,y2,color,width) {
    var a = Math.atan2(y2-y1,x2-x1), d = 7;
    return line(x1,y1,x2,y2,color,width||2.5)+path('M'+(x2-d*Math.cos(a-.5))+','+(y2-d*Math.sin(a-.5))+'L'+x2+','+y2+'L'+(x2-d*Math.cos(a+.5))+','+(y2-d*Math.sin(a+.5)),color,width||2.5);
  }
  function put(host,w,h,body,label) {
    host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+'">'+body+'</svg>';
  }
  function width(host) { return Math.max(250, Math.round(host.getBoundingClientRect().width)); }
  function panels(host,height,draw,label,minWidth) {
    var w=width(host), stacked=w<(minWidth || 560), pw=stacked?w:(w-30)/2, h=stacked?height*2+20:height;
    var body=draw(0,pw)+ '<g transform="translate('+(stacked?0:pw+30)+','+(stacked?height+20:0)+')">'+draw(1,pw)+'</g>';
    put(host,w,h,body,label);
  }
  function spectrum(pw, ratio, title, height) {
    var left=34, right=pw-16, base=height-65, top=48, peak=base-top, sw=right-left;
    var sx=left+sw*.19, mid=left+sw*.5, ax=left+sw*.81;
    var b=text(0,16,title,'rv-panel-title')+text(left-4,36,tr('ωₛ⁴ 除外・Stokes = 1','ωₛ⁴ removed; Stokes = 1'));
    b+=line(left,top-7,left,base)+arrow(left,base,right+4,base,gray,1);
    b+=line(left,base-peak,right,base-peak,grid,1,'3 4')+text(left-7,base-peak+4,'1','','end')+text(left-7,base+4,'0','','end');
    b+=line(mid,top,mid,base,gray,1,'4 5')+text(mid,base+20,'ωᵢ','','middle');
    b+=line(sx,base,sx,base-peak,red,4)+line(ax,base,ax,base-peak*ratio,blue,4);
    if (ratio===0) b+='<circle cx="'+ax+'" cy="'+base+'" r="3" fill="'+blue+'"/>';
    b+=text(sx,base+20,'ωᵢ − ωₖ','rv-s','middle')+text(ax,base+20,'ωᵢ + ωₖ','rv-as','middle');
    b+=text(sx,base+39,'Stokes','rv-s','middle')+text(ax,base+39,'anti-Stokes','rv-as','middle');
    b+=text(right,height-3,tr('散乱光の角振動数 →','Scattered angular frequency →'),'','end');
    return b;
  }
  function drawWells() {
    var host=document.getElementById('rv-wells');
    panels(host,300,function(i,pw) {
      var axis=24, left=48, right=pw-66, cx=(left+right)/2, bottom=255, scale=48, qscale=(right-left)/5.9;
      var curve='';
      for(var k=0;k<=120;k++) {var q=-2.95+5.9*k/120;curve+=(k?'L':'M')+(cx+q*qscale)+','+(bottom-.5*q*q*scale);}
      var b=text(0,16,i?tr('量子論','Quantum'):tr('古典論','Classical'),'rv-panel-title');
      b+=text(axis,43,'E','','middle')+arrow(axis,bottom,axis,52,gray,1)+arrow(axis,bottom,pw-4,bottom,gray,1);
      b+=text(axis-9,bottom+4,'0','','end')+text(pw-4,bottom+20,'Qₖ','','end');
      if(!i) {
        b+='<defs><linearGradient id="rv-continuous-energy" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="'+purple+'" stop-opacity=".10"/><stop offset="1" stop-color="'+purple+'" stop-opacity=".35"/></linearGradient></defs>';
        b+='<path data-energy-region="continuous" d="'+curve+'Z" fill="url(#rv-continuous-energy)"/>';
        b+=text(cx,164,'E ≥ 0','rv-panel-title','middle');
        b+=text(cx,188,tr('連続的に選べる','Continuous'),'','middle');
      } else {
        for(var v=0;v<=3;v++) {
          var energy=v+.5, extent=Math.sqrt(2*energy)*qscale, y=bottom-energy*scale;
          b+='<g data-v="'+v+'" data-energy="'+energy+'">'+line(cx-extent,y,cx+extent,y,v===0?purple:gray,2)+text(cx,y-8,'vₖ = '+v,v===0?'rv-panel-title':'','middle')+'</g>';
        }
        var y0=bottom-.5*scale, end0=cx+qscale;
        b+=line(axis,y0,cx-qscale,y0,purple,1,'3 3')+text(axis-5,y0+4,'E₀','','end');
        var bracket=right+10;
        b+=line(end0+4,y0,bracket+4,y0,grid,1,'3 3');
        b+='<g data-gap="zero-point" data-energy-gap="0.5">'+line(bracket,y0,bracket,bottom,purple,1.5)+line(bracket-4,y0,bracket+4,y0,purple,1.5)+line(bracket-4,bottom,bracket+4,bottom,purple,1.5)+text(bracket+8,(y0+bottom)/2+4,'½ℏωₖ')+'</g>';
        var ya=bottom-1.5*scale,yb=bottom-2.5*scale;
        b+='<g data-gap="spacing" data-energy-gap="1">'+line(bracket,yb,bracket,ya,gray,1.5)+line(bracket-4,yb,bracket+4,yb,gray,1.5)+line(bracket-4,ya,bracket+4,ya,gray,1.5)+text(bracket+8,(ya+yb)/2+4,'ℏωₖ')+'</g>';
      }
      return b+path(curve,'#6a6050',1.5);
    },tr('古典論は連続的なエネルギー領域。量子論は離散準位。零点エネルギーはポテンシャルの底から基底準位までの高さ。','A continuous classical energy region and discrete quantum levels. Zero-point energy is measured from the potential minimum to the ground level.'),500);
  }
  function drawLadder() {
    var host=document.getElementById('rv-ladder');
    panels(host,310,function(i,pw) {
      var color=i?blue:red,cls=i?'rv-as':'rv-s',left=30,right=pw-59,x=left+(right-left)*.43;
      var startY=153,endY=i?223:83,direction=i?1:-1;
      var b=text(0,16,i?'anti-Stokes':'Stokes','rv-panel-title '+cls);
      b+=text(0,39,i?tr('分子 → 光へ ℏωₖ','Molecule → light: ℏωₖ'):tr('光 → 分子へ ℏωₖ','Light → molecule: ℏωₖ'),cls);
      b+=line(left,startY,right,startY,purple,2)+text(right+9,startY+4,'vₖ','rv-panel-title');
      b+=line(left,endY,right,endY,color,2)+text(right+9,endY+4,i?'vₖ − 1':'vₖ + 1',cls);
      b+=arrow(x,startY+7*direction,x,endY-8*direction,color,2.5);
      b+='<circle cx="'+x+'" cy="'+startY+'" r="5" fill="'+purple+'"/>';
      b+='<circle cx="'+x+'" cy="'+endY+'" r="5" fill="#faf9f5" stroke="'+color+'" stroke-width="2"/>';
      b+=text(x+13,(startY+endY)/2+4,i?'−ℏωₖ':'+ℏωₖ',cls);
      b+=text(0,269,tr('遷移の起こりやすさ','Transition likelihood'),cls);
      b+=text(0,292,i?'vₖ':'vₖ + 1','rv-panel-title '+cls);
      return '<g data-process="'+(i?'anti-Stokes':'Stokes')+'">'+b+'</g>';
    },tr('ストークスはvₖからvₖ+1、反ストークスはvₖからvₖ-1への遷移。','Stokes raises vₖ to vₖ+1; anti-Stokes lowers vₖ to vₖ-1.'),500);
  }
  function drawThermal() {
    var host=document.getElementById('rv-thermal'),control=document.getElementById('rv-temperature');
    var position=+control.value,theta=3*position*position,occ=occupation(theta);
    var temperatureLabel=position===0?tr('低温極限','Low-temperature limit'):position<.4?tr('低温','Low temperature'):position>.7?tr('高温','High temperature'):tr('中間の温度','Intermediate temperature');
    control.setAttribute('aria-valuetext',temperatureLabel);
    panels(host,365,function(i,pw) {
      if(i) return spectrum(pw,occ.ratio,tr('振動の強度比','Vibrational intensity ratio'),365);
      var left=34,right=pw-44,base=299,step=45,dotLeft=left+10,dotStep=Math.min(6,(right-left-24)/20);
      var b=text(0,16,tr('振動準位の占有','Vibrational level occupation'),'rv-panel-title');
      b+=text(0,43,'E')+arrow(13,base+5,13,60,gray,1);
      b+=text((left+right)/2,88,'⋮','','middle');
      for(var v=0;v<=4;v++) {
        var y=base-v*step,pv=occ.probabilities[v],dots=20*pv;
        b+='<g data-thermal-v="'+v+'" data-population="'+pv+'">';
        b+=line(left,y,right,y,v===0?purple:grid,v===0?1.5:1)+text(right+6,y+4,'vₖ = '+v,v===0?'rv-panel-title':'');
        for(var j=0;j<20;j++) {
          var opacity=Math.max(0,Math.min(1,dots-j));
          b+='<circle cx="'+(dotLeft+j*dotStep)+'" cy="'+y+'" r="2.4" fill="'+purple+'" opacity="'+opacity+'"/>';
        }
        b+='</g>';
        if(v>0) {
          var alpha=Math.min(1,10*pv),ax=right-6;
          b+='<g data-downward-from="'+v+'" opacity="'+alpha+'">'+arrow(ax,y+7,ax,y+step-7,blue,2)+'</g>';
        }
      }
      b+=text(left,335,tr('丸：準位の占有','Dots: level occupation'));
      b+=text(left,358,tr('青矢印：反ストークス遷移','Blue arrows: anti-Stokes'),'rv-as');
      return b;
    },tr('低温ほど励起振動準位の占有が減り、反ストークスが弱くなる。','Cooling reduces the occupation of excited vibrational levels and weakens anti-Stokes scattering.'),500);
    host.dataset.mean=occ.mean;host.dataset.ratio=occ.ratio;host.dataset.theta=theta;
  }
  function redraw() {drawWells();drawLadder();drawThermal();}
  document.getElementById('rv-temperature').addEventListener('input',drawThermal);
  var frame;
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(redraw);}
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  if(window.ResizeObserver) {var ro=new ResizeObserver(schedule);document.querySelectorAll('.rv-plot').forEach(function(e){ro.observe(e);});}
  else window.addEventListener('resize',schedule);
  redraw();
})();
